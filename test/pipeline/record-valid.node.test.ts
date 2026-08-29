/**
 * The produced record, run through the REAL Phase 3 content gate. (Plan 04-05, Task 3.)
 *
 * WHY A UNIT TEST OF `PhotoSchema.safeParse` IS NOT THIS
 * -----------------------------------------------------
 * `test/pipeline/idempotence.unit.test.ts` asserts the produced record satisfies `PhotoSchema`.
 * That proves the per-record shape and NOTHING about the six referential-integrity rules — and
 * RI-5 (a duplicate id or a duplicate global `order`) and RI-6 (a `categoryOrder` collision) are
 * precisely what a duplicate append or a wrong rank breaks. Those rules live in
 * `src/schemas/content-set.ts`, they are wired into the build by the `astro:config:done` hook in
 * `astro.config.mjs`, and the only way to prove they ran is to run them.
 *
 * `astro sync`, NOT `astro build`. Measured in 04-RESEARCH §6 and again here: `sync` fires the same
 * `astro:config:done` hook, so it runs all five per-file schemas and all six RI rules, exits 1 on a
 * violation, and needs **no `.env`/`.dev.vars`** — `astro build` exits 1 without them at
 * `validatePublicVariables`, which would make every case below fail for a reason that has nothing
 * to do with content.
 *
 * THE THREE TRAPS THIS FILE IS WRITTEN AGAINST
 * -------------------------------------------
 * 1. A NON-ZERO EXIT IS NOT A REJECTION. `build-fails-loudly.node.test.ts` records the measurement:
 *    a wrong binary path exited 1 with `Cannot find module` and no build ever ran. A case asserting
 *    only `exitCode !== 0` is green in exactly that state. So every negative case asserts the output
 *    is non-empty AND names the file, the record and the field — three strings a broken spawn
 *    cannot produce — and the POSITIVE case runs first, because a sandbox that fails every run
 *    satisfies every negative assertion below it.
 * 2. ARGV IS AN ARRAY, NEVER A STRING. Passing `"astro sync"` as ONE argv element produced a
 *    spurious 245 ms "failure" during research: the interactive shell here is zsh, which does not
 *    word-split an unquoted variable. `execFile` with `[ASTRO_BIN, 'sync']` cannot make that
 *    mistake.
 * 3. A WORKTREE COPIED WITHOUT ITS HISTORY FABRICATES FAILURES, and a symlinked `src` breaks Astro
 *    outright — it resolves module paths through the symlink's real path and then cannot match them
 *    against its own compile metadata. `build-fails-loudly` wrote that down because the failure
 *    looked like a content problem and was not. The `COPIED` list below is that file's, unchanged.
 *
 * WHY IT SANDBOXES INSTEAD OF MUTATING `data/`
 * -------------------------------------------
 * `data/portfolio_images.json` is reviewed content. Vitest runs the projects concurrently and
 * several unit files read it at import time, so a mutation here could fail a test in another
 * project for a reason unrelated to that test — a flaky gate is a gate people learn to re-run. Each
 * case mutates a disposable copy, and `afterAll` asserts by SHA-256 that the repository's own
 * `data/` was never a participant. The isolation is the primary claim; the restore is the belt.
 *
 * FILENAME CONTRACT: `*.node.test.ts` — it runs in the `integration` project. The three Vitest
 * globs are mutually exclusive and a file matching none is silently never run.
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildRecord, serialiseManifest, upsertRecord } from '../../scripts/lib/photo-record.mjs';
import type { Photo } from '../../src/schemas';
import { appendFortieth } from './fixtures/fortieth-photo';

const execFileAsync = promisify(execFile);

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ASTRO_BIN = path.join(REPO_ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');

/** Everything the gate reads. Copied, not linked — see trap 3 in the header. */
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
  '.dev.vars',
  '.env',
];

/** The five committed content files. FIVE — `projects.json` is the one that gets forgotten. */
const CONTENT_FILES = [
  'portfolio_images.json',
  'site_config.json',
  'home_config.json',
  'projects.json',
  'resume.json',
];

