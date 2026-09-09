import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  assembleTargets,
  checkTarget,
  parseArgv,
  RETRYABLE_STATUSES,
  readManifest,
  VerifierRefusal,
} from '../../scripts/verify-photo-urls.mjs';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../../src/lib/image-origin.ts';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MANIFEST_PATH = join(REPO_ROOT, 'data/portfolio_images.json');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts/verify-photo-urls.mjs');

interface PhotoUrls {
  original: string;
  large: string;
  medium: string;
  small: string;
  thumb: string;
}
interface Photo {
  id: string;
  category: string;
  urls: PhotoUrls;
}

const manifest: Photo[] = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

const MIN_RECORDS = 30;

function expectedTargets(records: Photo[]): { id: string; key: string; url: string }[] {
  const out: { id: string; key: string; url: string }[] = [];
  for (const record of records) {
    for (const key of REMOTE_URL_KEYS) {
      out.push({ id: record.id, key, url: record.urls[key as keyof PhotoUrls] });
    }
  }
  return out;
}

function makeRecord(id: string, overrides: Partial<PhotoUrls> = {}): Photo {
  const [category, slug] = id.split('-');
  return {
    id,
    category,
    urls: {
      original: `${IMAGE_ORIGIN}/photos/${category}/${slug}.webp`,
      large: `${IMAGE_ORIGIN}/photos/${category}/${slug}-lg.webp`,
      medium: `${IMAGE_ORIGIN}/photos/${category}/${slug}-md.webp`,
      small: `${IMAGE_ORIGIN}/photos/${category}/${slug}-sm.webp`,
      thumb: 'data:image/webp;base64,UklGRhICAABXRUJQ',
      ...overrides,
    },
  };
}

let fetchCalls = 0;
const realFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = ((...args: unknown[]) => {
    fetchCalls++;
    throw new Error(`no test in this file may make a request. Attempted: ${String(args[0])}`);
  }) as typeof globalThis.fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

afterEach(() => {
  expect(fetchCalls, 'a test in this network-free file issued a request').toBe(0);
});

describe('the corpus this file reasons about', () => {
  it('is a non-empty array of at least the floor, so nothing below is vacuous', () => {
    expect(Array.isArray(manifest)).toBe(true);
    expect(manifest.length).toBeGreaterThanOrEqual(MIN_RECORDS);
  });
});

describe('target assembly over the committed manifest', () => {
  it('assembles exactly manifest.length x REMOTE_URL_KEYS.length targets', () => {
    const targets = assembleTargets(manifest, { manifestPath: MANIFEST_PATH });
    expect(REMOTE_URL_KEYS.length).toBe(4);
    expect(targets.length).toBe(manifest.length * 4);
    expect(targets.length).toBe(expectedTargets(manifest).length);
  });

  it('assembles the same { id, key, url } list an independent walk of the manifest produces', () => {
    const targets = assembleTargets(manifest, { manifestPath: MANIFEST_PATH });
    expect(targets).toEqual(expectedTargets(manifest));
  });

  it('gives every target an origin of exactly IMAGE_ORIGIN', () => {
    const targets = assembleTargets(manifest, { manifestPath: MANIFEST_PATH });
    const origins = new Set(targets.map((t) => new URL(t.url).origin));
    expect([...origins]).toEqual([IMAGE_ORIGIN]);
  });

  it('keeps a directory segment in every pathname — a basename rewrite would 404 plausibly', () => {
    const targets = assembleTargets(manifest, { manifestPath: MANIFEST_PATH });
    const byId = new Map(manifest.map((r) => [r.id, r]));
    const dirsById = new Map<string, Set<string>>();

    for (const target of targets) {
      expect(byId.get(target.id), `no record for ${target.id}`).toBeTruthy();
      const segments = new URL(target.url).pathname.split('/').filter(Boolean);
      expect(segments[0]).toBe('photos');
      expect(segments).toHaveLength(3);
      expect(segments[1]).toMatch(/^[a-z][a-z0-9-]*$/);
      if (!dirsById.has(target.id)) dirsById.set(target.id, new Set());
      (dirsById.get(target.id) as Set<string>).add(segments[1] as string);
    }

    expect(dirsById.size).toBeGreaterThan(0);
    const split = [...dirsById.entries()].filter(([, dirs]) => dirs.size !== 1);
    expect(split.map(([id, dirs]) => `${id} → ${[...dirs].join(', ')}`)).toEqual([]);

    const drifted = [...dirsById.entries()].filter(
      ([id, dirs]) => !dirs.has(byId.get(id)?.category as string)
    );
    process.stdout.write(
      `[verify-photo-urls] ${dirsById.size} record(s), each under one directory; ` +
        `${drifted.length} whose directory is no longer their category (the re-author, expected)\n`
    );
  });
});

