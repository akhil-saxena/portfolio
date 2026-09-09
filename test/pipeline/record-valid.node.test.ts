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
];

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
  writeFileSync(sandboxData(MANIFEST), serialiseManifest(records as Photo[]));
};

function restoreSandbox(): void {
  for (const [relative, bytes] of pristine) writeFileSync(path.join(sandbox, relative), bytes);
}

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

function expectRejection(result: SyncResult, mustName: string[]): void {
  expect(result.output.length).toBeGreaterThan(0);
  expect(result.exitCode).not.toBe(0);
  expect(result.output).toContain('BUILD REFUSED');
  for (const needle of mustName) {
    expect(needle.length).toBeGreaterThan(0);
    expect(result.output).toContain(needle);
  }
}

const CATEGORY = 'landscape';
const SLUG = 'gateproof';
const ID = 'landscape-gateproof';
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
  for (const [name, sha256] of repoContent) {
    expect(digestOf(readFileSync(path.join(REPO_ROOT, 'data', name)))).toBe(sha256);
  }
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

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

      expect(expectedCount).toBeGreaterThan(0);
      expect(result.output).toContain(`${expectedCount} photo(s)`);
      expect(result.output).toContain('rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6');
      expect(result.output).not.toContain('rule NOT run');
    },
    SYNC_TIMEOUT
  );
});

describe('the gate refuses what the producer exists to prevent', () => {
  it(
    'DUPLICATE — appending the same record twice trips RI-5 twice and RI-6 once, by name',
    async () => {
      let planted: Photo | undefined;
      const result = await syncAfter(() => {
        const base = readManifest();
        const grown = upsertRecord(base, produce(base)) as Photo[];
        planted = grown.find((photo) => photo.id === ID) as Photo;
        writeManifest([...grown, planted]);
      });

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
      expect(result.output).toContain('rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6');
      expect(result.output).not.toContain('rule NOT run');
    },
    SYNC_TIMEOUT
  );

  it(
    'CASE-VARIANT CATEGORY — the producer refuses "Nature", and the SCHEMA catches it before RI-1',
    async () => {
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
      const result = await syncAfter(() => {
        writeManifest([]);
      });

      expectRejection(result, ['data/portfolio_images.json', 'holds no photos', '0 photo(s)']);
    },
    SYNC_TIMEOUT
  );
});

describe('what the content gate structurally cannot see', () => {
  it(
    'a schema-valid record whose four R2 objects DO NOT EXIST passes at exit 0 — and that is why 04-03 exists',
    async () => {
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
