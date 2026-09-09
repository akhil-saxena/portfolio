import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

interface BuildResult {
  exitCode: number;
  output: string;
  distEmitted: boolean;
}

let sandbox = '';

const pristine = new Map<string, Buffer>();

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

function restoreSandbox(): void {
  for (const [relative, bytes] of pristine) {
    writeFileSync(path.join(sandbox, relative), bytes);
  }
}

async function runBuild(): Promise<BuildResult> {
  rmSync(path.join(sandbox, 'dist'), { recursive: true, force: true });
  let exitCode = 0;
  let output = '';
  try {
    const done = await execFileAsync(process.execPath, [ASTRO_BIN, 'build'], {
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
  let distEmitted = true;
  try {
    readFileSync(path.join(sandbox, 'dist', 'client', 'index.html'));
  } catch {
    distEmitted = false;
  }
  return { exitCode, output, distEmitted };
}

async function buildAfter(mutate: () => void): Promise<BuildResult> {
  try {
    mutate();
    return await runBuild();
  } finally {
    restoreSandbox();
  }
}

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
  const modules = path.join(sandbox, 'node_modules');
  mkdirSync(modules);
  for (const entry of readdirSync(path.join(REPO_ROOT, 'node_modules'))) {
    const from = path.join(REPO_ROOT, 'node_modules', entry);
    const to = path.join(modules, entry);
    if (entry === 'astro') cpSync(from, to, { recursive: true });
    else symlinkSync(from, to);
  }

  pristine.set('astro.config.mjs', readFileSync(path.join(sandbox, 'astro.config.mjs')));
  for (const name of CONTENT_FILES) {
    pristine.set(path.join('data', name), readFileSync(sandboxDataPath(name)));
    repoContent.set(name, digestOf(readFileSync(path.join(REPO_ROOT, 'data', name))));
  }
  expect(pristine.size).toBe(CONTENT_FILES.length + 1);
}, 120_000);

afterAll(() => {
  for (const [name, sha256] of repoContent) {
    expect(digestOf(readFileSync(path.join(REPO_ROOT, 'data', name)))).toBe(sha256);
  }
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

describe('a clean tree builds, and the gate says how much it looked at', () => {
  it(
    'exits 0, emits dist/, and reports a census of the sandbox manifest rather than a bare PASS',
    async () => {
      const result = await buildAfter(() => {});
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.exitCode).toBe(0);
      expect(result.distEmitted).toBe(true);

      expect(result.output).toContain('content set: PASS');

      const sandboxPhotos = readJson('portfolio_images.json') as unknown[];
      expect(Array.isArray(sandboxPhotos)).toBe(true);
      expect(sandboxPhotos.length).toBeGreaterThan(0);
      expect(result.output).toContain(`${sandboxPhotos.length} photo(s)`);
      const categoryCount = (readJson('site_config.json') as { categories: unknown[] }).categories
        .length;
      expect(categoryCount).toBeGreaterThan(0);
      expect(result.output).toContain(`${categoryCount} category record(s)`);
      expect(result.output).toContain('5 project(s)');
      expect(result.output).toContain('RI-1, RI-2, RI-3, RI-4, RI-5, RI-6');
    },
    BUILD_TIMEOUT
  );
});

describe('a malformed data file stops the build and names file, record and field', () => {
  it(
    'portfolio_images.json — a wrong type on order names the photograph, not just photos[12]',
    async () => {
      const result = await buildAfter(() => {
        const photos = readJson('portfolio_images.json') as { id: string; order: unknown }[];
        expect(photos[12].id).toBe('landscape-hillsandgreens');
        photos[12].order = 'twelve';
        writeJson('portfolio_images.json', photos);
      });

      expectRejection(result, [
        'data/portfolio_images.json',
        'landscape-hillsandgreens',
        'order',
        'received "twelve"',
      ]);
    },
    BUILD_TIMEOUT
  );

  it(
    'portfolio_images.json + site_config.json — a typo’d category is caught by nothing else',
    async () => {
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
      let mutatedCategoryId = '';
      const result = await buildAfter(() => {
        const site = readJson('site_config.json') as {
          categories: { id: string; columns: unknown }[];
        };
        expect(site.categories.length).toBeGreaterThan(2);
        site.categories[2].columns = 'three';
        mutatedCategoryId = site.categories[2].id;
        writeJson('site_config.json', site);
      });

      expect(mutatedCategoryId.length).toBeGreaterThan(0);
      expectRejection(result, [
        'data/site_config.json',
        mutatedCategoryId,
        'columns',
        'received "three"',
      ]);
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

describe('the content collections enforce on their own, and cannot do the gate’s job', () => {
  function disableContentGate(): void {
    const config = readFileSync(path.join(sandbox, 'astro.config.mjs'), 'utf8');

    const without = config.replace(/,\s*contentGate\b/, '');

    expect(without, 'the contentGate removal did not change the config').not.toBe(config);

    const integrations = without.match(/^\s*integrations:.*$/m)?.[0] ?? '';
    expect(integrations, 'no integrations line found in the sandbox config').not.toBe('');
    expect(integrations, 'contentGate is still in the integrations array').not.toContain(
      'contentGate'
    );

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

      expectRejection(result, [
        'InvalidContentEntryDataError',
        'landscape-hillsandgreens',
        'order',
      ]);
      expect(result.output).not.toContain('BUILD REFUSED');
    },
    BUILD_TIMEOUT
  );

  it(
    'with the gate removed, the typo’d category is caught by a THIRD instrument — not the collection',
    async () => {
      const result = await buildAfter(() => {
        disableContentGate();
        const photos = readJson('portfolio_images.json') as { id: string; category: string }[];
        const index = photos.findIndex((photo) => photo.id === 'architecture-singapore');
        photos[index].category = 'archtecture';
        writeJson('portfolio_images.json', photos);
      });

      expect(result.output.length).toBeGreaterThan(0);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain('photoSlug');
      expect(result.output).toContain('architecture-singapore');
      expect(result.output).not.toContain('BUILD REFUSED');
      expect(result.output).not.toContain('InvalidContentEntryDataError');
    },
    BUILD_TIMEOUT
  );
});
