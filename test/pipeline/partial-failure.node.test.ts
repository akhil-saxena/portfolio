/**
 * CRITERION 3 — what survives a failure at each boundary of the ten-step job.
 * (Phase 4, plan 04-09 — PIPE-04, and the evidence the whole plan exists to produce.)
 *
 * The real `scripts/process-photo.mjs` is run as a real child process, in a real git clone with a
 * real bare repository as `origin`, against a real `astro sync`, a real `sharp` derivation and the
 * real record producer. Two things are faked, both deliberately and both narrowly:
 *
 *   - `scripts/lib/r2.mjs` is replaced by `test/pipeline/fixtures/fake-r2.mjs`, a bucket on local
 *     disk that logs every operation and can be told to throw at a chosen boundary;
 *   - `scripts/verify-photo-urls.mjs` is replaced by `test/pipeline/fixtures/verifier-shim.mjs`,
 *     which imports the REAL verifier's `parseArgv`, `readManifest` and `assembleTargets` — every
 *     refusal floor, the origin equality check and the frozen mode table all still run — and
 *     replaces exactly one line: the `fetch` becomes a lookup in the fake bucket.
 *
 * Nothing here dispatches a workflow, writes to R2 or pushes to `main`. That is plan 04-10's, and
 * it is behind a blocking human checkpoint for credentials.
 *
 * ---------------------------------------------------------------------------------------------
 * THE THREE ASSERTIONS EVERY NEGATIVE CASE MAKES, AND WHY THE THIRD IS NOT ENOUGH ON ITS OWN
 *
 *   1. the exit code, which must be the one that means THIS failure and not another;
 *   2. that the INJECTED THROW ACTUALLY FIRED — the fake writes an `inject` entry to its log
 *      before throwing, and the case asserts that entry is there;
 *   3. the state of the world: manifest bytes, put count, delete count, branch tip.
 *
 * (2) is the anti-vacuity clause and it is not optional. A case that only checked (1) and (3)
 * would be satisfied by an entrypoint that failed instantly for an unrelated reason — a typo in
 * an import, a missing fixture — and would go green while proving nothing. 03-04 shipped the
 * neighbouring version of this mistake: an idempotence gate that read the 55 additions the merge
 * had just made and reported `FAIL: not idempotent` on correct code, because it measured
 * convergence rather than work.
 *
 * The HAPPY PATH is asserted FIRST in this file for the same reason. Without a passing happy path,
 * every negative case below is satisfiable by an entrypoint that cannot run at all — the
 * `Cannot find module` trap that `test/content/build-fails-loudly.node.test.ts` documents in its
 * own header.
 *
 * ---------------------------------------------------------------------------------------------
 * TWO HAZARDS FROM THIS PROJECT'S REGISTER, HONOURED HERE
 *
 *  1. **A worktree copied without `.git` fabricates failures.** Four tests in this repository walk
 *     `git log` and THROW rather than pass vacuously. Every sandbox below is built with
 *     `git clone --bare --no-hardlinks` followed by `git clone --no-hardlinks`, never a `cp -r`,
 *     so history is intact. Do not "simplify" that.
 *  2. **Never `git show HEAD~1:<file>` as a before-state.** `HEAD~1` is the previous COMMIT, which
 *     is the previous revision OF A FILE only when nothing else was committed in between — and
 *     this phase adds a third commit writer to `main`. Where this file needs a before-state it
 *     CAPTURES THE BYTES BEFORE THE RUN, in the test, from the file itself.
 *
 * And a third, local: `console.log` and `console.info` are SWALLOWED by this repository's vitest
 * setup (measured: 0 occurrences against 1 for `process.stdout.write`). Every diagnostic below
 * uses `process.stdout.write`, because a gate reporting through a swallowed channel is
 * indistinguishable from a gate that found nothing.
 *
 * ---------------------------------------------------------------------------------------------
 * ONE DEPARTURE FROM THE PLAN, MEASURED RATHER THAN CHOSEN
 *
 * The plan asks case 3 to force a step-6 rejection "by supplying inputs that produce a
 * schema-invalid record — e.g. a category that does not resolve (RI-1)". THAT IS UNREACHABLE, and
 * finding out why is worth more than the case would have been: `scripts/lib/dispatch-input.mjs`
 * validates `category` against `data/site_config.json` AT STEP 1, and its `alt` rules are a strict
 * SUPERSET of `PhotoSchema`'s. So no dispatch that survives step 1 can produce a record the gate
 * refuses — the two layers are ordered correctly, and the "invalid record" this case wanted
 * cannot be built through the front door.
 *
 * The reachable equivalent, used below, plants the defect in the CONTENT SET instead: a category
 * declared in `site_config.json` that no photograph uses fires RI-2. The properties under test are
 * unchanged — the gate refuses, the manifest is restored byte-for-byte, nothing is uploaded — and
 * the case additionally asserts `checked: 40 photo(s)` in the gate's own output, which proves the
 * candidate manifest really was written and really was read before being rolled back. Without
 * that, "the manifest is byte-identical" would also be satisfied by a job that never wrote it.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = 'data/portfolio_images.json';
const SITE_CONFIG = 'data/site_config.json';
const FIXTURES = join(REPO_ROOT, 'test', 'pipeline', 'fixtures');
const BRANCH = 'main';

/**
 * The dispatch. `alt` clears every rule in `altRefusalReason` and in `PhotoSchema`: 15+
 * characters, not the title, not the file name, no role prefix, no placeholder marker.
 */