const MANIFEST = 'portfolio_images.json';
const SYNC_TIMEOUT = 180_000;

interface SyncResult {
  exitCode: number;
  output: string;
}

let sandbox = '';
const pristine = new Map<string, Buffer>();
const repoContent = new Map<string, string>();

const digestOf = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const sandboxData = (name: string): string => path.join(sandbox, 'data', name);
const readManifest = (): Photo[] => JSON.parse(readFileSync(sandboxData(MANIFEST), 'utf8'));
const writeManifest = (records: unknown[]): void => {
  // Written through the producer's own serialiser, so the sandbox file carries the same trailing
  // newline the committed one does and a diff of this write would be one record, not the file.
  writeFileSync(sandboxData(MANIFEST), serialiseManifest(records as Photo[]));
};

function restoreSandbox(): void {
  for (const [relative, bytes] of pristine) writeFileSync(path.join(sandbox, relative), bytes);
}

/**
 * Run a real `astro sync` in the sandbox. ARGV AS SEPARATE ARRAY ELEMENTS — see trap 2.
 *
 * `execFile` on the astro entrypoint rather than `npx`: `npx` resolves a binary, could silently
 * fetch one, and its own non-zero exits are indistinguishable from the gate's.
 */
async function runSync(): Promise<SyncResult> {
  let exitCode = 0;
  let output = '';
  try {
    const done = await execFileAsync(process.execPath, [ASTRO_BIN, 'sync'], {
      cwd: sandbox,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
        // Each sandbox gets its OWN Vite cache. It symlinks the real `node_modules`, so
        // without this every sandbox pre-bundles into the SAME `node_modules/.vite` and
        // they race on `renameSync(deps_ssr_temp_<hash> -> deps_ssr)`. See astro.config.mjs.
        PORTFOLIO_VITE_CACHE_DIR: path.join(sandbox, '.vite'),
      },
    });
    output = `${done.stdout}${done.stderr}`;
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    exitCode = typeof failure.code === 'number' ? failure.code : 1;
    output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
  }
  return { exitCode, output };
}

async function syncAfter(mutate: () => void): Promise<SyncResult> {
  try {
    mutate();
    return await runSync();
  } finally {
    restoreSandbox();
  }
}

/** A rejection is a non-zero exit whose output NAMES the thing that was wrong. */
function expectRejection(result: SyncResult, mustName: string[]): void {
  // Length before content: `expect('').toContain('')` passes, and an empty capture has nothing to
  // search. This ordering is `build-fails-loudly`'s and it is here for the same reason.
  expect(result.output.length).toBeGreaterThan(0);
  expect(result.exitCode).not.toBe(0);
  expect(result.output).toContain('BUILD REFUSED');
  for (const needle of mustName) {
    expect(needle.length).toBeGreaterThan(0);
    expect(result.output).toContain(needle);
  }
}

/* ==============================================================================================
 * The record under test, produced by the module this plan ships.
 * ============================================================================================ */

const CATEGORY = 'nature';
const SLUG = 'gateproof';
const ID = 'nature-gateproof';
const THUMB_URI = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

const assetsFor = (version: string) => ({
  slug: SLUG,
  variants: {
    original: { bytes: new TextEncoder().encode(`original-${version}`) },
    large: { bytes: new TextEncoder().encode(`large-${version}`) },
    medium: { bytes: new TextEncoder().encode(`medium-${version}`) },
    small: { bytes: new TextEncoder().encode(`small-${version}`) },
  },
  thumb: THUMB_URI,
  dimensions: { width: 4608, height: 3072 },
  exif: {
    camera: 'NIKON CORPORATION NIKON D5300',
    lens: '18.0-55.0 mm f/3.5-5.6',
    aperture: 'f/8',
    shutter: '1/250',
    iso: 100,
    focalLength: '35mm',
  },
});

