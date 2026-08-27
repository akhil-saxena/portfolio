/**
 * PIPE-05, the pipeline's half — commit a manifest to `main` and push it, safely, while a human
 * may be pushing to the same file.
 *
 * Usage (from the Actions runner, via 04-09's `scripts/process-photo.mjs`):
 *
 *     import { publishManifest, PublishConflictError } from './lib/git-publish.mjs';
 *     const result = await publishManifest({
 *       repoDir: process.cwd(),
 *       filePath: 'data/portfolio_images.json',
 *       message: `photo: publish ${id}`,
 *       committerName: process.env.GIT_AUTHOR_NAME,
 *       committerEmail: process.env.GIT_AUTHOR_EMAIL,
 *       rederive: (fetchedContent) => serialiseManifest(upsertRecord(JSON.parse(fetchedContent), record)),
 *     });
 *
 * ---------------------------------------------------------------------------------------------
 * WHY RE-DERIVE AND NOT REBASE  (pitfall P-5, `04-RESEARCH.md` §13)
 *
 * The unit of contention is one JSON array in one file, and every record in it carries a rank:
 * `order` across the whole gallery and `categoryOrder` within its category. Both are derived from
 * the maxima present in the manifest at the moment the record is built.
 *
 * So imagine two writers reading a 39-record manifest at the same moment. Both compute
 * `order: 40`. The first push lands. The second is rejected, and now there are exactly two ways to
 * recover:
 *
 *   - `git rebase` replays the second writer's DIFF onto the new tip. That diff says "insert a
 *     record whose order is 40". Textually it may well apply — appending to the end of an array is
 *     about as mergeable as JSON gets — and the result is a manifest with TWO records claiming
 *     rank 40. RI-5 fires on the next `astro sync`, or worse, does not, and the gallery quietly
 *     has an ambiguous sort. **A rebase resolves `order` incorrectly even when it succeeds.**
 *
 *   - Re-derive throws the second writer's commit away and RECOMPUTES the record against the
 *     manifest that actually won. `order` becomes 41 because the maxima moved. Nothing collides,
 *     because nothing was replayed.
 *
 * This module therefore never rebases. On a rejection it fetches, resets the local branch to the
 * fetched tip (discarding its own commit — the content is about to be recomputed, so there is
 * nothing in it worth preserving), re-reads the file **from the fetched state**, and hands that
 * content to the caller's `rederive` callback. What comes back is committed and pushed afresh.
 *
 * The reset is to the tip we just fetched, on a branch this module is publishing to, and it is the
 * one destructive git operation here. It is NOT a force-push and it is NOT a rebase: the remote's
 * own fast-forward check remains the guard on every push (T-04-22), and the prohibition on
 * `rebase`, `--force`, `--force-with-lease`, `-A` and `--all` is asserted at the ARGV level by
 * `test/pipeline/concurrent-push.node.test.ts` case 0 — see `observeGit` below.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE RETRY IS BOUNDED  (T-04-26)
 *
 * `main` is the branch the live site ships from and the branch a human edits. An unbounded retry
 * against a branch someone is actively pushing to is a job that never ends and a runner minute
 * that never returns. `PUBLISH_RETRY_LIMIT` (3, from `src/lib/photo-pipeline.ts` under OD-7 A)
 * bounds it, and exhaustion throws `PublishConflictError` naming the branch, the remote head and
 * the number of attempts made.
 *
 * Criterion 4 says one side "retries or reports a conflict". A silent give-up is neither, which is
 * why exhaustion throws rather than returning a falsy result: the legacy failure this whole plan
 * exists to not repeat was a guard that was present in the route and disabled at the call site
 * (`DeployButton.tsx:86` sent `baseSha: "latest"`), i.e. a conflict check that reported nothing.
 *
 * The pipeline is also serialised against ITSELF by `concurrency: { cancel-in-progress: false }`
 * in the workflow (04-08), so this loop contends only with humans.
 *
 * ---------------------------------------------------------------------------------------------
 * A CREDENTIAL FAILURE IS NOT A CONFLICT  (T-04-27)
 *
 * Only a genuine non-fast-forward rejection enters the retry path. An authentication failure, a
 * missing remote, a repository that does not exist — each fails the job on the spot. Retrying a
 * bad credential three times converts a clear "your token is wrong" into a vague "publish
 * conflict after 3 attempts", and `CLAUDE.md`'s rule is that a missing configuration denies rather
 * than degrades. Auth patterns are matched BEFORE conflict patterns so the classification cannot
 * fall the other way, and `GIT_TERMINAL_PROMPT=0` means a missing credential fails immediately
 * instead of blocking on a prompt no runner will ever answer.
 *
 * `LC_ALL=C` is set on every invocation because git translates its porcelain messages, and this
 * module classifies failures by reading them. A runner with a non-English locale would otherwise
 * misclassify every rejection.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IS NEVER LOGGED  (T-04-25)
 *
 * The remote URL. On the Actions runner `origin` carries a token in its URL, so this module never
 * asks for it (`git remote` lists NAMES; `git remote get-url` is not called anywhere) and
 * `redactRemotes()` scrubs any URL git puts in its own stderr before it reaches an error message.
 * Attempt logs name the branch and the SHA only — the pattern the legacy routes already followed.
 *
 * ---------------------------------------------------------------------------------------------
 * SHELL AND ARGV  (T-04-24)
 *
 * Every git invocation goes through `execFile` with an argv ARRAY. No shell, ever. A branch name
 * or a file path interpolated into a shell string is a command-injection surface with no upside,
 * and the module's callers get both from workflow inputs.
 *
 * ---------------------------------------------------------------------------------------------
 * THE TRAILING NEWLINE  (03-01's defect, guarded here on the retry path)
 *
 * `serialiseManifest` (04-05) is the ONE writer of manifest bytes: it emits
 * `JSON.stringify(manifest, null, 2)` plus exactly one `\n`, byte-identical to the committed file.
 * This module re-serialises nothing — whatever `rederive` returns is written verbatim and
 * committed verbatim, so the bytes `serialiseManifest` produced are the bytes that land.
 *
 * To make that a guarantee rather than an accident it is checked at the publish boundary: content
 * that does not end in exactly one `\n` is refused, naming `serialiseManifest`, before anything is
 * staged. A retry is the path least likely to be exercised by hand, and a retry that dropped the
 * newline would reintroduce the one-line-diff-on-the-closing-bracket defect 03-01 fixed.
 *
 * ---------------------------------------------------------------------------------------------
 * THIS MODULE VALIDATES BYTES, NEVER SEMANTICS — AND THAT IS LOAD-BEARING
 *
 * Measured by `test/pipeline/concurrent-push.node.test.ts` case 5: a `rederive` that returns the
 * STALE manifest unchanged — two records claiming the same `order` — is committed and pushed. This
 * module does not parse the JSON, does not know what `order` is, and has no opinion about RI-5.
 *
 * So the layer that catches a bad re-derive is the `rederive` callback ITSELF. A callback that
 * throws aborts the loop on the spot: the budget is not consumed and nothing is pushed. That is
 * why 04-09 step 9 re-runs `astro sync` INSIDE the retry loop rather than only before it — the
 * re-derived record carries different ranks and is therefore a different record, so a validation
 * that ran only before the first attempt has not seen the thing that actually gets published.
 */