const TEMP_KEY = 'temp/partialfailure.jpg';
const CATEGORY = 'nature';
const TITLE = 'Reeds At First Light';
const ALT =
  'Backlit reeds lean across a still pond, their seed heads catching the first low sun of the ' +
  'morning while the far bank stays in shadow.';
const EXPECTED_ID = 'nature-partialfailure';

type Sandbox = {
  root: string;
  origin: string;
  work: string;
  statePath: string;
  hooks: string;
};

type LogEntry = {
  op: string;
  key?: string;
  at?: string;
  method?: string;
  modeName?: string;
  argv?: string[];
  only?: string | null;
  targets?: number;
  contentType?: string;
  cacheControl?: string;
};

type FakeState = {
  injection: Record<string, unknown>;
  staged: { key: string | null; file: string };
  objects: Record<string, { size: number; contentType: string }>;
  log: LogEntry[];
};

/* ============================================================================================ *
 * git — argv arrays only, never a shell string
 * ============================================================================================ */

const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C', LANG: 'C' };

function git(cwd: string, argv: readonly string[]): string {
  return execFileSync('git', [...argv], { cwd, encoding: 'utf8', env: GIT_ENV }).trim();
}

/**
 * The same, UNTRIMMED, and it exists because trimming corrupted this suite.
 *
 * `git status --porcelain` encodes the status in the first TWO COLUMNS, and a
 * worktree-only modification is `" M path"` — a LEADING SPACE that carries meaning. `.trim()`
 * removed it, `line.slice(3)` then returned "cripts/process-photo.mjs", and the overlay below
 * skipped a file it could not find. MEASURED: with that bug, all seven planted defects in
 * `scripts/process-photo.mjs` were invisible and the whole suite stayed green while testing the
 * last COMMITTED entrypoint instead of the edited one.
 */
function gitRaw(cwd: string, argv: readonly string[]): string {
  return execFileSync('git', [...argv], { cwd, encoding: 'utf8', env: GIT_ENV });
}

const tipOf = (sandbox: Sandbox): string => git(sandbox.origin, ['rev-parse', BRANCH]);

/* ============================================================================================ *
 * the sandbox
 * ============================================================================================ */

const sandboxes: string[] = [];

/**
 * A git hook that lands a commit on `origin` from a rival clone. Used by cases 6 and 6b, which
 * differ ONLY in which hook it is installed as — and that difference decides which of two real,
 * distinguishable rejections the remote produces. See those cases.
 *
 * TWO THINGS HERE WERE MEASURED, NOT ASSUMED:
 *
 *  1. **The hook must unset git's own environment.** Git exports `GIT_DIR`, `GIT_INDEX_FILE` and
 *     friends to every hook it runs, so a hook that `cd`s elsewhere and calls `git add` is still
 *     operating on the CALLING repository's index. Measured here: the first version corrupted the
 *     work clone's index and the job died on `error: invalid object 100644 … for 'README.md'`,
 *     which looks like a bug in the pipeline and is a bug in the test.
 *  2. **It is bash**, spelled explicitly. Actions steps run bash; the interactive shell on this
 *     machine is zsh. Nothing here relies on either one's word-splitting.
 */
function rivalHook(rival: string): string {
  return [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY \\',
    '  GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL || true',
    `cd ${JSON.stringify(rival)}`,
    'git fetch -q origin main',
    'git reset -q --hard FETCH_HEAD',
    'date +%s%N >> README.md',
    'git add -- README.md',
    'git commit -q -m "rival edit"',
    'git push -q origin HEAD:refs/heads/main',
    '',
  ].join('\n');
}