const produce = (manifest: readonly Photo[], version = 'v1'): Photo =>
  buildRecord({
    inputs: {
      temp_key: 'temp/gateproof.jpg',
      category: CATEGORY,
      title: 'Gate Proof',
      alt: 'A line of bare trees stands in shallow floodwater with the far bank lost in white haze.',
    },
    assets: assetsFor(version),
    date: '2026-08-27',
    manifest,
  }) as Photo;

beforeAll(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), 'gsd-record-valid-'));
  for (const entry of COPIED) {
    cpSync(path.join(REPO_ROOT, entry), path.join(sandbox, entry), { recursive: true });
  }
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(sandbox, 'node_modules'));

  for (const name of CONTENT_FILES) {
    pristine.set(path.join('data', name), readFileSync(sandboxData(name)));
    repoContent.set(name, digestOf(readFileSync(path.join(REPO_ROOT, 'data', name))));
  }
  expect(pristine.size).toBe(CONTENT_FILES.length);
}, 120_000);

afterAll(() => {
  // The claim this suite rests on: the repository's own reviewed content was never a participant.
  for (const [name, sha256] of repoContent) {
    expect(digestOf(readFileSync(path.join(REPO_ROOT, 'data', name)))).toBe(sha256);
  }
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

/* ==============================================================================================
 * 1. PASS ON CORRECT INPUT — first, because it is what makes every negative case mean anything.
 * ============================================================================================ */

describe('a record this plan produces passes the real gate', () => {
  it(
    'upserted into the sandbox manifest, astro sync exits 0 and reports a census of what it read',
    async () => {
      let expectedCount = 0;
      const result = await syncAfter(() => {
        const grown = upsertRecord(readManifest(), produce(readManifest())) as Photo[];
        expectedCount = grown.length;
        writeManifest(grown);
      });

      expect(result.output.length).toBeGreaterThan(0);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('content set: PASS');

      // ANTI-VACUITY, and the count is DERIVED from the file the gate actually read. `39 photo(s)`
      // was one of the 15 assertions that redded at 40 records; a literal here would put the same
      // trap back one photograph further along.
      expect(expectedCount).toBeGreaterThan(0);
      expect(result.output).toContain(`${expectedCount} photo(s)`);
      expect(result.output).toContain('rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6');
      // A rule that did not run did not pass. Nothing may be skipped on the clean path.
      expect(result.output).not.toContain('rule NOT run');
    },
    SYNC_TIMEOUT
  );
});

/* ==============================================================================================
 * 2-5. PLANTED DEFECTS. Every gate in this phase must be proven able to fail.
 * ============================================================================================ */

describe('the gate refuses what the producer exists to prevent', () => {
  it(
    'DUPLICATE — appending the same record twice trips RI-5 twice and RI-6 once, by name',
    async () => {
      // The upsert is what prevents this. Here it is bypassed deliberately, so the safety net
      // underneath it is measured rather than assumed — and the measurement shows the net fires
      // only AFTER the file is on disk, which is why idempotence is decided in the producer.
      let planted: Photo | undefined;
      const result = await syncAfter(() => {
        const base = readManifest();
        const grown = upsertRecord(base, produce(base)) as Photo[];
        planted = grown.find((photo) => photo.id === ID) as Photo;
        writeManifest([...grown, planted]);
      });

      // The rank values are DERIVED from the record that was actually planted, so this keeps
      // working as the corpus grows past 40.
      expect(planted).toBeDefined();
      expectRejection(result, [
        'data/portfolio_images.json',
        '[RI-5]',
        `duplicate photo id "${ID}"`,
        `duplicate global order value ${(planted as unknown as Photo).order}`,
        '[RI-6]',
        `categoryOrder ${(planted as unknown as Photo).categoryOrder} is used by ${ID} and ${ID}`,
      ]);
    },
    SYNC_TIMEOUT
  );

  it(
    'UNDECLARED CATEGORY — a lowercase slug no site_config id matches trips RI-1, by name',
    async () => {
      // The case the whole content gate exists for. "archtecture" is a perfectly valid lowercase
      // slug, so no per-file schema can see it; ADR-002 §4 deleted /admin/site on the strength of
      // the rule that can. The producer cannot emit this either — the category is a dispatch input
      // and 04-08 validates it against the real id set — but a hand edit still can.
      const result = await syncAfter(() => {
        const base = readManifest();
        const grown = upsertRecord(base, produce(base)) as Photo[];
        writeManifest(
          grown.map((photo) => (photo.id === ID ? { ...photo, category: 'archtecture' } : photo))
        );
      });

      expectRejection(result, [
        '[RI-1]',
        'data/portfolio_images.json',
        ID,
        'category "archtecture" does not exist in data/site_config.json',
        'no case transform on either side',
      ]);
      // RI-1 genuinely RAN here — this is a finding, not a suppressed census.
      expect(result.output).toContain('rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6');
      expect(result.output).not.toContain('rule NOT run');
    },
    SYNC_TIMEOUT
  );

  it(
    'CASE-VARIANT CATEGORY — the producer refuses "Nature", and the SCHEMA catches it before RI-1',
    async () => {
      // The producer cannot emit this: `photoIdFor` asserts the same /^[a-z0-9-]+$/ the schema
      // does, so a capitalised category throws before a byte is derived.
      expect(() =>
        buildRecord({
          inputs: {
            temp_key: 'temp/gateproof.jpg',
            category: 'Nature',
            title: 'Gate Proof',
            alt: 'A line of bare trees stands in shallow floodwater with the far bank lost in white haze.',
          },
          assets: assetsFor('v1'),
          date: '2026-08-27',
          manifest: [],
        })
      ).toThrow(/category/);

      // MEASURED, AND IT CONTRADICTS THIS PLAN'S TASK 3. `04-05-PLAN.md` says the case-variant
      // "Nature" is what "RI-1 must reject because the comparison applies no case transform".
      // It never reaches RI-1: `PhotoSchema.category` carries `.regex(/^[a-z0-9-]+$/)`, so the
      // PER-FILE SCHEMA refuses it first, and a schema failure SUPPRESSES the RI census — RI-1 is
      // then listed as `rule NOT run`. Both refusals are correct; only the attribution in the plan
      // is wrong. The rule that genuinely needs a case-sensitive comparison is exercised by the
      // preceding test, with a lowercase slug the schema cannot fault.
      const result = await syncAfter(() => {
        const base = readManifest();
        const grown = upsertRecord(base, produce(base)) as Photo[];
        writeManifest(
          grown.map((photo) => (photo.id === ID ? { ...photo, category: 'Nature' } : photo))
        );
      });

      expectRejection(result, [
        '[SCHEMA-photos]',
        'data/portfolio_images.json',
        ID,
        'category must be a lowercase slug',
        'received "Nature"',
        'rule NOT run: RI-1',
        'It did NOT pass.',
      ]);
      expect(result.output).toContain('rules run: RI-4');
    },
    SYNC_TIMEOUT
  );

  it(
    'LEGACY SHAPE — tags, no alt, no categoryOrder; and a schema failure SUPPRESSES the RI census',
    async () => {
      // Exactly what `04-RESEARCH.md` §6 planted: the legacy `processImage()` output. Worth
      // pinning, because the consequence is counter-intuitive — a green RI line is not evidence
      // when the schema is red, because the rules never ran at all.
      const result = await syncAfter(() => {
        const base = readManifest();
        const legacy = {
          id: ID,
          title: 'Gate Proof',
          category: CATEGORY,
          date: '2026-08-27',
          tags: [],
          exif: {
            camera: null,
            lens: null,
            aperture: null,
            shutter: null,
            iso: null,
            focalLength: null,
          },
          urls: {
            original: `https://images.akhilsaxena.com/photos/${CATEGORY}/${SLUG}.webp`,
            large: `https://images.akhilsaxena.com/photos/${CATEGORY}/${SLUG}-lg.webp`,
            medium: `https://images.akhilsaxena.com/photos/${CATEGORY}/${SLUG}-md.webp`,
            small: `https://images.akhilsaxena.com/photos/${CATEGORY}/${SLUG}-sm.webp`,
            thumb: THUMB_URI,
          },
          order: base.length + 1,
          dimensions: { width: 4608, height: 3072 },
        };
        writeManifest([...base, legacy]);
      });

      expectRejection(result, [
        'data/portfolio_images.json',
        ID,
        '→ alt: Invalid input: expected string, received undefined',
        '→ categoryOrder: Invalid input: expected number, received undefined',
        'OD-3: `tags` is dropped',
        'received []',
        'did not satisfy its own schema',
        'It did NOT pass.',
      ]);

      // MEASURED, AND IT REFINES THIS PLAN'S TASK 3, which says the output shows "every RI rule
      // listed as not run". FIVE of the six are. RI-4 RUNS, because it compares
      // home_config.peekPositions against home_config.peekIds and needs no photograph at all — see
      // `if (home)` in src/schemas/content-set.ts. Asserting "every" would have been asserting a
      // behaviour the gate does not have.
      for (const rule of ['RI-1', 'RI-2', 'RI-3', 'RI-5', 'RI-6']) {
        expect(result.output).toContain(`rule NOT run: ${rule}`);
      }
      expect(result.output).toContain('rules run: RI-4');
      expect(result.output).not.toContain('rule NOT run: RI-4');
    },
    SYNC_TIMEOUT
  );

  it(
    'NOTHING TO CHECK — an emptied manifest is a failure, not a clean run over nothing',
    async () => {
      // `PhotoManifestSchema` carries `.min(1)` precisely so that zero records is refused. The
      // message is asserted, not just the code: `0 === 0` is arithmetically true and is the shape
      // of every gate this project has shipped that could not fail.
      const result = await syncAfter(() => {
        writeManifest([]);
      });

      expectRejection(result, ['data/portfolio_images.json', 'holds no photos', '0 photo(s)']);
    },
    SYNC_TIMEOUT
  );
});

/* ==============================================================================================
 * 6. THE WALK-THROUGH. The measured hole this whole phase turns on.
 * ============================================================================================ */

describe('what the content gate structurally cannot see', () => {
  it(
    'a schema-valid record whose four R2 objects DO NOT EXIST passes at exit 0 — and that is why 04-03 exists',
    async () => {
      // THIS ASSERTS EXIT 0 ON PURPOSE. `astro sync` opens no socket; it validates shapes and
      // cross-references, and a URL that 404s is the same string as a URL that 200s.
      // `gate:origin` cannot see it either — it checks each URL's ORIGIN, never its liveness.
      //
      // A test that quietly expected exit 1 here would be asserting a behaviour the build does not
      // have, and would go green the day someone "fixed" it by breaking something else. So the hole
      // is documented rather than pretended away.
      //
      // THE CLOSURE IS `scripts/verify-photo-urls.mjs` (plan 04-03), which 04-09 runs as step 8 —
      // between the upload and the commit — so a record can only be committed once the bytes it
      // addresses are provably live.
      //
      // The record is 04-01's `FORTIETH_PHOTO`, used HERE IN A SANDBOX and nowhere else: its own
      // first assertion is that the committed manifest does not contain it, so committing this
      // fixture's output would fail four of that file's assertions BY DESIGN. Its four URLs point
      // at `photos/nature/fortiethproof*.webp`, which was never uploaded to anything.
      let expectedCount = 0;
      const result = await syncAfter(() => {
        const grown = appendFortieth(readManifest());
        expectedCount = grown.length;
        writeManifest(grown);
      });

      expect(result.output.length).toBeGreaterThan(0);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('content set: PASS');
      expect(expectedCount).toBeGreaterThan(0);
      expect(result.output).toContain(`${expectedCount} photo(s)`);
      expect(result.output).toContain('rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6');
    },
    SYNC_TIMEOUT
  );
});
