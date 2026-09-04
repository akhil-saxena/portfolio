/**
 * PIPE-05 / criterion 4 — a pipeline commit and a concurrent manual edit to the same file cannot
 * clobber each other.
 *
 * NO MOCKS. This file builds a real git topology in a temp directory — one **bare** repository as
 * `origin`, a `pipelineClone` and a `humanClone` — and runs `publishManifest` against it. The
 * rejection under test is the real remote's real fast-forward refusal, not a simulated one, and
 * the "concurrent manual edit" is a real `git push` from the human's clone. That is the whole
 * argument for the file living in the `integration` project: 04-09 will prove the composed
 * pipeline against fakes, so THIS is where the real git behaviour gets established.
 *
 * ---------------------------------------------------------------------------------------------
 * TWO HAZARDS FROM THIS PROJECT'S REGISTER, WRITTEN HERE SO NOBODY REINTRODUCES THEM
 *
 *  1. **Never `git show HEAD~1:<file>` as an evidence revision.** Two Phase 3 plans specified it
 *     and both were broken: `HEAD~1` is the previous COMMIT, which is only the previous revision
 *     OF THAT FILE when nothing else was committed in between. Phase 4 adds a THIRD commit writer
 *     to `main` (the pipeline), so it is strictly worse here. Where this file needs a before-state
 *     it calls `previousRevisionOf()`, which searches the file's own log
 *     (`git log --format=%H <tip> -- <file>`) and THROWS when it finds no predecessor, naming how
 *     many revisions it searched.
 *
 *  2. **A worktree copied without `.git` fabricates failures.** Four tests in this repository walk
 *     `git log`; a `cp -r` sandbox makes them fail for a reason that has nothing to do with the
 *     code. This file is NOT exposed, because it creates its repositories with `git init` and
 *     populates them with `git clone --no-hardlinks` — there is no copied worktree anywhere in it.
 *     Do not "simplify" any of this into a `cp -r`.
 *
 * A third, local one: `console.log` and `console.info` are SWALLOWED by this repository's vitest
 * setup (measured: 0 occurrences against 1 for `process.stdout.write`). Every diagnostic below —
 * and case 0's naming of an offending argv in particular — uses `process.stdout.write`, because a
 * gate that reports its findings through a swallowed channel is indistinguishable from a gate that
 * found nothing.
 *
 * Every temp repository gets an explicit `user.name`/`user.email`, `commit.gpgsign=false` and an
 * empty `core.hooksPath`: a developer machine with a global identity, a signing key or a hook
 * template would otherwise fail `git commit` for a reason unrelated to anything under test.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ALLOWED_GIT_CONFIG_KEYS,
  ALLOWED_GIT_SUBCOMMANDS,
  FORBIDDEN_GIT_ARGS,
  observeGit,
  PUBLISH_BRANCH,
  PUBLISH_RETRY_LIMIT,
  PublishConflictError,
  PublishInputError,
  publishManifest,
} from '../../scripts/lib/git-publish.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = 'data/portfolio_images.json';
const COMMITTER = { name: 'Photo Pipeline', email: 'pipeline@akhilsaxena.invalid' };
const HUMAN = { name: 'Akhil Saxena', email: 'human@akhilsaxena.invalid' };

type Record_ = {
  id: string;
  title: string;
  category: string;
  order: number;
  categoryOrder: number;
};
type ManifestWriter = (manifest: unknown) => string;

/* ============================================================================================ *
 * git helpers — argv arrays only, never a shell string
 * ============================================================================================ */

const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C', LANG: 'C' };

function git(cwd: string, argv: readonly string[]): string {
  return execFileSync('git', [...argv], { cwd, encoding: 'utf8', env: GIT_ENV }).trim();
}

/**
 * Raw bytes, as a `Uint8Array` rather than a `Buffer`. Deliberate: this repository's ambient type
 * environment (workers types alongside @types/node) resolves the global `Buffer` to a shape
 * without `.equals()` or a one-argument `.toString(encoding)`, so `astro check` rejects both.
 * `Uint8Array` + `TextDecoder` is the portable spelling and costs nothing here.
 */