/** Clone a rival that can push to the same origin, configured to commit without ceremony. */
function makeRival(sandbox: Sandbox): string {
  const rival = join(sandbox.root, 'rival');
  git(sandbox.root, ['clone', '--no-hardlinks', sandbox.origin, rival]);
  git(rival, ['config', 'user.name', 'Rival']);
  git(rival, ['config', 'user.email', 'rival@akhilsaxena.invalid']);
  git(rival, ['config', 'commit.gpgsign', 'false']);
  return rival;
}

/**
 * Overlay the working tree's version of any tracked-but-modified pipeline source onto the clone.
 *
 * A clone carries HEAD, so without this the suite would silently test the last COMMITTED
 * entrypoint while the author edited the file in front of them — green on code that is not the
 * code under test. What it copies is printed rather than inferred, and a clean tree prints that
 * it copied nothing, so the overlay can never be a silent difference between the sandbox and the
 * repository.
 */
function overlayWorkingTree(work: string): void {
  const status = gitRaw(REPO_ROOT, [
    'status',
    '--porcelain',
    '--',
    'scripts',
    'src',
    'data',
    '.github',
  ]);
  const copied: string[] = [];
  for (const line of status.split('\n').filter((l) => l.length > 0)) {
    const code = line.slice(0, 2);
    const relative = line.slice(3);
    if (code.includes('D')) continue; // a deletion is not something to overlay

    if (relative.startsWith('"')) {
      // git quotes paths containing special characters. Rather than half-parse one, refuse.
      throw new Error(
        `partial-failure: cannot overlay the quoted path ${relative} from \`git status\`. ` +
          `Refusing rather than skipping it, because a skipped overlay means the sandbox is ` +
          `silently running different code from the working tree.`
      );
    }
    const from = join(REPO_ROOT, relative);
    if (!existsSync(from)) {
      // A THROW, never a `continue`. The `continue` that used to be here is precisely what let a
      // one-character parse bug disarm the entire suite: the path was wrong, the file was "not
      // found", the overlay reported nothing to do, and every planted defect went green.
      throw new Error(
        `partial-failure: \`git status --porcelain\` named ${JSON.stringify(relative)}, which ` +
          `does not exist under ${REPO_ROOT}. The status line was ${JSON.stringify(line)}. ` +
          `Refusing: an overlay that cannot find a file it was told about is an overlay that is ` +
          `not happening, and the sandbox would then be testing HEAD while the author edits.`
      );
    }
    const to = join(work, relative);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    copied.push(relative);
  }
  process.stdout.write(
    `[partial-failure] sandbox overlay: ${copied.length === 0 ? 'none — sandbox is HEAD' : copied.join(', ')}\n`
  );
}

function makeSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'gsd-04-09-'));
  sandboxes.push(root);

  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const hooks = join(root, 'hooks');
  mkdirSync(hooks);

  // NEVER a cp -r: hazard 3. Two clones, so `work`'s origin is the throwaway bare repository and
  // never this repository — a pushing bug must not be able to reach the real `main`.
  git(root, ['clone', '--bare', '--no-hardlinks', REPO_ROOT, origin]);
  git(root, ['clone', '--no-hardlinks', origin, work]);

  const remote = git(work, ['remote', 'get-url', 'origin']);
  if (!remote.startsWith(root)) {
    throw new Error(
      `partial-failure: the sandbox clone's origin is ${remote}, which is outside the sandbox ` +
        `${root}. Refusing to run: a push from this clone could reach a real repository.`
    );
  }

  git(work, ['config', 'user.name', 'Sandbox']);
  git(work, ['config', 'user.email', 'sandbox@akhilsaxena.invalid']);
  git(work, ['config', 'commit.gpgsign', 'false']);
  git(work, ['config', 'core.hooksPath', hooks]);

  symlinkSync(join(REPO_ROOT, 'node_modules'), join(work, 'node_modules'), 'dir');
  overlayWorkingTree(work);

  // The two substitutions. The real verifier is moved aside rather than deleted, because the shim
  // imports its floors back out of it.
  copyFileSync(join(FIXTURES, 'fake-r2.mjs'), join(work, 'scripts', 'lib', 'r2.mjs'));
  renameSync(
    join(work, 'scripts', 'verify-photo-urls.mjs'),
    join(work, 'scripts', 'verify-photo-urls.real.mjs')
  );
  copyFileSync(join(FIXTURES, 'verifier-shim.mjs'), join(work, 'scripts', 'verify-photo-urls.mjs'));

  const statePath = join(root, 'fake-r2.json');
  const state: FakeState = {
    injection: {},
    staged: { key: TEMP_KEY, file: join(FIXTURES, 'rich-exif.jpg') },
    objects: {},
    log: [],
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

  return { root, origin, work, statePath, hooks };
}