import { execFile } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, normalize, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { PUBLISH_BRANCH, PUBLISH_RETRY_LIMIT } from '../../src/lib/photo-pipeline.ts';

const execFileAsync = promisify(execFile);

/** Tokens this module is forbidden to pass to git, ever. Asserted at argv level by case 0. */
export const FORBIDDEN_GIT_ARGS = Object.freeze([
  'rebase',
  '--force',
  '--force-with-lease',
  '-A',
  '--all',
]);

/** Base class, so a caller can catch everything this module throws with one `instanceof`. */
export class PublishError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'PublishError';
  }
}

/**
 * The caller asked for something impossible: no such file, no `origin`, no `rederive`. Thrown
 * before any attempt is made, so it never consumes the retry budget (`attempts: 0`).
 */
export class PublishInputError extends PublishError {
  constructor(message) {
    super(message);
    this.name = 'PublishInputError';
  }
}

/** git itself failed for a reason that is not a conflict — auth, a bad ref, a broken repo. */
export class PublishGitError extends PublishError {
  constructor(message, { argv, code, stderr } = {}) {
    super(message);
    this.name = 'PublishGitError';
    this.argv = argv;
    this.code = code;
    this.stderr = stderr;
  }
}

/** The retry budget ran out. Names the branch, the remote head and the attempts made. */
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

/** Scrub anything URL-shaped out of text that came from git, in case it carries a credential. */
export function redactRemotes(text) {
  return String(text ?? '')
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S*/gi, '<remote-redacted>')
    .replace(/\b[\w.-]+@[\w.-]+:\S*/g, '<remote-redacted>');
}

function gitEnv() {
  return {
    ...process.env,
    // A missing credential must fail, not hang waiting for a prompt no runner will answer.
    GIT_TERMINAL_PROMPT: '0',
    // This module classifies failures by reading git's own messages, and git translates them.
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

// Matched FIRST. An auth failure and a conflict must not share a code path (T-04-27).
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

// A conflict is a rejection whose REASON is the remote having moved. `! [rejected]` on its own is
// not enough: git also says it for "refusing to update checked out branch" and for tag clobbering,
// neither of which a re-derive can fix.
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

/** Ends with a `\n`, and not with two. The 03-01 discipline, checked at the publish boundary. */
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
  // `console.log` and `console.info` are SWALLOWED by this repository's vitest setup (measured:
  // 0 occurrences vs 1 for `process.stdout.write`). A publish log nobody can read is a publish
  // that looks like it did nothing.
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
  // ---- Preconditions. None of these consume the retry budget: they throw at attempts 0. ----
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
