import { execFile } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, normalize, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { PUBLISH_BRANCH, PUBLISH_RETRY_LIMIT } from '../../src/lib/photo-pipeline.ts';

const execFileAsync = promisify(execFile);

export const FORBIDDEN_GIT_ARGS = Object.freeze([
  'rebase',
  '--rebase',
  '--force',
  '-f',
  '--force-with-lease',
  '--force-if-includes',
  '--mirror',
  '-A',
  '--all',
  '-a',
  'clean',
  'filter-branch',
]);

export const ALLOWED_GIT_SUBCOMMANDS = Object.freeze([
  'rev-parse',
  'remote',
  'add',
  'commit',
  'push',
  'fetch',
  'reset',
]);

export const ALLOWED_GIT_CONFIG_KEYS = Object.freeze(['user.name', 'user.email']);

export class PublishError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'PublishError';
  }
}

export class PublishInputError extends PublishError {
  constructor(message) {
    super(message);
    this.name = 'PublishInputError';
  }
}

export class PublishGitError extends PublishError {
  constructor(message, { argv, code, stderr } = {}) {
    super(message);
    this.name = 'PublishGitError';
    this.argv = argv;
    this.code = code;
    this.stderr = stderr;
  }
}

export class PublishConflictError extends PublishError {
  constructor({ branch, remoteHead, attempts }) {
    super(
      `publish conflict: branch "${branch}" moved under the pipeline on all ${attempts} attempt(s); ` +
        `remote head is now ${remoteHead}. The pipeline pushed nothing.`
    );
    this.name = 'PublishConflictError';
    this.branch = branch;
    this.remoteHead = remoteHead;
    this.attempts = attempts;
  }
}

/**
 * Install a WITNESS over every git invocation this module makes. It is handed a frozen
 * `{ argv, cwd }` before the process is spawned and its return value is ignored.
 *
 * It cannot REPLACE the runner, and that is the whole point. A test that injects a substitute
 * runner proves a prohibition about a runner that never ran — which is the vacuous shape this
 * project's register already records nine times. `observeGit` can only watch the real `execFile`
 * calls the real code path makes.
 *
 * A throwing observer aborts the invocation it was called for, which is what makes case 0 a live
 * guard across every case in the file rather than one assertion at the end.
 *
 * @param {(call: { argv: readonly string[], cwd: string }) => void} observer
 * @returns {() => void} dispose
 */
export function observeGit(observer) {
  if (typeof observer !== 'function') {
    throw new TypeError('observeGit(observer): observer must be a function');
  }
  const previous = gitObserver;
  gitObserver = observer;
  return () => {
    gitObserver = previous;
  };
}

let gitObserver = null;

export function redactRemotes(text) {
  return String(text ?? '')
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S*/gi, '<remote-redacted>')
    .replace(/\b[\w.-]+@[\w.-]+:\S*/g, '<remote-redacted>');
}

function gitEnv() {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    LC_ALL: 'C',
    LANG: 'C',
  };
}

async function runGit(argv, cwd) {
  if (gitObserver) {
    gitObserver(Object.freeze({ argv: Object.freeze([...argv]), cwd }));
  }
  try {
    const { stdout, stderr } = await execFileAsync('git', argv, {
      cwd,
      env: gitEnv(),
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true, code: 0, stdout: stdout ?? '', stderr: stderr ?? '' };
  } catch (error) {
    return {
      ok: false,
      code: typeof error?.code === 'number' ? error.code : 1,
      stdout: error?.stdout ?? '',
      stderr: error?.stderr ? String(error.stderr) : String(error?.message ?? ''),
      argv,
    };
  }
}

async function gitOrThrow(argv, cwd, what) {
  const result = await runGit(argv, cwd);
  if (!result.ok) {
    throw new PublishGitError(
      `${what} failed (git exit ${result.code}): ${redactRemotes(result.stderr).trim()}`,
      {
        argv,
        code: result.code,
        stderr: redactRemotes(result.stderr),
      }
    );
  }
  return result;
}

const AUTH_PATTERNS = [
  /authentication failed/i,
  /could not read (username|password)/i,
  /terminal prompts disabled/i,
  /invalid username or password/i,
  /permission denied/i,
  /access rights/i,
  /repository not found/i,
  /\bhttp (401|403)\b/i,
  /support for password authentication was removed/i,
];

const CONFLICT_REASONS = /non-fast-forward|fetch first|stale info/i;

export function classifyPushFailure(stderr) {
  const text = String(stderr ?? '');
  for (const pattern of AUTH_PATTERNS) {
    if (pattern.test(text)) return 'auth';
  }
  if (/updates were rejected because/i.test(text)) return 'conflict';
  if (/!\s*\[rejected\]/i.test(text) && CONFLICT_REASONS.test(text)) return 'conflict';
  return 'other';
}

export function endsWithExactlyOneNewline(content) {
  return typeof content === 'string' && content.endsWith('\n') && !content.endsWith('\n\n');
}

function assertWriterContract(content, { filePath, where }) {
  if (typeof content !== 'string') {
    throw new PublishInputError(
      `${where}: expected serialiseManifest to return a string for "${filePath}", got ${typeof content}`
    );
  }
  if (!endsWithExactlyOneNewline(content)) {
    const tail = JSON.stringify(content.slice(-8));
    throw new PublishInputError(
      `${where}: content for "${filePath}" must end in exactly one "\\n" — serialiseManifest is the ` +
        `only writer of manifest bytes and it emits one. Got tail ${tail}. Publishing it would ` +
        `reintroduce the one-line closing-bracket diff 03-01 removed.`
    );
  }
}

function resolveInside(repoDir, filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new PublishInputError('publishManifest: filePath is required');
  }
  if (isAbsolute(filePath)) {
    throw new PublishInputError(
      `publishManifest: filePath must be repo-relative, got "${filePath}"`
    );
  }
  const root = resolve(repoDir);
  const absolute = resolve(root, normalize(filePath));
  if (absolute !== root && !absolute.startsWith(root + sep)) {
    throw new PublishInputError(
      `publishManifest: filePath "${filePath}" resolves outside the repository`
    );
  }
  return absolute;
}