afterAll(() => {
  for (const root of sandboxes) rmSync(root, { recursive: true, force: true });
});

/* ============================================================================================ *
 * driving the job
 * ============================================================================================ */

const readState = (sandbox: Sandbox): FakeState =>
  JSON.parse(readFileSync(sandbox.statePath, 'utf8')) as FakeState;

function patchState(sandbox: Sandbox, patch: Partial<FakeState>): void {
  const state = { ...readState(sandbox), ...patch };
  writeFileSync(sandbox.statePath, `${JSON.stringify(state, null, 2)}\n`);
}

const opsOf = (state: FakeState, op: string): LogEntry[] => state.log.filter((e) => e.op === op);
const manifestBytes = (sandbox: Sandbox): string =>
  readFileSync(join(sandbox.work, MANIFEST), 'utf8');
const manifestRecords = (sandbox: Sandbox): Array<{ id: string }> =>
  JSON.parse(manifestBytes(sandbox));

type Run = { code: number; output: string };

function runJob(sandbox: Sandbox, overrides: Record<string, string> = {}): Run {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    FAKE_R2_STATE: sandbox.statePath,
    INPUT_TEMP_KEY: TEMP_KEY,
    INPUT_CATEGORY: CATEGORY,
    INPUT_TITLE: TITLE,
    INPUT_ALT: ALT,
    GIT_AUTHOR_NAME: 'photo-pipeline',
    GIT_AUTHOR_EMAIL: 'photo-pipeline@users.noreply.github.invalid',
    GIT_TERMINAL_PROMPT: '0',
    LC_ALL: 'C',
    ...overrides,
  };

  // The cast is load-bearing and not a shrug. `worker-configuration.d.ts` augments
  // `NodeJS.ProcessEnv` with CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD as REQUIRED, which is right
  // for this application's own process and wrong for a child the test is deliberately starving:
  // the whole point of building this object key by key is that the job must run on exactly what
  // the workflow step's `env:` provides and must not inherit the parent's environment. Spelling
  // the two Access variables in here to satisfy the type would hand the pipeline two credentials
  // it has no business seeing, to silence a type error about a shape it is not.
  const childEnv = env as unknown as NodeJS.ProcessEnv;

  // `spawnSync`, not `execFileSync`. execFileSync RETURNS stdout and discards stderr on a zero
  // exit — which made case 7 (a successful run that emits a WARNING on stderr) unable to see the
  // very line it exists to assert. Both streams are captured on both paths here.
  const result = spawnSync(process.execPath, ['scripts/process-photo.mjs'], {
    cwd: sandbox.work,
    env: childEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    code: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/** One line per case, so the run output states what was measured rather than only PASS. */
function report(name: string, sandbox: Sandbox, run: Run, tipBefore: string): void {
  const state = readState(sandbox);
  process.stdout.write(
    `[partial-failure] ${name}: exit=${run.code} · puts=${opsOf(state, 'put').length} · ` +
      `deletes=${opsOf(state, 'delete').length} · injected=${
        opsOf(state, 'inject')
          .map((e) => e.at)
          .join(',') || 'none'
      } · tip moved=${tipOf(sandbox) !== tipBefore}\n`
  );
}

/* ============================================================================================ *
 * CASE 8 — THE HAPPY PATH, FIRST IN THE FILE AND NOT OPTIONAL.
 * ============================================================================================ */

let happy: { sandbox: Sandbox; records: number; tip: string } | null = null;

describe('the composed pipeline', () => {
  it('case 8 (happy path): publishes, and every later case is measured against this', {
    timeout: 180_000,
  }, () => {
    const sandbox = makeSandbox();
    const before = manifestBytes(sandbox);
    const tipBefore = tipOf(sandbox);
    const run = runJob(sandbox);
    report('case 8 happy path', sandbox, run, tipBefore);

    const state = readState(sandbox);
    expect(run.output).toContain('OUTCOME=PUBLISHED');
    expect(run.code).toBe(0);

    // four objects, and they are the four the record points at
    expect(opsOf(state, 'put')).toHaveLength(4);
    expect(Object.keys(state.objects)).toHaveLength(4);
    for (const put of opsOf(state, 'put')) {
      expect(put.contentType).toBe('image/webp');
      expect(put.cacheControl).toMatch(/max-age=\d+/);
    }

    // one new record, and it is the one that was dispatched
    const records = manifestRecords(sandbox);
    expect(records).toHaveLength(JSON.parse(before).length + 1);
    expect(records.filter((r) => r.id === EXPECTED_ID)).toHaveLength(1);

    // the commit is on the bare repository, and it is the manifest that moved
    const tip = tipOf(sandbox);
    expect(tip).not.toBe(tipBefore);
    expect(git(sandbox.origin, ['show', '--name-only', '--format=%s', tip])).toContain(MANIFEST);
    expect(git(sandbox.origin, ['show', '-s', '--format=%s', tip])).toBe(
      `photo: publish ${EXPECTED_ID}`
    );

    // the once-only token was spent, LAST
    expect(opsOf(state, 'delete')).toHaveLength(1);
    const order = state.log.map((e) => e.op);
    expect(order.lastIndexOf('put')).toBeLessThan(order.indexOf('delete'));
    expect(order.indexOf('verify')).toBeLessThan(order.indexOf('delete'));

    // STEP 8 PROBED WITH HEAD — read out of the real module's frozen mode table at run time,
    // not grepped out of the entrypoint. A GET can be answered by the edge and so cannot tell
    // "the object exists" from "the object was cached before the upload failed".
    const verify = opsOf(state, 'verify');
    expect(verify).toHaveLength(1);
    expect(verify[0].method).toBe('HEAD');
    expect(verify[0].modeName).toBe('liveness');
    expect(verify[0].only).toBe(EXPECTED_ID);
    expect(verify[0].argv).toContain('--only');
    expect(verify[0].argv).not.toContain('--cache');
    expect(verify[0].targets).toBe(4);

    happy = { sandbox, records: records.length, tip };
  });

  /* ========================================================================================== *
   * CASE 9 — a re-run after success. Criterion 2, by the once-only token.
   * ========================================================================================== */

  it('case 9 (re-run after success): exits 0, adds nothing, uploads nothing', {
    timeout: 180_000,
  }, () => {
    if (happy === null) {
      throw new Error(
        'partial-failure: case 9 has no post-happy-path state to compare against, because case ' +
          '8 did not complete. Refusing to assert "nothing changed" about a run that never ' +
          'happened.'
      );
    }
    const { sandbox } = happy;
    const before = manifestBytes(sandbox);
    const putsBefore = opsOf(readState(sandbox), 'put').length;
    const tipBefore = tipOf(sandbox);

    const run = runJob(sandbox);
    report('case 9 re-run', sandbox, run, tipBefore);

    expect(run.code).toBe(0);
    expect(run.output).toContain('OUTCOME=STAGED_ABSENT');
    const state = readState(sandbox);

    // Compared against the value case 8 measured, never against a literal.
    expect(manifestRecords(sandbox)).toHaveLength(happy.records);
    expect(manifestBytes(sandbox)).toBe(before);
    expect(opsOf(state, 'put')).toHaveLength(putsBefore);
    expect(opsOf(state, 'get-miss')).toHaveLength(1);
    expect(tipOf(sandbox)).toBe(tipBefore);
  });

  /* ========================================================================================== *
   * CASE 1 — a throw in step 2 (the staged GET).
   * ========================================================================================== */

  it('case 1: a throw in step 2 changes nothing anywhere', { timeout: 180_000 }, () => {
    const sandbox = makeSandbox();
    patchState(sandbox, { injection: { throwAt: 'get' } });
    const before = manifestBytes(sandbox);
    const tipBefore = tipOf(sandbox);

    const run = runJob(sandbox);
    report('case 1 step-2 throw', sandbox, run, tipBefore);
    const state = readState(sandbox);

    expect(run.code).toBe(3); // STAGED_READ_FAILED, and not some other failure
    expect(run.output).toContain('OUTCOME=STAGED_READ_FAILED');
    expect(opsOf(state, 'inject').map((e) => e.at)).toEqual(['get']); // it FIRED
    expect(manifestBytes(sandbox)).toBe(before);
    expect(git(sandbox.work, ['status', '--porcelain', '--', 'data'])).toBe('');
    expect(opsOf(state, 'put')).toHaveLength(0);
    expect(opsOf(state, 'delete')).toHaveLength(0);
    expect(tipOf(sandbox)).toBe(tipBefore);
  });

  /* ========================================================================================== *
   * CASE 2 — a failure in step 3 (the derivation).
   * ========================================================================================== */

  it('case 2: a failure in step 3 changes nothing anywhere', { timeout: 180_000 }, () => {
    const sandbox = makeSandbox();
    // A real injection rather than a stubbed throw: the staged object is not a decodable image,
    // so `readSource` refuses it on the bytes. That is the failure a corrupt upload produces.
    const garbage = join(sandbox.root, 'not-an-image.bin');
    writeFileSync(garbage, 'this is not a photograph, it is forty bytes of prose');
    patchState(sandbox, { staged: { key: TEMP_KEY, file: garbage } });
    const before = manifestBytes(sandbox);
    const tipBefore = tipOf(sandbox);

    const run = runJob(sandbox);
    report('case 2 step-3 failure', sandbox, run, tipBefore);
    const state = readState(sandbox);

    expect(run.code).toBe(4); // DERIVE_FAILED
    expect(run.output).toContain('OUTCOME=DERIVE_FAILED');
    expect(run.output).toMatch(/not a decodable image/i); // the deriver's own refusal, by name
    expect(opsOf(state, 'get')).toHaveLength(1); // the staged read really happened
    expect(manifestBytes(sandbox)).toBe(before);
    expect(opsOf(state, 'put')).toHaveLength(0);
    expect(opsOf(state, 'delete')).toHaveLength(0);
    expect(tipOf(sandbox)).toBe(tipBefore);
  });

  /* ========================================================================================== *
   * CASE 3 — step 6 refuses, and the manifest goes back.
   * ========================================================================================== */

  it('case 3: the content gate refuses, and the manifest is restored byte-for-byte', {
    timeout: 180_000,
  }, () => {
    const sandbox = makeSandbox();

    // PLANT THE DEFECT in the content set: a declared category no photograph uses fires RI-2.
    // See this file's header for why the plan's RI-1 injection is unreachable through step 1.
    const configPath = join(sandbox.work, SITE_CONFIG);
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    config.categories.push({ ...config.categories[0], id: 'unusedcategory', label: 'Unused' });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    const before = manifestBytes(sandbox);
    const tipBefore = tipOf(sandbox);
    const run = runJob(sandbox);
    report('case 3 gate rejection', sandbox, run, tipBefore);
    const state = readState(sandbox);

    expect(run.code).toBe(5); // GATE_REJECTED
    expect(run.output).toContain('OUTCOME=GATE_REJECTED');
    expect(run.output).toMatch(/RI-2/); // the child's output names the rule

    // THE ANTI-VACUITY ASSERTION. The gate reports how many photographs it looked at, so this
    // proves the candidate manifest was really written and really read — 40, not 39 — before
    // being rolled back. Without it, "byte-identical" is also true of a job that never wrote.
    expect(run.output).toMatch(/checked: 40 photo\(s\)/);

    expect(manifestBytes(sandbox)).toBe(before);
    expect(git(sandbox.work, ['status', '--porcelain', '--', 'data/portfolio_images.json'])).toBe(
      ''
    );
    expect(opsOf(state, 'put')).toHaveLength(0);
    expect(opsOf(state, 'delete')).toHaveLength(0);
    expect(tipOf(sandbox)).toBe(tipBefore);
  });

  /* ========================================================================================== *
   * CASE 4 — step 7 dies after two of four puts. The PERMITTED direction.
   * ========================================================================================== */

  it('case 4: two of four variants land, and the manifest still does not move', {
    timeout: 180_000,
  }, () => {
    const sandbox = makeSandbox();
    patchState(sandbox, { injection: { putFailAfter: 2 } });
    const before = manifestBytes(sandbox);
    const tipBefore = tipOf(sandbox);

    const run = runJob(sandbox);
    report('case 4 partial upload', sandbox, run, tipBefore);
    const state = readState(sandbox);

    expect(run.code).toBe(6); // UPLOAD_FAILED
    expect(run.output).toContain('OUTCOME=UPLOAD_FAILED');
    expect(opsOf(state, 'inject').map((e) => e.at)).toEqual(['put#3']); // it FIRED, at the third

    // THE PERMITTED DIRECTION: orphan bytes, named as such in the job's own output.
    expect(opsOf(state, 'put')).toHaveLength(2);
    expect(Object.keys(state.objects)).toHaveLength(2);
    expect(run.output).toMatch(/orphan bytes/);

    // THE FORBIDDEN DIRECTION did not happen: no record, anywhere, with no bytes behind it.
    expect(manifestBytes(sandbox)).toBe(before);
    expect(tipOf(sandbox)).toBe(tipBefore);

    // and the token is unspent, so a re-dispatch repairs the run
    expect(opsOf(state, 'delete')).toHaveLength(0);
    expect(readState(sandbox).staged.key).toBe(TEMP_KEY);
  });

  /* ========================================================================================== *
   * CASE 5 — the uploads are accepted and do not land; step 8 catches it.
   * ========================================================================================== */

  it('case 5: liveness fails, so the branch tip does not move', { timeout: 180_000 }, () => {
    const sandbox = makeSandbox();
    // The bucket ACCEPTS all four puts and persists none of them. This is the real shape of the
    // failure step 8 exists to catch — an upload that reported success over an object the
    // bucket does not hold — rather than a verdict forced in the verifier.
    patchState(sandbox, { injection: { putsDoNotPersist: true } });
    const before = manifestBytes(sandbox);
    const tipBefore = tipOf(sandbox);

    const run = runJob(sandbox);
    report('case 5 liveness failure', sandbox, run, tipBefore);
    const state = readState(sandbox);

    expect(run.code).toBe(7); // LIVENESS_FAILED
    expect(run.output).toContain('OUTCOME=LIVENESS_FAILED');

    // the injection fired: four puts were made, nothing landed, and the verifier saw it
    expect(opsOf(state, 'put')).toHaveLength(4);
    expect(Object.keys(state.objects)).toHaveLength(0);
    const verify = opsOf(state, 'verify');
    expect(verify).toHaveLength(1);
    expect(verify[0].method).toBe('HEAD');
    expect(run.output).toMatch(/HTTP 404/);

    // §6 measured that NOTHING else in this repository can see this: the record is schema-valid
    // and `astro sync` passed it at exit 0 one step earlier.
    expect(run.output).toMatch(/checked: 40 photo\(s\)/);
    expect(manifestBytes(sandbox)).toBe(before);
    expect(tipOf(sandbox)).toBe(tipBefore);
    expect(opsOf(state, 'delete')).toHaveLength(0);
  });

  /* ========================================================================================== *
   * CASE 6 — step 9 exhausts its retries against a writer that keeps winning.
   * ========================================================================================== */

  it('case 6: the publish budget is exhausted and reported, not silently given up on', {
    timeout: 300_000,
  }, () => {
    const sandbox = makeSandbox();

    // A rival clone that lands a commit on origin during EVERY `git commit` this job makes — so
    // by the time each push starts, the remote is ALREADY ahead and rejects it as a plain
    // non-fast-forward. Installed as `pre-commit` rather than `pre-push` for exactly that reason;
    // case 6b runs the same hook as `pre-push` and gets a different rejection.
    const rival = makeRival(sandbox);

    writeFileSync(join(sandbox.hooks, 'pre-commit'), rivalHook(rival));
    chmodSync(join(sandbox.hooks, 'pre-commit'), 0o755);

    const before = manifestBytes(sandbox);
    const run = runJob(sandbox);
    const state = readState(sandbox);
    process.stdout.write(
      `[partial-failure] case 6 publish conflict: exit=${run.code} · puts=${
        opsOf(state, 'put').length
      } · deletes=${opsOf(state, 'delete').length}\n`
    );

    expect(run.code).toBe(8); // PUBLISH_CONFLICT
    expect(run.output).toContain('OUTCOME=PUBLISH_CONFLICT');
    expect(run.output).toMatch(new RegExp(`\\b${BRANCH}\\b`)); // names the branch
    expect(run.output).toMatch(/3 attempt/); // and the attempt count

    // the retry really ran: three attempts, each re-deriving against the manifest that won
    expect(run.output.match(/re-derived against the fetched manifest/g)).toHaveLength(2);

    // THE CONTENT GATE RAN INSIDE THE RETRY LOOP, and this is the assertion that holds it there.
    // 04-06 measured that `publishManifest` validates BYTES and never SEMANTICS — a `rederive`
    // returning stale content IS committed and pushed, silently discarding a concurrent human
    // record — so the catching layer has to be `rederive` itself. And the re-derived record is
    // genuinely different: its ranks are computed from the manifest that actually won. Three
    // `astro sync` runs: one at step 6, one per re-derive. A gate hoisted out of the loop gives 1.
    expect(run.output.match(/content set: PASS/g)).toHaveLength(3);

    // the variants ARE live — orphan bytes, the permitted direction — and nothing was committed
    expect(opsOf(state, 'put')).toHaveLength(4);
    expect(opsOf(state, 'delete')).toHaveLength(0);
    expect(readState(sandbox).staged.key).toBe(TEMP_KEY);

    // the manifest on the branch is untouched, and the checkout is not left corrupt
    const originManifest = git(sandbox.origin, ['show', `${BRANCH}:${MANIFEST}`]);
    expect(`${originManifest}\n`).toBe(before);
    expect(git(sandbox.work, ['status', '--porcelain', '--', 'data'])).toBe('');
    const records = manifestRecords(sandbox);
    expect(records.filter((r) => r.id === EXPECTED_ID).length).toBeLessThanOrEqual(1);
  });

  /* ========================================================================================== *
   * CASE 6b — the rival lands DURING the push. A different rejection, and a measured gap.
   * ========================================================================================== */

  it('case 6b: a lost compare-and-swap is NOT retried — pinned, because it is a real gap', {
    timeout: 300_000,
  }, () => {
    const sandbox = makeSandbox();
    const rival = makeRival(sandbox);

    // The SAME hook as case 6, installed as `pre-push` instead. Git has already computed the
    // ref's expected old value by the time a pre-push hook runs, so a rival landing HERE turns
    // the push into a failed compare-and-swap rather than a non-fast-forward:
    //
    //   remote: error: cannot lock ref 'refs/heads/main': is at <new> but expected <old>
    //   ! [remote rejected] HEAD -> main (failed to update ref)
    //
    // MEASURED, 2026-08-28. `classifyPushFailure` in scripts/lib/git-publish.mjs matches
    // `non-fast-forward|fetch first|stale info` and `updates were rejected because`, none of
    // which appear here — so it returns 'other' and the job exits 9 WITHOUT retrying, even
    // though a re-derive is exactly what would fix it. That is a gap, and this case pins the
    // CURRENT behaviour rather than papering over it: the day someone teaches
    // `classifyPushFailure` about a lost ref lock, this assertion goes red and says so.
    //
    // It is not a data-integrity problem, which is why it is recorded and deferred rather than
    // fixed inside 04-09: the outcome is the SAFE one — nothing committed, bytes orphaned, and
    // a re-dispatch repairs the run. It is logged in this phase's deferred-items.md.
    writeFileSync(join(sandbox.hooks, 'pre-push'), rivalHook(rival));
    chmodSync(join(sandbox.hooks, 'pre-push'), 0o755);

    const before = manifestBytes(sandbox);
    const run = runJob(sandbox);
    const state = readState(sandbox);
    process.stdout.write(
      `[partial-failure] case 6b lost CAS: exit=${run.code} · puts=${
        opsOf(state, 'put').length
      } · deletes=${opsOf(state, 'delete').length}\n`
    );

    expect(run.code).toBe(9); // PUBLISH_FAILED — today. See the comment above.
    expect(run.output).toContain('OUTCOME=PUBLISH_FAILED');
    expect(run.output).toMatch(/cannot lock ref|failed to update ref/);
    expect(run.output).toMatch(/is NOT a conflict/);

    // The injection fired — the rival really did land a commit on origin.
    expect(git(sandbox.origin, ['log', '--format=%s', '-1', BRANCH])).toBe('rival edit');

    // And the outcome is the safe one, which is the whole reason this is a deferral and not a
    // blocker: nothing of ours was committed, the bytes are orphans, the token is unspent.
    expect(`${git(sandbox.origin, ['show', `${BRANCH}:${MANIFEST}`])}\n`).toBe(before);
    expect(opsOf(state, 'put')).toHaveLength(4);
    expect(opsOf(state, 'delete')).toHaveLength(0);
    expect(readState(sandbox).staged.key).toBe(TEMP_KEY);
  });

  /* ========================================================================================== *
   * CASE 7 — step 10 fails. The run SUCCEEDED.
   * ========================================================================================== */

  it('case 7: a failed delete is a warning, because the record is already committed', {
    timeout: 180_000,
  }, () => {
    const sandbox = makeSandbox();
    patchState(sandbox, { injection: { throwAt: 'delete' } });
    const tipBefore = tipOf(sandbox);

    const run = runJob(sandbox);
    report('case 7 delete failure', sandbox, run, tipBefore);
    const state = readState(sandbox);

    expect(run.code).toBe(0); // PUBLISHED — a delete failure is not a failed publish
    expect(run.output).toContain('OUTCOME=PUBLISHED');
    expect(opsOf(state, 'inject').map((e) => e.at)).toEqual(['delete']); // it FIRED
    expect(run.output).toMatch(/WARNING/);
    expect(run.output).toMatch(/lifecycle rule/);

    // the commit is on the bare repository, by SHA
    const tip = tipOf(sandbox);
    expect(tip).not.toBe(tipBefore);
    expect(git(sandbox.origin, ['show', '-s', '--format=%s', tip])).toBe(
      `photo: publish ${EXPECTED_ID}`
    );
    expect(opsOf(state, 'put')).toHaveLength(4);
    expect(opsOf(state, 'delete')).toHaveLength(0); // it threw before recording one
  });
});
