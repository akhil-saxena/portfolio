/**
 * Criterion 2's evidence: a malformed `data/*.json` stops a REAL `astro build`, and the output
 * names the file, the record and the field.
 *
 * WHY THIS IS NOT A UNIT TEST OF THE FORMATTER
 * -------------------------------------------
 * A test that calls `formatSchemaFailure` and asserts on the string it returns proves that a string
 * function returns a string. It would stay green if nothing in the build ever called it — which was
 * the actual state of this repository before plan 03-08 measured it: `research/ARCHITECTURE.md`
 * asserts that a module-scope `Schema.parse()` in `src/lib/content.ts` aborts the build, and with a
 * corrupt `data/resume.json` in place `astro build` exited **0** and emitted `dist/`, because nothing
 * imports that module until Phase 5 writes a page. So every case below spawns a real build and reads
 * its real exit code.
 *
 * WHY IT BUILDS A SANDBOX INSTEAD OF MUTATING `data/`
 * --------------------------------------------------
 * The plan asked for a byte-copy restore in an unconditional `finally`, and that is here. But a
 * restore only narrows the window in which the repository is corrupt; it does not close it. Vitest
 * runs the four projects concurrently, and `test/content/schemas.unit.test.ts` reads all five
 * `data/*.json` files at import time — so a mutation in this file could be observed by a test in
 * another project and fail it for a reason that has nothing to do with that test. That is a flaky
 * suite, and a flaky gate is a gate people learn to re-run.
 *
 * So each case mutates a disposable copy of the project, and this file additionally asserts that the
 * repository's own `data/` is byte-identical before and after. The isolation is the primary claim;
 * the restore is the belt.
 *
 * The sandbox COPIES `src`, `public`, `data` and `astro.config.mjs` and SYMLINKS only
 * `node_modules`. Symlinking `src` was tried first and broke — Astro resolves module paths through
 * the symlink's real path and then cannot match them against its own compile metadata
 * ("No cached compile metadata found for …/404.astro"). It is written down because the failure looked
 * like a content problem and was not, and because it is the reason the positive case below matters:
 * with a broken sandbox every negative case passes for the wrong reason.
 *
 * THE TWO TRAPS THIS FILE IS WRITTEN AGAINST, BOTH FROM THIS PROJECT'S REGISTER
 * ----------------------------------------------------------------------------
 * 1. A NON-ZERO EXIT IS NOT A REJECTION. While prototyping this harness the astro binary path was
 *    wrong; the spawn exited 1 with `Cannot find module …/astro.js` and no build ever ran. A test
 *    asserting only `exitCode !== 0` is green in exactly that state. So every case asserts the
 *    output is non-empty AND contains the file, the record's own identifier and the field — three
 *    strings a broken spawn cannot produce.
 * 2. AN EMPTY CAPTURED STRING SATISFIES A CARELESS ASSERTION. `expect('').toContain('')` passes, and
 *    a `grep -c`-shaped check on an empty variable is the shape 03-07 shipped. `expectRejection`
 *    below asserts the length first, then the content.
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ASTRO_BIN = path.join(REPO_ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');

/** Everything the build reads. Copied, not linked — see the header on why `src` cannot be linked. */
const COPIED = [
  'src',
  'public',
  'data',
  'astro.config.mjs',
  'package.json',
  'tsconfig.json',
  'wrangler.jsonc',
  'worker-configuration.d.ts',
  'biome.json',
  '.nvmrc',
  // Seeded by `npm run bootstrap:local`; astro:env's build-time validation reads them off disk,
  // not out of the process environment (measured five ways in plan 02-06).
  '.dev.vars',
  '.env',
];

/** The five committed content files. FIVE — `projects.json` is the one the plan's text forgets. */
const CONTENT_FILES = [
  'portfolio_images.json',
  'site_config.json',
  'home_config.json',
  'projects.json',
  'resume.json',
];

interface BuildResult {
  exitCode: number;
  output: string;
  distEmitted: boolean;
}

let sandbox = '';

/** Byte copies taken before any mutation. The restore reads from here and from nowhere else. */
const pristine = new Map<string, Buffer>();

/**
 * SHA-256 of the repository's own content files, so this suite can prove it did not touch them.
 *
 * A digest rather than a `Buffer.equals` comparison: `equals` is not on the `NonSharedBuffer` type
 * `readFileSync` returns under this tsconfig, and `astro check` said so. A hex digest compares the
 * same bytes and reads as the byte claim it is making.
 */