function gitBytes(cwd: string, argv: readonly string[]): Uint8Array {
  return Uint8Array.from(
    execFileSync('git', [...argv], { cwd, env: GIT_ENV, maxBuffer: 32 * 1024 * 1024 })
  );
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

function gitExit(cwd: string, argv: readonly string[]): number {
  try {
    execFileSync('git', [...argv], { cwd, env: GIT_ENV, stdio: 'ignore' });
    return 0;
  } catch (error) {
    const code = (error as { status?: number }).status;
    return typeof code === 'number' ? code : 1;
  }
}

/**
 * The before-state helper. Searches the FILE's own log, never `HEAD~1`, and throws — naming how
 * many revisions it searched — rather than returning something that only looks like a predecessor.
 */
function previousRevisionOf(repoDir: string, tip: string, filePath: string): string {
  const revisions = git(repoDir, ['log', '--format=%H', tip, '--', filePath])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (revisions.length < 2) {
    throw new Error(
      `previousRevisionOf(${filePath}) found no predecessor: searched ${revisions.length} ` +
        `revision(s) of that path reachable from ${tip}. Refusing to invent a before-state ` +
        `(this is the "git show HEAD~1:<file>" trap, written up in this file's header).`
    );
  }
  return revisions[1] as string;
}

function committedBytes(repoDir: string, sha: string, filePath: string): Uint8Array {
  return gitBytes(repoDir, ['cat-file', 'blob', `${sha}:${filePath}`]);
}

function committedText(repoDir: string, sha: string, filePath: string): string {
  return decode(committedBytes(repoDir, sha, filePath));
}

function configureRepo(dir: string, who: { name: string; email: string }, hooksDir: string): void {
  git(dir, ['config', 'user.name', who.name]);
  git(dir, ['config', 'user.email', who.email]);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'core.hooksPath', hooksDir]);
}

/* ============================================================================================ *
 * The manifest writer.
 *
 * Case 0b requires the committed blob to be the bytes `serialiseManifest` produced — NOT bytes
 * this file re-serialised for itself, which would let the test agree with itself while the real
 * writer drifted. `serialiseManifest` lives in `scripts/lib/photo-record.mjs` (plan 04-05, which
 * runs in the same wave as this one). If it has landed we use it. If it has not, we use a
 * stand-in — and either way the writer is held to `serialiseManifest`'s own defining property,
 * asserted in `beforeAll` against the REAL committed manifest: it must reproduce
 * `data/portfolio_images.json` byte-for-byte. A stand-in that drifts from the real writer cannot
 * satisfy that, so the fallback is not a hole. Which writer ran is printed, not inferred.
 * ============================================================================================ */

const PRODUCER = join(REPO_ROOT, 'scripts', 'lib', 'photo-record.mjs');
let serialise: ManifestWriter = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;
let writerName = 'uninitialised';

/* ============================================================================================ *
 * Case 0 — THE PROHIBITION, installed as a LIVE guard before any case runs.
 * ============================================================================================ */

type GitCall = { argv: readonly string[]; cwd: string };

const observed: GitCall[] = [];
let extraHook: ((call: GitCall) => void) | null = null;
const hookErrors: string[] = [];

function forbiddenTokensIn(argv: readonly string[]): string[] {
  const banned = FORBIDDEN_GIT_ARGS as readonly string[];
  return argv.filter((token) => banned.includes(token));
}

/** `git [-c k=v]... <subcommand> <rest...>` — the leading `-c` pairs are git-global options. */
function splitGitArgv(argv: readonly string[]): {
  configs: string[];
  subcommand: string;
  rest: string[];
} {
  const configs: string[] = [];
  let index = 0;
  while (argv[index] === '-c') {
    configs.push(argv[index + 1] ?? '');
    index += 2;
  }
  return { configs, subcommand: argv[index] ?? '', rest: [...argv.slice(index + 1)] };
}

/**
 * Every way this module could clobber someone else's work, expressed as a claim about ONE git
 * invocation. Returns a list of findings so the failure message can name all of them.
 *
 * The token half and the structural half exist for different reasons, and the walk-through step is
 * why both are here rather than only the first:
 *
 *   MEASURED, before this function was hardened — a module patched to run
 *   `git push -f origin HEAD:refs/heads/main`, and one patched to run
 *   `git push origin +HEAD:refs/heads/main`, BOTH passed a token-only guard carrying
 *   `rebase --force --force-with-lease -A --all`. Case 1 (the clean push) went GREEN in both runs
 *   while the module was force-pushing. The clobber was caught only downstream, by case 2 noticing
 *   the human's commit had gone — that is, by a consequence rather than by the operation. A control
 *   that can see only the consequence is not the control criterion 4 asked for.
 *
 * So `-f`, `--force-if-includes`, `--mirror` and `-a` joined the token list in the module, and the
 * four structural checks below joined it here.
 */