function log(line) {
  process.stdout.write(`[git-publish] ${line}\n`);
}

async function headSha(repoDir, ref = 'HEAD') {
  const { stdout } = await gitOrThrow(['rev-parse', ref], repoDir, `rev-parse ${ref}`);
  return stdout.trim();
}

/**
 * Commit `filePath` and push it to `branch`, re-deriving and retrying on a non-fast-forward
 * rejection, bounded at `retryLimit`.
 *
 * @param {object} options
 * @param {string} options.repoDir            a real checkout with an `origin` remote
 * @param {string} [options.branch]           defaults to PUBLISH_BRANCH ('main')
 * @param {string} options.filePath           repo-relative, the ONLY path staged
 * @param {string} options.message            commit message
 * @param {(fetchedContent: string) => string | Promise<string>} options.rederive
 *        called once per retry with the file's content AS FETCHED; returns the new bytes verbatim
 * @param {number} [options.retryLimit]       defaults to PUBLISH_RETRY_LIMIT (3)
 * @param {string} options.committerName
 * @param {string} options.committerEmail
 * @returns {Promise<{ attempts: number, commit: string, branch: string, changed: boolean }>}
 */
export async function publishManifest({
  repoDir,
  branch = PUBLISH_BRANCH,
  filePath,
  message,
  rederive,
  retryLimit = PUBLISH_RETRY_LIMIT,
  committerName,
  committerEmail,
}) {
  if (typeof repoDir !== 'string' || repoDir.length === 0) {
    throw new PublishInputError('publishManifest: repoDir is required');
  }
  if (!existsSync(repoDir) || !statSync(repoDir).isDirectory()) {
    throw new PublishInputError(`publishManifest: repoDir "${repoDir}" is not a directory`);
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new PublishInputError('publishManifest: message is required');
  }
  if (typeof rederive !== 'function') {
    throw new PublishInputError('publishManifest: rederive must be a function');
  }
  if (!Number.isInteger(retryLimit) || retryLimit < 1) {
    throw new PublishInputError(
      `publishManifest: retryLimit must be a positive integer, got ${retryLimit}`
    );
  }
  if (typeof branch !== 'string' || branch.length === 0 || branch.startsWith('-')) {
    throw new PublishInputError(`publishManifest: branch "${branch}" is not a usable ref name`);
  }
  for (const [name, value] of [
    ['committerName', committerName],
    ['committerEmail', committerEmail],
  ]) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new PublishInputError(
        `publishManifest: ${name} is required — the committing identity is passed in by the ` +
          `workflow, never taken from the runner's global config`
      );
    }
  }

  const absoluteFile = resolveInside(repoDir, filePath);

  const inside = await runGit(['rev-parse', '--is-inside-work-tree'], repoDir);
  if (!inside.ok || inside.stdout.trim() !== 'true') {
    throw new PublishInputError(`publishManifest: "${repoDir}" is not a git work tree`);
  }

  if (!existsSync(absoluteFile)) {
    throw new PublishInputError(
      `publishManifest: "${filePath}" does not exist in ${repoDir} — there is nothing to publish. ` +
        `No attempt was made.`
    );
  }

  // `git remote` lists NAMES. `git remote get-url` is deliberately not called: on the runner the
  // origin URL carries a token (T-04-25).
  const remotes = await gitOrThrow(['remote'], repoDir, 'listing remotes');
  const remoteNames = remotes.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!remoteNames.includes('origin')) {
    throw new PublishInputError(
      `publishManifest: no remote named "origin" in ${repoDir} (remotes: ${
        remoteNames.length > 0 ? remoteNames.join(', ') : 'none'
      }) — there is nowhere to publish to. No attempt was made.`
    );
  }

  const identity = ['-c', `user.name=${committerName}`, '-c', `user.email=${committerEmail}`];

  let attempts = 0;

  while (attempts < retryLimit) {
    attempts += 1;

    assertWriterContract(readFileSync(absoluteFile, 'utf8'), {
      filePath,
      where:
        attempts === 1
          ? 'publishManifest (initial content)'
          : `publishManifest (retry ${attempts})`,
    });

    // Stage EXACTLY one path. Never `git add -A` (T-04-23): a runner working tree holds build
    // output, a symlinked node_modules and a downloaded staging object, and a pipeline that
    // commits whatever it finds is a supply-chain surface, not a convenience. The pathspec is
    // repeated on `commit` so a pre-existing index entry cannot ride along either.
    await gitOrThrow(['add', '--', filePath], repoDir, `staging ${filePath}`);

    const committed = await runGit([...identity, 'commit', '-m', message, '--', filePath], repoDir);

    if (!committed.ok) {
      const text = `${committed.stdout}\n${committed.stderr}`;
      if (/nothing to commit|no changes added to commit|nothing added to commit/i.test(text)) {
        const head = await headSha(repoDir);
        log(
          `attempt ${attempts}/${retryLimit} branch=${branch} nothing to commit — already published at ${head}`
        );
        return { attempts, commit: head, branch, changed: false };
      }
      throw new PublishGitError(
        `committing ${filePath} failed (git exit ${committed.code}): ${redactRemotes(text).trim()}`,
        { argv: ['commit'], code: committed.code, stderr: redactRemotes(committed.stderr) }
      );
    }

    const commit = await headSha(repoDir);

    // `HEAD:refs/heads/<branch>` is explicit rather than relying on the clone's tracking config,
    // and it is a plain fast-forward push: the remote's own refusal to move a ref non-fast-forward
    // is the guard this module leans on (T-04-22).
    const pushed = await runGit(['push', 'origin', `HEAD:refs/heads/${branch}`], repoDir);

    if (pushed.ok) {
      log(`attempt ${attempts}/${retryLimit} branch=${branch} commit=${commit} pushed`);
      return { attempts, commit, branch, changed: true };
    }

    const kind = classifyPushFailure(`${pushed.stdout}\n${pushed.stderr}`);

    if (kind !== 'conflict') {
      log(
        `attempt ${attempts}/${retryLimit} branch=${branch} commit=${commit} failed (${kind}) — not retrying`
      );
      throw new PublishGitError(
        `push to "${branch}" failed and this is NOT a conflict (${kind}); the pipeline is not ` +
          `retrying, because retrying a credential failure hides it. git exit ${pushed.code}: ` +
          redactRemotes(pushed.stderr).trim(),
        { argv: ['push'], code: pushed.code, stderr: redactRemotes(pushed.stderr) }
      );
    }

    // A real conflict. Find out what actually won.
    await gitOrThrow(['fetch', 'origin', branch], repoDir, `fetching origin/${branch}`);
    const remoteHead = await headSha(repoDir, 'FETCH_HEAD');

    log(
      `attempt ${attempts}/${retryLimit} branch=${branch} commit=${commit} rejected ` +
        `(non-fast-forward) — remote head ${remoteHead}`
    );

    if (attempts >= retryLimit) {
      throw new PublishConflictError({ branch, remoteHead, attempts });
    }

    // Discard our own commit and take the fetched tip. NOT a rebase: nothing is replayed, because
    // the content is about to be recomputed against what won (P-5).
    await gitOrThrow(['reset', '--hard', remoteHead], repoDir, `resetting to ${remoteHead}`);

    // Read the file FROM THE FETCHED STATE. Handing `rederive` the stale content would make the
    // whole retry theatre: the ranks would be recomputed against maxima that no longer exist.
    if (!existsSync(absoluteFile)) {
      throw new PublishInputError(
        `publishManifest: "${filePath}" is absent at the fetched tip ${remoteHead} — refusing to ` +
          `re-derive against a file that no longer exists`
      );
    }
    const fetchedContent = readFileSync(absoluteFile, 'utf8');

    // A throw from `rederive` (a validation failure, e.g. the gate rejecting the re-derived
    // record) aborts the loop HERE. It does not consume the budget and nothing is pushed.
    const nextContent = await rederive(fetchedContent);

    assertWriterContract(nextContent, {
      filePath,
      where: `publishManifest (rederive, attempt ${attempts + 1})`,
    });

    // Written VERBATIM. This module re-serialises nothing, so the bytes serialiseManifest produced
    // are the bytes that get committed.
    writeFileSync(absoluteFile, nextContent);
  }

  /* c8 ignore next 3 */
  throw new PublishConflictError({ branch, remoteHead: 'unknown', attempts });
}

export { PUBLISH_BRANCH, PUBLISH_RETRY_LIMIT };