describe('thumb is excluded by construction, not by a filter', () => {
  it('REMOTE_URL_KEYS does not contain thumb', () => {
    expect([...REMOTE_URL_KEYS]).not.toContain('thumb');
  });

  it('every record HAS a thumb that a naive "skip what is not a URL" filter would have included', () => {
    let checked = 0;
    for (const record of manifest) {
      expect(typeof record.urls.thumb, `${record.id}.thumb`).toBe('string');
      expect(record.urls.thumb.startsWith('data:image/webp;base64,')).toBe(true);
      const parsed = new URL(record.urls.thumb);
      expect(parsed.protocol).toBe('data:');
      checked++;
    }
    expect(checked).toBe(manifest.length);
    expect(checked).toBeGreaterThanOrEqual(MIN_RECORDS);
  });

  it('no assembled target is a data: URI', () => {
    const targets = assembleTargets(manifest, { manifestPath: MANIFEST_PATH });
    expect(targets.filter((t) => t.url.startsWith('data:'))).toEqual([]);
  });
});

describe('the floors — "nothing to check" is a refusal, never a pass', () => {
  it('refuses an empty manifest rather than reporting zero targets as fine', () => {
    expect(() => assembleTargets([], { manifestPath: '/tmp/empty.json' })).toThrow(VerifierRefusal);
    let message = '';
    try {
      assembleTargets([], { manifestPath: '/tmp/empty.json' });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('0 records');
  });

  it('refuses a non-array manifest', () => {
    expect(() => assembleTargets({} as never, {})).toThrow(VerifierRefusal);
  });

  it('refuses a record whose remote key is missing, naming the record and the key', () => {
    const record = makeRecord('landscape-example');
    delete (record.urls as Partial<PhotoUrls>).medium;
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('landscape-example.medium');
    expect(message).toContain('missing or not a string');
  });

  it('refuses an unparseable URL, naming the record and the key', () => {
    const record = makeRecord('landscape-example', { large: 'not a url at all' });
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('landscape-example.large');
    expect(message).toContain('not a parseable URL');
  });
});

describe('the origin check fires before any request (T-04-10)', () => {
  it('reports a foreign origin as a finding and does not fetch it', () => {
    const record = makeRecord('landscape-example', {
      original: 'https://evil.example.com/photos/landscape/example.webp',
    });
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('landscape-example.original');
    expect(message).toContain('https://evil.example.com');
    expect(message).toContain(IMAGE_ORIGIN);
    expect(message).toContain('not requested');
  });

  it('reports a data: URI planted in a REMOTE key as a foreign origin, not as a target', () => {
    const record = makeRecord('landscape-example', {
      original: 'data:image/webp;base64,UklGRhICAABXRUJQ',
    });
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('landscape-example.original');
    expect(message).toContain('not requested');
  });
});

describe('--only, whose refusal 04-10 depends on', () => {
  it('produces exactly 4 targets for an id that exists', () => {
    const id = manifest[0].id;
    const targets = assembleTargets(manifest, { only: id, manifestPath: MANIFEST_PATH });
    expect(targets.length).toBe(REMOTE_URL_KEYS.length);
    expect(targets.length).toBe(4);
    expect(new Set(targets.map((t) => t.id))).toEqual(new Set([id]));
    expect(targets).toEqual(expectedTargets([manifest[0]]));
  });

  it('refuses an id that matches no record, naming the id', () => {
    const unknown = 'a-photo-id-that-does-not-exist';
    let message = '';
    let threw = false;
    try {
      assembleTargets(manifest, { only: unknown, manifestPath: MANIFEST_PATH });
    } catch (error) {
      threw = true;
      message = (error as Error).message;
    }
    expect(threw).toBe(true);
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain(unknown);
    expect(message).toContain('matched no record');
  });

  it('refuses an id that is a PREFIX of a real id, so matching is exact', () => {
    const real = manifest[0].id;
    const prefix = real.slice(0, real.length - 1);
    expect(prefix).not.toBe(real);
    expect(() => assembleTargets(manifest, { only: prefix })).toThrow(VerifierRefusal);
  });
});

describe('readManifest names the path in every refusal', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'verify-photo-urls-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses a missing file', () => {
    const missing = join(dir, 'absent.json');
    let message = '';
    try {
      readManifest(missing);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain(missing);
    expect(message).toContain('nothing to check');
  });

  it('refuses invalid JSON', () => {
    const broken = join(dir, 'broken.json');
    writeFileSync(broken, '[{"id": ');
    let message = '';
    try {
      readManifest(broken);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain(broken);
    expect(message).toContain('not valid JSON');
  });

  it('refuses a non-array top level', () => {
    const object = join(dir, 'object.json');
    writeFileSync(object, '{"photos": []}');
    let message = '';
    try {
      readManifest(object);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain(object);
    expect(message).toContain('not a top-level array');
  });

  it('reads an empty array successfully — and assembly is what refuses it', () => {
    const empty = join(dir, 'empty.json');
    writeFileSync(empty, '[]');
    expect(readManifest(empty)).toEqual([]);
    expect(() => assembleTargets(readManifest(empty), { manifestPath: empty })).toThrow(
      VerifierRefusal
    );
  });
});

describe('the argv contract, including the HEAD/GET rule', () => {
  it('defaults to HEAD and asserts nothing about cache-control', () => {
    const parsed = parseArgv([]);
    expect(parsed.mode.method).toBe('HEAD');
    expect(parsed.mode.assertCacheControl).toBe(false);
    expect(parsed.manifestArg).toBe('./data/portfolio_images.json');
    expect(parsed.only).toBe(null);
    expect(parsed.concurrency).toBeGreaterThan(0);
  });

  it('--cache switches the METHOD to GET as part of the same decision', () => {
    const parsed = parseArgv(['--cache']);
    expect(parsed.mode.method).toBe('GET');
    expect(parsed.mode.assertCacheControl).toBe(true);
  });

  it('makes "assert cache-control over HEAD" unrepresentable', () => {
    for (const argv of [[], ['--cache']]) {
      const { mode } = parseArgv(argv);
      if (mode.assertCacheControl) expect(mode.method).toBe('GET');
    }
  });

  it('takes a manifest path positionally and an id after --only', () => {
    const parsed = parseArgv(['some/other.json', '--only', 'landscape-example']);
    expect(parsed.manifestArg).toBe('some/other.json');
    expect(parsed.only).toBe('landscape-example');
  });

  it('refuses --only with no id, so the flag cannot silently widen the scope', () => {
    expect(() => parseArgv(['--only'])).toThrow(VerifierRefusal);
    expect(() => parseArgv(['--only', '--cache'])).toThrow(VerifierRefusal);
  });

  it('refuses an unknown flag rather than ignoring it', () => {
    let message = '';
    try {
      parseArgv(['--onlyy', 'landscape-example']);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('--onlyy');
  });

  it('refuses a non-positive or non-integer --concurrency', () => {
    expect(() => parseArgv(['--concurrency', '0'])).toThrow(VerifierRefusal);
    expect(() => parseArgv(['--concurrency', '-1'])).toThrow(VerifierRefusal);
    expect(() => parseArgv(['--concurrency', 'eight'])).toThrow(VerifierRefusal);
    expect(parseArgv(['--concurrency', '3']).concurrency).toBe(3);
  });

  it('refuses two manifest paths', () => {
    expect(() => parseArgv(['a.json', 'b.json'])).toThrow(VerifierRefusal);
  });
});

describe('the retry path cannot mask a real failure', () => {
  const respond = (status: number, headers: Record<string, string> = {}) => ({
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    arrayBuffer: async () => new ArrayBuffer(0),
  });

  const TARGET = {
    id: 'landscape-example',
    key: 'medium',
    url: `${IMAGE_ORIGIN}/photos/landscape/example-md.webp`,
  };
  const HEAD_MODE = parseArgv([]).mode;
  const NO_WAIT = { backoffMs: 0 };

  async function withFetch(
    queue: ReturnType<typeof respond>[],
    run: () => Promise<string | null>
  ): Promise<{ result: string | null; calls: number }> {
    const spy = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return queue.shift() ?? respond(500);
    }) as unknown as typeof globalThis.fetch;
    try {
      const result = await run();
      return { result, calls };
    } finally {
      globalThis.fetch = spy;
    }
  }

  it('retries a 502 and reports the eventual 200 as a pass', async () => {
    const { result, calls } = await withFetch(
      [respond(502), respond(200, { 'content-type': 'image/webp' })],
      () => checkTarget(TARGET, HEAD_MODE, NO_WAIT)
    );
    expect(calls).toBe(2);
    expect(result).toBe(null);
  });

  it('reports a 502 that persists across all attempts, saying how many it tried', async () => {
    const { result, calls } = await withFetch([respond(502), respond(502), respond(502)], () =>
      checkTarget(TARGET, HEAD_MODE, NO_WAIT)
    );
    expect(calls).toBe(3);
    expect(result).not.toBe(null);
    expect(String(result).length).toBeGreaterThan(0);
    expect(String(result)).toContain('landscape-example.medium');
    expect(String(result)).toContain('HTTP 502');
    expect(String(result)).toContain('after 3 attempts');
    expect(String(result)).toContain(TARGET.url);
  });

  it('does NOT retry a 404 — the defect this gate exists to catch is reported at once', async () => {
    const { result, calls } = await withFetch([respond(404, { 'content-type': 'text/html' })], () =>
      checkTarget(TARGET, HEAD_MODE, NO_WAIT)
    );
    expect(calls).toBe(1);
    expect(String(result)).toContain('HTTP 404');
    expect(String(result)).not.toContain('after');
    expect(RETRYABLE_STATUSES.has(404)).toBe(false);
  });

  it('does NOT retry a 200 with the wrong content-type, and names the type it got', async () => {
    const { result, calls } = await withFetch(
      [respond(200, { 'content-type': 'text/plain; charset=utf-8' })],
      () => checkTarget(TARGET, HEAD_MODE, NO_WAIT)
    );
    expect(calls).toBe(1);
    expect(String(result)).toContain('text/plain');
    expect(String(result)).toContain('is not image/webp');
  });

  it('retries only statuses that mean "ask again", and 404/403/410 are not among them', () => {
    for (const status of [400, 401, 403, 404, 410, 451]) {
      expect(RETRYABLE_STATUSES.has(status), `${status} must not be retried`).toBe(false);
    }
    for (const status of [429, 500, 502, 503, 504]) {
      expect(RETRYABLE_STATUSES.has(status), `${status} should be retried`).toBe(true);
    }
  });
});

describe('the CLI exit contract on refusals', () => {
  const run = (args: string[]) => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    return { status: result.status, stderr: result.stderr ?? '', stdout: result.stdout ?? '' };
  };

  it('exits 1 naming the path when the manifest does not exist', () => {
    const missing = join(tmpdir(), 'no-such-manifest-04-03.json');
    const { status, stderr } = run([missing]);
    expect(stderr.length).toBeGreaterThan(0);
    expect(status).toBe(1);
    expect(stderr).toContain(missing);
    expect(stderr).toContain('nothing to check');
  });

  it('exits 1 naming the id when --only matches no record', () => {
    const { status, stderr, stdout } = run(['--only', 'a-photo-id-that-does-not-exist']);
    expect(stderr.length).toBeGreaterThan(0);
    expect(status).toBe(1);
    expect(stderr).toContain('a-photo-id-that-does-not-exist');
    expect(stderr).toContain('matched no record');
    expect(stdout).not.toContain('PASS');
  });
});