function violationsIn(call: GitCall): string[] {
  const findings: string[] = [];
  const { configs, subcommand, rest } = splitGitArgv(call.argv);

  for (const token of forbiddenTokensIn(call.argv)) {
    findings.push(`banned token "${token}"`);
  }

  // A `-c` this module did not intend is alias/refspec injection: `-c remote.origin.push=+HEAD:main`
  // force-pushes with no flag and no `+` visible on the push command line at all.
  for (const config of configs) {
    const key = config.split('=', 1)[0] ?? '';
    if (!(ALLOWED_GIT_CONFIG_KEYS as readonly string[]).includes(key)) {
      findings.push(`config injection "-c ${config}"`);
    }
  }

  if (!(ALLOWED_GIT_SUBCOMMANDS as readonly string[]).includes(subcommand)) {
    findings.push(`subcommand "${subcommand}" is outside this module's vocabulary`);
  }

  // The classic force-push with no flag at all: a `+` prefix on the refspec.
  if (subcommand === 'push') {
    for (const token of rest) {
      if (token.startsWith('+')) findings.push(`force refspec "${token}"`);
    }
  }

  // T-04-23. `git add .` and `git add :/` stage a whole runner working tree without ever writing
  // `-A`, so the SHAPE is checked and not just the flags: exactly `add -- <one path>`.
  if (subcommand === 'add') {
    const path = rest[1] ?? '';
    const shapeIsExact = rest.length === 2 && rest[0] === '--';
    if (!shapeIsExact || path === '' || path === '.' || path === ':/' || path.startsWith('-')) {
      findings.push(`git add must be exactly "add -- <one path>", got "${rest.join(' ')}"`);
    }
  }

  return findings;
}

/**
 * The control. It runs on EVERY git invocation the module makes, in every case in this file,
 * because it is installed as the observer for the whole file and the per-case hooks below are
 * layered on top of it rather than replacing it.
 *
 * Why argv and not a source grep: this module is required to call git through `execFile` with an
 * argv ARRAY, so its source reads `['reset', '--hard', ref]` and never the string `reset --hard` —
 * the grep the plan originally specified could not fire, verified by running it. And the module is
 * *instructed* to reset to the fetched tip, so only an argv-level check can tell that sanctioned
 * reset from an unsanctioned force. T-04-22 and T-04-23 rest on this function.
 */
function assertPermittedArgv(call: GitCall): void {
  const findings = violationsIn(call);
  if (findings.length > 0) {
    const line = `FORBIDDEN GIT ARGV — ${findings.join('; ')} in: git ${call.argv.join(' ')} (cwd ${call.cwd})`;
    process.stdout.write(`[case 0] ${line}\n`);
    throw new Error(line);
  }
}

let disposeObserver: (() => void) | null = null;

/* ============================================================================================ *
 * Topology
 * ============================================================================================ */

const roots: string[] = [];

type Topology = {
  root: string;
  origin: string;
  pipelineClone: string;
  humanClone: string;
  seed: Record_[];
};

function seedRecords(count: number): Record_[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `seed-${index + 1}`,
    title: `Seed ${index + 1}`,
    category: 'architecture',
    order: index + 1,
    categoryOrder: index + 1,
  }));
}

function writeManifest(repoDir: string, manifest: unknown): void {
  const target = join(repoDir, MANIFEST);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, serialise(manifest));
}

function readManifest(repoDir: string): Record_[] {
  return JSON.parse(readFileSync(join(repoDir, MANIFEST), 'utf8')) as Record_[];
}

/**
 * A fresh topology per case. `git init` + `git clone --no-hardlinks` — never `cp -r`, see hazard 2
 * in the header.
 */
function makeTopology(options: { withOrigin?: boolean; withManifest?: boolean } = {}): Topology {
  const { withOrigin = true, withManifest = true } = options;
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gsd-04-06-')));
  roots.push(root);

  const hooksDir = join(root, 'no-hooks');
  mkdirSync(hooksDir, { recursive: true });

  const origin = join(root, 'origin.git');
  const seedDir = join(root, 'seed');
  const seed = seedRecords(3);

  git(root, ['init', '--bare', '-b', PUBLISH_BRANCH, origin]);
  git(root, ['init', '-b', PUBLISH_BRANCH, seedDir]);
  configureRepo(seedDir, HUMAN, hooksDir);
  if (withManifest) {
    writeManifest(seedDir, seed);
    git(seedDir, ['add', '--', MANIFEST]);
  } else {
    writeFileSync(join(seedDir, 'README.md'), 'no manifest here\n');
    git(seedDir, ['add', '--', 'README.md']);
  }
  git(seedDir, ['commit', '-m', 'seed']);
  git(seedDir, ['remote', 'add', 'origin', origin]);
  git(seedDir, ['push', 'origin', `HEAD:refs/heads/${PUBLISH_BRANCH}`]);

  const pipelineClone = join(root, 'pipeline');
  const humanClone = join(root, 'human');
  git(root, ['clone', '--no-hardlinks', origin, pipelineClone]);
  git(root, ['clone', '--no-hardlinks', origin, humanClone]);
  configureRepo(pipelineClone, COMMITTER, hooksDir);
  configureRepo(humanClone, HUMAN, hooksDir);

  if (!withOrigin) {
    git(pipelineClone, ['remote', 'remove', 'origin']);
  }

  return { root, origin, pipelineClone, humanClone, seed };
}