const repoContent = new Map<string, string>();

const digestOf = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

function sandboxDataPath(name: string): string {
  return path.join(sandbox, 'data', name);
}

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(sandboxDataPath(name), 'utf8'));
}

function writeJson(name: string, value: unknown): void {
  writeFileSync(sandboxDataPath(name), `${JSON.stringify(value, null, 2)}\n`);
}

/** Put every sandbox file back to the bytes captured in `beforeAll`. Never re-derives anything. */
function restoreSandbox(): void {
  for (const [relative, bytes] of pristine) {
    writeFileSync(path.join(sandbox, relative), bytes);
  }
}

/**
 * Run a real `astro build` in the sandbox and return its exit code and combined output.
 *
 * `execFile` on the astro entrypoint rather than `npx`: `npx` would resolve a binary and could
 * silently fetch one, and its own non-zero exits are indistinguishable from the build's.
 */
async function runBuild(): Promise<BuildResult> {
  rmSync(path.join(sandbox, 'dist'), { recursive: true, force: true });
  let exitCode = 0;
  let output = '';
  try {
    const done = await execFileAsync(process.execPath, [ASTRO_BIN, 'build'], {
      cwd: sandbox,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });
    output = `${done.stdout}${done.stderr}`;
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    exitCode = typeof failure.code === 'number' ? failure.code : 1;
    output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
  }
  let distEmitted = true;
  try {
    readFileSync(path.join(sandbox, 'dist', 'server', 'wrangler.json'));
  } catch {
    distEmitted = false;
  }
  return { exitCode, output, distEmitted };
}

/** Mutate, build, and put the sandbox back whatever the assertion does. */
async function buildAfter(mutate: () => void): Promise<BuildResult> {
  try {
    mutate();
    return await runBuild();
  } finally {
    restoreSandbox();
  }
}

/**
 * A rejection is a non-zero exit whose output NAMES the thing that was wrong.
 *
 * The order of the assertions is deliberate: length before content, so an empty capture fails on
 * the first line rather than passing a substring check that has nothing to search.
 */
function expectRejection(result: BuildResult, mustName: string[]): void {
  expect(result.output.length).toBeGreaterThan(0);
  expect(result.exitCode).not.toBe(0);
  expect(result.distEmitted).toBe(false);
  for (const needle of mustName) {
    expect(needle.length).toBeGreaterThan(0);
    expect(result.output).toContain(needle);
  }
}

const BUILD_TIMEOUT = 180_000;

beforeAll(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), 'gsd-content-build-'));
  for (const entry of COPIED) {
    cpSync(path.join(REPO_ROOT, entry), path.join(sandbox, entry), { recursive: true });
  }
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(sandbox, 'node_modules'));

  pristine.set('astro.config.mjs', readFileSync(path.join(sandbox, 'astro.config.mjs')));
  for (const name of CONTENT_FILES) {
    pristine.set(path.join('data', name), readFileSync(sandboxDataPath(name)));
    repoContent.set(name, digestOf(readFileSync(path.join(REPO_ROOT, 'data', name))));
  }
  expect(pristine.size).toBe(CONTENT_FILES.length + 1);
}, 120_000);