/** The concurrent manual edit: a human commits to the same file and pushes. Returns its SHA. */
function humanEdits(topology: Topology, id: string): { sha: string; manifest: Record_[] } {
  git(topology.humanClone, ['fetch', 'origin', PUBLISH_BRANCH]);
  git(topology.humanClone, ['reset', '--hard', 'FETCH_HEAD']);
  const manifest = readManifest(topology.humanClone);
  manifest.push({
    id,
    title: `Human ${id}`,
    category: 'architecture',
    order: manifest.length + 1,
    categoryOrder: manifest.length + 1,
  });
  writeManifest(topology.humanClone, manifest);
  git(topology.humanClone, ['add', '--', MANIFEST]);
  git(topology.humanClone, ['commit', '-m', `human edit ${id}`]);
  git(topology.humanClone, ['push', 'origin', `HEAD:refs/heads/${PUBLISH_BRANCH}`]);
  return { sha: git(topology.humanClone, ['rev-parse', 'HEAD']), manifest };
}

/** The local write 04-09 step 5 performs before it calls publishManifest. */
function stagePipelineRecord(
  topology: Topology,
  id: string
): { content: string; manifest: Record_[] } {
  const manifest = readManifest(topology.pipelineClone);
  manifest.push({
    id,
    title: `Pipeline ${id}`,
    category: 'landscape',
    order: manifest.length + 1,
    categoryOrder: 1,
  });
  writeManifest(topology.pipelineClone, manifest);
  return { content: readFileSync(join(topology.pipelineClone, MANIFEST), 'utf8'), manifest };
}

function publishOptions(topology: Topology, overrides: Record<string, unknown> = {}) {
  return {
    repoDir: topology.pipelineClone,
    filePath: MANIFEST,
    message: 'photo: publish',
    committerName: COMMITTER.name,
    committerEmail: COMMITTER.email,
    rederive: (fetched: string) => fetched,
    ...overrides,
  } as Parameters<typeof publishManifest>[0];
}

/* ============================================================================================ */

beforeAll(async () => {
  if (existsSync(PRODUCER)) {
    const module_ = (await import(/* @vite-ignore */ pathToFileURL(PRODUCER).href)) as {
      serialiseManifest?: ManifestWriter;
    };
    if (typeof module_.serialiseManifest === 'function') {
      serialise = module_.serialiseManifest;
      writerName = 'serialiseManifest — scripts/lib/photo-record.mjs (04-05)';
    } else {
      writerName =
        'stand-in (scripts/lib/photo-record.mjs exists but exports no serialiseManifest)';
    }
  } else {
    writerName =
      'stand-in (scripts/lib/photo-record.mjs has not landed yet — 04-05 runs in this wave)';
  }

  // Whichever writer we got is held to serialiseManifest's DEFINING property, against the real
  // committed manifest. This is what stops the stand-in being a hole: a writer that disagrees with
  // `serialiseManifest` cannot reproduce the file `serialiseManifest` is required to reproduce.
  const committed = readFileSync(join(REPO_ROOT, 'data', 'portfolio_images.json'), 'utf8');
  const roundTripped = serialise(JSON.parse(committed));
  if (roundTripped !== committed) {
    throw new Error(
      `manifest writer "${writerName}" does not reproduce data/portfolio_images.json byte-for-byte ` +
        `(${roundTripped.length} bytes vs ${committed.length}) — case 0b cannot make a claim about ` +
        `bytes it did not produce faithfully.`
    );
  }
  process.stdout.write(
    `[case 0b] manifest writer in use: ${writerName} — reproduces the committed manifest byte-for-byte (${committed.length} bytes)\n`
  );

  disposeObserver = observeGit((call: GitCall) => {
    observed.push(call);
    assertPermittedArgv(call);
    if (extraHook) {
      try {
        extraHook(call);
      } catch (error) {
        hookErrors.push(String((error as Error)?.message ?? error));
      }
    }
  });
});

afterAll(() => {
  disposeObserver?.();
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
    if (existsSync(root)) {
      throw new Error(
        `temp repository ${root} survived teardown — this suite must leave nothing behind`
      );
    }
  }
  process.stdout.write(
    `[teardown] removed ${roots.length} temp repositor(ies); nothing left in ${tmpdir()}\n`
  );
});

/* ============================================================================================ */

describe('PIPE-05 · publishManifest against a real bare repository', () => {
  it('case 0 (a): the argv guard fires on every banned token AND on every structural walk-through', () => {
    // Every banned token, named in the failure message.
    for (const token of FORBIDDEN_GIT_ARGS) {
      const call: GitCall = { argv: ['push', 'origin', token, 'main'], cwd: '/nowhere' };
      expect(() => assertPermittedArgv(call)).toThrow(
        new RegExp(`FORBIDDEN GIT ARGV.*banned token "${token.replace(/-/g, '\\-')}"`)
      );
    }

    // The four walk-throughs. The first two were MEASURED to defeat a token-only guard: the module
    // was patched to run each of them and case 1 went green while it force-pushed.
    const walkThroughs: ReadonlyArray<{ why: string; argv: string[]; expect: RegExp }> = [
      {
        why: 'force refspec — a `+` prefix forces with no flag at all',
        argv: ['push', 'origin', `+HEAD:refs/heads/${PUBLISH_BRANCH}`],
        expect: /force refspec "\+HEAD:refs\/heads\/main"/,
      },
      {
        why: 'config injection — forces via remote.origin.push, invisible on the push line',
        argv: ['-c', 'remote.origin.push=+HEAD:refs/heads/main', 'push', 'origin'],
        expect: /config injection "-c remote\.origin\.push=/,
      },
      {
        why: 'git add . — stages a whole runner working tree without ever writing -A (T-04-23)',
        argv: ['add', '.'],
        expect: /git add must be exactly "add -- <one path>"/,
      },
      {
        why: 'an out-of-vocabulary subcommand — update-ref rewrites a ref with no push at all',
        argv: ['update-ref', 'refs/heads/main', 'deadbeef'],
        expect: /subcommand "update-ref" is outside this module's vocabulary/,
      },
    ];
    for (const walkThrough of walkThroughs) {
      expect(
        () => assertPermittedArgv({ argv: walkThrough.argv, cwd: '/nowhere' }),
        walkThrough.why
      ).toThrow(walkThrough.expect);
    }

    // And the discrimination the deleted source grep could not make: every argv the module is
    // SUPPOSED to issue passes. `reset --hard <sha>` in particular is what the design requires
    // (P-5: discard our commit, re-derive against what won), so a gate that banned it would ban
    // the design rather than the defect.
    const sanctioned: string[][] = [
      ['rev-parse', '--is-inside-work-tree'],
      ['rev-parse', 'FETCH_HEAD'],
      ['remote'],
      ['add', '--', MANIFEST],
      [
        '-c',
        'user.name=Photo Pipeline',
        '-c',
        'user.email=p@x.invalid',
        'commit',
        '-m',
        'photo: publish',
        '--',
        MANIFEST,
      ],
      ['push', 'origin', `HEAD:refs/heads/${PUBLISH_BRANCH}`],
      ['fetch', 'origin', PUBLISH_BRANCH],
      ['reset', '--hard', 'abc1234'],
    ];
    for (const argv of sanctioned) {
      expect(violationsIn({ argv, cwd: '/nowhere' }), `git ${argv.join(' ')}`).toEqual([]);
    }

    expect(FORBIDDEN_GIT_ARGS).toEqual([
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
    expect(ALLOWED_GIT_SUBCOMMANDS).toEqual([
      'rev-parse',
      'remote',
      'add',
      'commit',
      'push',
      'fetch',
      'reset',
    ]);
  });

  it('case 1: a clean fast-forward push succeeds on attempt 1 and origin points at that commit', async () => {
    const topology = makeTopology();
    stagePipelineRecord(topology, 'pipeline-clean');

    const result = await publishManifest(
      publishOptions(topology, { message: 'photo: publish pipeline-clean' })
    );

    expect(result.attempts).toBe(1);
    expect(result.changed).toBe(true);
    expect(result.branch).toBe(PUBLISH_BRANCH);
    expect(git(topology.origin, ['rev-parse', PUBLISH_BRANCH])).toBe(result.commit);
    expect(committedText(topology.origin, result.commit, MANIFEST)).toContain('pipeline-clean');
    process.stdout.write(
      `[case 1] attempts=${result.attempts} origin/${PUBLISH_BRANCH}=${result.commit}\n`
    );
  });

  it('case 2: a concurrent human commit survives — rederive gets the FETCHED manifest, not the stale one', async () => {
    const topology = makeTopology();
    const stale = stagePipelineRecord(topology, 'pipeline-contended');

    // PLANT THE DEFECT: the human lands first, so the pipeline's clone is now stale.
    const human = humanEdits(topology, 'human-first');
    const humanContent = committedText(topology.origin, human.sha, MANIFEST);
    expect(humanContent).not.toBe(stale.content);

    const seenByRederive: string[] = [];
    const result = await publishManifest(
      publishOptions(topology, {
        message: 'photo: publish pipeline-contended',
        rederive: (fetched: string) => {
          seenByRederive.push(fetched);
          const manifest = JSON.parse(fetched) as Record_[];
          manifest.push({
            id: 'pipeline-contended',
            title: 'Pipeline contended',
            category: 'landscape',
            order: manifest.length + 1,
            categoryOrder: 1,
          });
          return serialise(manifest);
        },
      })
    );

    // ANTI-VACUITY, FIRST. If the conflict never happened, every assertion below is satisfied by a
    // clean push and this case proves nothing — that is the 03-04 idempotence failure in a new
    // costume, where the gate measured the commit instead of the re-run.
    expect(result.attempts).toBeGreaterThan(1);

    const originTip = git(topology.origin, ['rev-parse', PUBLISH_BRANCH]);
    expect(originTip).toBe(result.commit);

    // By SHA, not by content — content could coincide.
    expect(gitExit(topology.origin, ['merge-base', '--is-ancestor', human.sha, originTip])).toBe(0);
    expect(previousRevisionOf(topology.origin, originTip, MANIFEST)).toBe(human.sha);

    // rederive: once per retry, with the FETCHED bytes. Compared against the human's committed
    // version, never against the stale one — otherwise the whole retry is theatre. This is asserted
    // BEFORE the merged-content checks below, so that a module handing `rederive` the stale
    // manifest fails on the ARGUMENT rather than only on the downstream consequence: the plant
    // (read the file before the reset instead of after) trips both, and the argument is the
    // sharper report of the two.
    expect(seenByRederive).toHaveLength(result.attempts - 1);
    expect(seenByRederive[0]).toBe(humanContent);
    expect(seenByRederive[0]).not.toBe(stale.content);

    const finalIds = (
      JSON.parse(committedText(topology.origin, originTip, MANIFEST)) as Record_[]
    ).map((r) => r.id);
    expect(finalIds).toContain('human-first');
    expect(finalIds).toContain('pipeline-contended');

    process.stdout.write(
      `[case 2] attempts=${result.attempts} human=${human.sha.slice(0, 8)} tip=${originTip.slice(0, 8)} ` +
        `predecessor-of-tip=${previousRevisionOf(topology.origin, originTip, MANIFEST).slice(0, 8)} ids=${finalIds.join(',')}\n`
    );
  });

  it('case 0 (b): after a retry the committed blob is the writer\u2019s bytes, ending in exactly one newline', async () => {
    const topology = makeTopology();
    stagePipelineRecord(topology, 'pipeline-newline');
    humanEdits(topology, 'human-newline');

    let written = '';
    const result = await publishManifest(
      publishOptions(topology, {
        message: 'photo: publish pipeline-newline',
        rederive: (fetched: string) => {
          const manifest = JSON.parse(fetched) as Record_[];
          manifest.push({
            id: 'pipeline-newline',
            title: 'Pipeline newline',
            category: 'landscape',
            order: manifest.length + 1,
            categoryOrder: 1,
          });
          written = serialise(manifest);
          return written;
        },
      })
    );

    expect(result.attempts).toBeGreaterThan(1); // the RETRY path specifically

    const blob = committedBytes(
      topology.origin,
      git(topology.origin, ['rev-parse', PUBLISH_BRANCH]),
      MANIFEST
    );
    expect(blob.at(-1)).toBe(0x0a);
    expect(blob.at(-2)).not.toBe(0x0a);
    // Byte fidelity: publishManifest re-serialises NOTHING, so the bytes the writer produced are
    // the bytes that landed. That is what makes `serialiseManifest` the single writer of manifest
    // bytes rather than one of two.
    expect(bytesEqual(blob, new TextEncoder().encode(written))).toBe(true);
    process.stdout.write(
      `[case 0b] retry blob = ${blob.length} bytes, tail ${JSON.stringify(decode(blob.subarray(-6)))}, ` +
        `byte-identical to ${writerName}\n`
    );
  });

  it('case 0 (b, planted): a rederive that drops the trailing newline is refused, naming serialiseManifest', async () => {
    const topology = makeTopology();
    stagePipelineRecord(topology, 'pipeline-nonewline');
    humanEdits(topology, 'human-nonewline');
    const tipBefore = git(topology.origin, ['rev-parse', PUBLISH_BRANCH]);

    await expect(
      publishManifest(
        publishOptions(topology, {
          rederive: (fetched: string) => serialise(JSON.parse(fetched)).replace(/\n$/, ''),
        })
      )
    ).rejects.toThrow(/exactly one "\\n".*serialiseManifest/s);

    expect(git(topology.origin, ['rev-parse', PUBLISH_BRANCH])).toBe(tipBefore);
    process.stdout.write(
      `[case 0b planted] refused; origin/${PUBLISH_BRANCH} unmoved at ${tipBefore.slice(0, 8)}\n`
    );
  });

  it('case 3: nothing to check — a missing file and a missing origin both fail by name, budget untouched', async () => {
    const noManifest = makeTopology({ withManifest: false });
    const beforeA = observed.length;
    await expect(publishManifest(publishOptions(noManifest))).rejects.toThrow(PublishInputError);
    await expect(publishManifest(publishOptions(noManifest))).rejects.toThrow(
      /data\/portfolio_images\.json.*does not exist.*No attempt was made/s
    );
    const duringA = observed.slice(beforeA).map((call) => call.argv[0]);
    expect(duringA).not.toContain('push');
    expect(duringA).not.toContain('commit');

    const noOrigin = makeTopology({ withOrigin: false });
    stagePipelineRecord(noOrigin, 'pipeline-orphan');
    const beforeB = observed.length;
    await expect(publishManifest(publishOptions(noOrigin))).rejects.toThrow(PublishInputError);
    await expect(publishManifest(publishOptions(noOrigin))).rejects.toThrow(
      /no remote named "origin".*No attempt was made/s
    );
    const duringB = observed.slice(beforeB).map((call) => call.argv[0]);
    expect(duringB).not.toContain('push');
    expect(duringB).not.toContain('commit');

    process.stdout.write(
      `[case 3] missing-file: git ran ${duringA.join(',')} · missing-origin: git ran ${duringB.join(',')} — no push, no commit\n`
    );
  });

  it('case 4: after a resolved conflict the clone is still usable — the next publish is attempt 1', async () => {
    const topology = makeTopology();
    stagePipelineRecord(topology, 'pipeline-first');
    humanEdits(topology, 'human-before');

    const contended = await publishManifest(
      publishOptions(topology, {
        rederive: (fetched: string) => {
          const manifest = JSON.parse(fetched) as Record_[];
          manifest.push({
            id: 'pipeline-first',
            title: 'A',
            category: 'landscape',
            order: manifest.length + 1,
            categoryOrder: 1,
          });
          return serialise(manifest);
        },
      })
    );
    expect(contended.attempts).toBeGreaterThan(1);

    // Not detached, not half-reset, nothing left staged.
    expect(git(topology.pipelineClone, ['symbolic-ref', '--short', 'HEAD'])).toBe(PUBLISH_BRANCH);
    expect(git(topology.pipelineClone, ['status', '--porcelain'])).toBe('');

    stagePipelineRecord(topology, 'pipeline-second');
    const clean = await publishManifest(
      publishOptions(topology, { message: 'photo: publish pipeline-second' })
    );

    expect(clean.attempts).toBe(1);
    expect(git(topology.origin, ['rev-parse', PUBLISH_BRANCH])).toBe(clean.commit);
    process.stdout.write(
      `[case 4] contended attempts=${contended.attempts}, follow-up attempts=${clean.attempts}, ` +
        `HEAD=${git(topology.pipelineClone, ['symbolic-ref', '--short', 'HEAD'])}, worktree clean\n`
    );
  });

  it('case 5 (walk-through i): a throwing rederive aborts immediately — budget untouched, nothing pushed', async () => {
    const topology = makeTopology();
    stagePipelineRecord(topology, 'pipeline-invalid');
    humanEdits(topology, 'human-guard');
    const tipBefore = git(topology.origin, ['rev-parse', PUBLISH_BRANCH]);

    let calls = 0;
    await expect(
      publishManifest(
        publishOptions(topology, {
          rederive: () => {
            calls += 1;
            throw new Error('astro sync rejected the re-derived record: RI-5 duplicate order');
          },
        })
      )
    ).rejects.toThrow(/RI-5 duplicate order/);

    expect(calls).toBe(1); // called once, not retryLimit times
    expect(git(topology.origin, ['rev-parse', PUBLISH_BRANCH])).toBe(tipBefore);
    process.stdout.write(
      `[case 5 i] rederive threw on attempt 2 of a budget of ${PUBLISH_RETRY_LIMIT}; rederive calls=${calls}; ` +
        `origin unmoved at ${tipBefore.slice(0, 8)}\n`
    );
  });

  it('case 5 (walk-through ii): a rederive returning STALE content DOES ship — the catching layer is rederive itself', async () => {
    const topology = makeTopology();
    const stale = stagePipelineRecord(topology, 'pipeline-stale');
    humanEdits(topology, 'human-stale');

    const result = await publishManifest(
      publishOptions(topology, {
        // The walk-through: ignore the fetched manifest entirely and re-apply the stale bytes.
        rederive: () => stale.content,
      })
    );

    expect(result.attempts).toBeGreaterThan(1);
    const shipped = JSON.parse(
      committedText(topology.origin, git(topology.origin, ['rev-parse', PUBLISH_BRANCH]), MANIFEST)
    ) as Record_[];

    // MEASURED, and recorded rather than wished away: publishManifest ships it. The human's record
    // is GONE from the file (though its commit survives in history), and the pipeline's `order`
    // was computed against maxima that no longer hold — pitfall P-5, exactly.
    expect(shipped.map((r) => r.id)).toContain('pipeline-stale');
    expect(shipped.map((r) => r.id)).not.toContain('human-stale');

    // So the layer that catches this is the `rederive` callback itself — proven by walk-through (i)
    // above, where a throwing rederive aborts the loop before anything is pushed. publishManifest
    // validates BYTES (case 0b) and never SEMANTICS: it does not parse the JSON and has no notion
    // of `order`. This is why 04-09 step 9 must re-run `astro sync` INSIDE the retry loop.
    expect(result.changed).toBe(true);
    process.stdout.write(
      `[case 5 ii] FINDING: publishManifest publishes a stale re-derive (attempts=${result.attempts}, ids=${shipped
        .map((r) => r.id)
        .join(
          ','
        )}). Catching layer = the caller's rederive callback (04-09 step 9, astro sync INSIDE the loop). ` +
        `publishManifest itself catches nothing semantic — by design, recorded here so 04-09 cannot assume otherwise.\n`
    );
  });

  it('case 5 (walk-through iii): exhausting the budget throws PublishConflictError and leaves origin untouched', async () => {
    const topology = makeTopology();
    stagePipelineRecord(topology, 'pipeline-doomed');

    // A foreign commit lands immediately BEFORE every push the module makes, so no attempt can
    // ever fast-forward. The hook is layered on top of the case-0 guard, not in place of it.
    let landed = 0;
    extraHook = (call) => {
      if (call.argv[0] === 'push' && call.cwd === topology.pipelineClone) {
        landed += 1;
        humanEdits(topology, `human-race-${landed}`);
      }
    };

    let thrown: unknown;
    try {
      await publishManifest(
        publishOptions(topology, {
          rederive: (fetched: string) => {
            const manifest = JSON.parse(fetched) as Record_[];
            manifest.push({
              id: 'pipeline-doomed',
              title: 'D',
              category: 'landscape',
              order: manifest.length + 1,
              categoryOrder: 1,
            });
            return serialise(manifest);
          },
        })
      );
    } catch (error) {
      thrown = error;
    } finally {
      extraHook = null;
    }

    expect(hookErrors).toEqual([]);
    expect(thrown).toBeInstanceOf(PublishConflictError);
    const conflict = thrown as PublishConflictError;
    expect(conflict.attempts).toBe(PUBLISH_RETRY_LIMIT);
    expect(conflict.branch).toBe(PUBLISH_BRANCH);
    expect(conflict.message).toContain(PUBLISH_BRANCH);
    expect(conflict.message).toContain(String(PUBLISH_RETRY_LIMIT));
    expect(conflict.message).toMatch(/[0-9a-f]{40}/);
    expect(landed).toBe(PUBLISH_RETRY_LIMIT);

    // The pipeline left nothing behind: every commit on origin is the human's.
    const authors = git(topology.origin, ['log', '--format=%an', PUBLISH_BRANCH]).split('\n');
    expect(authors).not.toContain(COMMITTER.name);
    const shippedIds = (
      JSON.parse(
        committedText(
          topology.origin,
          git(topology.origin, ['rev-parse', PUBLISH_BRANCH]),
          MANIFEST
        )
      ) as Record_[]
    ).map((r) => r.id);
    expect(shippedIds).not.toContain('pipeline-doomed');

    process.stdout.write(
      `[case 5 iii] ${conflict.name}: ${conflict.message}\n[case 5 iii] origin authors=${[
        ...new Set(authors),
      ].join(',')} · ids=${shippedIds.join(',')}\n`
    );
  });

  it('case 0 (z): the argv audit — real invocations were captured, and none carried a banned token', () => {
    // ANTI-VACUITY. An empty capture must not pass: nine prior gates in this project had exactly
    // that shape.
    expect(observed.length).toBeGreaterThan(0);

    const violations = observed
      .map((call) => ({ call, hits: forbiddenTokensIn(call.argv) }))
      .filter((entry) => entry.hits.length > 0);
    expect(violations.map((entry) => `git ${entry.call.argv.join(' ')}`)).toEqual([]);

    // The module must actually have exercised the risky paths under the guard, or "no forbidden
    // argv" would be true of a module that never pushed.
    // The subcommand is argv[0], except on the two identity-carrying invocations, which are
    // `-c user.name=… -c user.email=… <verb> …` — so argv[4].
    const census = new Map<string, number>();
    for (const call of observed) {
      const verb = call.argv[call.argv[0] === '-c' ? 4 : 0] as string;
      census.set(verb, (census.get(verb) ?? 0) + 1);
    }
    expect(census.get('push') ?? 0).toBeGreaterThan(0);
    expect(census.get('commit') ?? 0).toBeGreaterThan(0);
    expect(census.get('fetch') ?? 0).toBeGreaterThan(0);
    expect(census.get('reset') ?? 0).toBeGreaterThan(0); // the sanctioned reset ran, and passed

    process.stdout.write(
      `[case 0z] ${observed.length} git invocations captured, 0 forbidden. verbs: ${[
        ...census.entries(),
      ]
        .map(([verb, count]) => `${verb}×${count}`)
        .sort()
        .join(' ')}\n`
    );
  });
});