afterAll(() => {
  // The claim this suite rests on: the repository's own content was never a participant.
  for (const [name, sha256] of repoContent) {
    expect(digestOf(readFileSync(path.join(REPO_ROOT, 'data', name)))).toBe(sha256);
  }
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

/* ==============================================================================================
 * The positive case FIRST, because it is what makes the negative ones mean anything: a sandbox
 * that fails every build would satisfy every assertion below it.
 * ============================================================================================ */

describe('a clean tree builds, and the gate says how much it looked at', () => {
  it(
    'exits 0, emits dist/, and reports a census of the sandbox manifest rather than a bare PASS',
    async () => {
      const result = await buildAfter(() => {});
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.exitCode).toBe(0);
      expect(result.distEmitted).toBe(true);

      // Anti-vacuity: "content set: PASS" is the same sentence over zero photographs and over
      // thirty-nine, and only one of them is a pass.
      expect(result.output).toContain('content set: PASS');

      // DERIVED (plan 04-01), from THE SANDBOX'S OWN COPY of the manifest — the file this build
      // actually read — not from a literal and not from the repository. `39 photo(s)` was one of
      // the 15 assertions that redded at 40 records on 2026-08-27, and bumping it to 40 would have
      // put the same trap back one photograph further along.
      //
      // The claim being kept is the one the block exists for: the gate reports A CENSUS rather than
      // a bare PASS, and the census is the size of what it was given. `n > 0` comes FIRST because
      // `toContain('0 photo(s)')` over an empty sandbox manifest would otherwise satisfy this
      // trivially — and an empty manifest is refused by `PhotoManifestSchema.min(1)`, so a build
      // that got that far would already be failing for a different reason.
      const sandboxPhotos = readJson('portfolio_images.json') as unknown[];
      expect(Array.isArray(sandboxPhotos)).toBe(true);
      expect(sandboxPhotos.length).toBeGreaterThan(0);
      expect(result.output).toContain(`${sandboxPhotos.length} photo(s)`);
      expect(result.output).toContain('7 category record(s)');
      expect(result.output).toContain('5 project(s)');
      expect(result.output).toContain('RI-1, RI-2, RI-3, RI-4, RI-5, RI-6');
    },
    BUILD_TIMEOUT
  );
});

/* ==============================================================================================
 * One planted defect per committed content file. FIVE files, not four: the plan's `must_haves`
 * and `<verification>` both say "the four content files", and 03-CONTEXT.md §2 is the one that is
 * right — `projects.json` was created by 03-05 under decision D-24 and RI-5 reads it.
 * ============================================================================================ */

describe('a malformed data file stops the build and names file, record and field', () => {
  it(
    'portfolio_images.json — a wrong type on order names the photograph, not just photos[12]',
    async () => {
      const result = await buildAfter(() => {
        const photos = readJson('portfolio_images.json') as { id: string; order: unknown }[];
        expect(photos[12].id).toBe('nature-hillsandgreens');
        photos[12].order = 'twelve';
        writeJson('portfolio_images.json', photos);
      });

      expectRejection(result, [
        'data/portfolio_images.json',
        'nature-hillsandgreens',
        'order',
        'received "twelve"',
      ]);
    },
    BUILD_TIMEOUT
  );

  it(
    'portfolio_images.json + site_config.json — a typo’d category is caught by nothing else',
    async () => {
      // THE CASE THE WHOLE PHASE EXISTS FOR. "archtecture" is a perfectly valid lowercase slug, so
      // no per-file schema can see it; ADR-002 §4 deleted /admin/site on the strength of the rule
      // that can. Measured green before this plan wired the gate (experiment 2).
      const result = await buildAfter(() => {
        const photos = readJson('portfolio_images.json') as { id: string; category: string }[];
        const index = photos.findIndex((photo) => photo.id === 'architecture-singapore');
        expect(index).toBeGreaterThanOrEqual(0);
        photos[index].category = 'archtecture';
        writeJson('portfolio_images.json', photos);
      });

      expectRejection(result, [
        'data/portfolio_images.json',
        'architecture-singapore',
        '"archtecture"',
        'data/site_config.json',
        'RI-1',
      ]);
    },
    BUILD_TIMEOUT
  );

  it(
    'home_config.json — a dangling peek id names the id and the field it sits in',
    async () => {
      const result = await buildAfter(() => {
        const home = readJson('home_config.json') as { peekIds: string[] };
        expect(home.peekIds.length).toBeGreaterThan(0);
        home.peekIds[0] = 'does-not-exist';
        writeJson('home_config.json', home);
      });

      expectRejection(result, ['data/home_config.json', 'does-not-exist', 'peekIds[0]', 'RI-3']);
    },
    BUILD_TIMEOUT
  );

  it(
    'resume.json — an HTML tag in a bullet names Brevo, not experience[0]',
    async () => {
      // The one mutation in the phase that exercises criteria 1, 2 and 3 at once: the stored shape
      // cannot express a tag (03-02), the schema refuses one (03-06), and the build says so
      // legibly (this plan).
      const result = await buildAfter(() => {
        const resume = readJson('resume.json') as {
          experience: { company: string; bullets: string[] }[];
        };
        expect(resume.experience[0].company).toContain('Brevo');
        resume.experience[0].bullets[0] = 'Improved <script>alert(1)</script> conversion';
        writeJson('resume.json', resume);
      });

      expectRejection(result, ['data/resume.json', 'Brevo', 'bullets[0]', 'contains an HTML tag']);
    },
    BUILD_TIMEOUT
  );

  it(
    'site_config.json — a wrong type on columns names the category record',
    async () => {
      const result = await buildAfter(() => {
        const site = readJson('site_config.json') as {
          categories: { id: string; columns: unknown }[];
        };
        expect(site.categories.length).toBe(7);
        site.categories[2].columns = 'three';
        writeJson('site_config.json', site);
      });

      expectRejection(result, ['data/site_config.json', 'nature', 'columns', 'received "three"']);
    },
    BUILD_TIMEOUT
  );

  it(
    'projects.json — a literal component figure names the project and quotes the sentence',
    async () => {
      const result = await buildAfter(() => {
        const projects = readJson('projects.json') as { id: string; description: string }[];
        const index = projects.findIndex((project) => project.id === 'design-system');
        expect(index).toBeGreaterThanOrEqual(0);
        projects[index].description = 'An 81-component React library with semantic tokens.';
        writeJson('projects.json', projects);
      });

      expectRejection(result, [
        'data/projects.json',
        'design-system',
        'description',
        '{{ds.componentCount}}',
      ]);
    },
    BUILD_TIMEOUT
  );

  it(
    'a file that is not JSON at all is a finding, not a crash and not a skip',
    async () => {
      // A syntactically broken file never reaches a schema, so it produces no zod issue. Without
      // the read-failure branch in the gate it would produce no finding either.
      const result = await buildAfter(() => {
        writeFileSync(sandboxDataPath('portfolio_images.json'), '[{ "id": "oops", ]\n');
      });

      expectRejection(result, [
        'data/portfolio_images.json could not be read as JSON',
        'BUILD REFUSED',
      ]);
    },
    BUILD_TIMEOUT
  );

  it(
    'an emptied manifest is a failure, not a clean run over nothing',
    async () => {
      const result = await buildAfter(() => {
        writeFileSync(sandboxDataPath('portfolio_images.json'), '[]\n');
      });

      expectRejection(result, ['data/portfolio_images.json', 'holds no photos', '0 photo(s)']);
    },
    BUILD_TIMEOUT
  );
});

/* ==============================================================================================
 * The two enforcement points are independent. Both halves are asserted, because "there are two"
 * is worth nothing if one of them is the other one wearing a hat.
 * ============================================================================================ */

describe('the content collections enforce on their own, and cannot do the gate’s job', () => {
  /** Take the `content-gate` integration out of the sandbox config, and prove the edit landed. */
  function disableContentGate(): void {
    const config = readFileSync(path.join(sandbox, 'astro.config.mjs'), 'utf8');
    const without = config.replace(
      'integrations: [react(), contentGate],',
      'integrations: [react()],'
    );
    // If the string ever changes, this control would silently test the wired config instead — the
    // failure mode where a "negative control" proves the wrong thing.
    expect(without).not.toBe(config);
    expect(without).not.toContain('contentGate,');
    writeFileSync(path.join(sandbox, 'astro.config.mjs'), without);
  }

  it(
    'with the gate removed, the file() loader still refuses a wrong type and names the record',
    async () => {
      const result = await buildAfter(() => {
        disableContentGate();
        const photos = readJson('portfolio_images.json') as { id: string; order: unknown }[];
        photos[12].order = 'twelve';
        writeJson('portfolio_images.json', photos);
      });

      expectRejection(result, ['InvalidContentEntryDataError', 'nature-hillsandgreens', 'order']);
      // And it is genuinely the collection speaking, not the gate.
      expect(result.output).not.toContain('BUILD REFUSED');
    },
    BUILD_TIMEOUT
  );

  it(
    'with the gate removed, the typo’d category ships — which is why the gate exists',
    async () => {
      // This pins a MEASURED BLIND SPOT rather than a desirable behaviour. `PhotoSchema.category`
      // is `z.string()` by design (03-06: an enum here would be the second source of truth about
      // what a category is), so the collection cannot see this and the build goes green. If a
      // future change makes this case red, that is an improvement and this test is what will say
      // so — update it, do not delete it.
      const result = await buildAfter(() => {
        disableContentGate();
        const photos = readJson('portfolio_images.json') as { id: string; category: string }[];
        const index = photos.findIndex((photo) => photo.id === 'architecture-singapore');
        photos[index].category = 'archtecture';
        writeJson('portfolio_images.json', photos);
      });

      expect(result.output.length).toBeGreaterThan(0);
      expect(result.exitCode).toBe(0);
      expect(result.distEmitted).toBe(true);
    },
    BUILD_TIMEOUT
  );
});
