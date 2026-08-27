/**
 * The network-free half of the PIPE-04 liveness verifier's proof (plan 04-03).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * `scripts/verify-photo-urls.mjs` is the only thing in this repository that can see a manifest
 * which LIES ABOUT THE BUCKET — a fully schema-valid record whose four R2 objects do not exist.
 * `04-RESEARCH.md` §6 measured that hole by planting one: `npx astro sync` exits 0 reporting
 * `PASS · 40 photo(s) · RI-1…RI-6`, and `gate:origin` passes too, because it validates each URL's
 * ORIGIN and never its liveness.
 *
 * The half of that verifier which needs a live CDN is proven by running it (plan 04-03 Task 3
 * records the four-step defect-planting proof verbatim in its SUMMARY). This file proves the other
 * half — TARGET ASSEMBLY, THE FLOORS AND THE ARGV CONTRACT — with no socket opened at all, so it
 * can run in CI, on a plane, and in the same second as everything else in the `unit` project.
 *
 * The floors are the point. The verifier's URL count is DERIVED (`records.length *
 * REMOTE_URL_KEYS.length`) rather than asserted against a constant, because it has to keep working
 * as the corpus grows past the 39 records `migrate-photo-origin.mjs --verify` is pinned to. A
 * derived count is only safe if "nothing to check" is a refusal: `0 === 0 * 4` is arithmetically
 * true, so a naive count check is satisfied by an empty manifest. Phase 3 shipped ten gates that
 * could not fail; every assertion below is about this one being unable to join them.
 *
 * WHY IT RE-IMPLEMENTS THE EXPECTED URL LIST
 * -----------------------------------------
 * The suite convention, stated in `photo-enrichment.unit.test.ts`: *"Importing the merge's own
 * parser would make this file assert that the merge agrees with itself."* So the expected
 * `{ id, key, url }` list below is built from the manifest and `REMOTE_URL_KEYS` DIRECTLY, never by
 * calling the script's own composer. Only `IMAGE_ORIGIN` and `REMOTE_URL_KEYS` are shared, and
 * deliberately: a test holding its own copy of the hostname could assert an origin the data does
 * not use and still pass, which is the failure mode `src/lib/image-origin.ts` exists to prevent.
 *
 * WHAT IT CANNOT SEE
 * ------------------
 * Whether any URL actually resolves. Nothing here makes a request — `globalThis.fetch` is replaced
 * with a spy that THROWS, and the tests assert it was never called, so a future edit that made
 * assembly fetch something would fail here rather than quietly turn a unit test into a flaky
 * network test. Liveness, content-type and cache-control are the live verifier's job.
 *
 * FILENAME CONTRACT
 * -----------------
 * `*.unit.test.ts` under `test/` — the three Vitest project globs are MUTUALLY EXCLUSIVE and a file
 * matching none is silently never run.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
// The script is a .mjs importing a .ts; Vitest resolves both. Its CLI is behind an
// `invokedDirectly` guard keyed on process.argv[1], so importing it here runs no CLI and — as the
// fetch spy below proves — opens no socket.
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

/**
 * The floor this file is allowed to assume about the corpus. NOT 39: the pipeline this phase builds
 * adds records, and an equality here would make the test fail on correct work the first time a
 * photo is published. A floor still catches the case that matters — a manifest that lost its
 * records, which would make every assertion below vacuously true.
 */
const MIN_RECORDS = 30;

/** Built independently of the script. See the header. */
function expectedTargets(records: Photo[]): { id: string; key: string; url: string }[] {
  const out: { id: string; key: string; url: string }[] = [];
  for (const record of records) {
    for (const key of REMOTE_URL_KEYS) {
      out.push({ id: record.id, key, url: record.urls[key as keyof PhotoUrls] });
    }
  }
  return out;
}

/** A minimal record shaped like the real thing, for the negative cases. */
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
  // Not a mock that records and returns — one that THROWS. If assembly or argv parsing ever
  // reaches the network, these tests must fail loudly rather than pass slowly.
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
    // 156 at the time of writing, stated as an arithmetic identity rather than a constant.
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

  it('keeps the category segment in every pathname — a basename rewrite would 404 plausibly', () => {
    const targets = assembleTargets(manifest, { manifestPath: MANIFEST_PATH });
    const byId = new Map(manifest.map((r) => [r.id, r]));
    for (const target of targets) {
      const category = byId.get(target.id)?.category;
      expect(category, `no record for ${target.id}`).toBeTruthy();
      expect(new URL(target.url).pathname.startsWith(`/photos/${category}/`)).toBe(true);
    }
  });
});

describe('thumb is excluded by construction, not by a filter', () => {
  it('REMOTE_URL_KEYS does not contain thumb', () => {
    expect([...REMOTE_URL_KEYS]).not.toContain('thumb');
  });

  it('every record HAS a thumb that a naive "skip what is not a URL" filter would have included', () => {
    // This is the whole reason exclusion is by name. A data: URI parses perfectly well as a URL,
    // so the careful-looking filter is the broken one.
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
    // 0 === 0 * 4 is true, which is exactly why this needs its own floor.
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
    const record = makeRecord('nature-example');
    delete (record.urls as Partial<PhotoUrls>).medium;
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('nature-example.medium');
    expect(message).toContain('missing or not a string');
  });

  it('refuses an unparseable URL, naming the record and the key', () => {
    const record = makeRecord('nature-example', { large: 'not a url at all' });
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('nature-example.large');
    expect(message).toContain('not a parseable URL');
  });
});

describe('the origin check fires before any request (T-04-10)', () => {
  it('reports a foreign origin as a finding and does not fetch it', () => {
    const record = makeRecord('nature-example', {
      original: 'https://evil.example.com/photos/nature/example.webp',
    });
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('nature-example.original');
    expect(message).toContain('https://evil.example.com');
    expect(message).toContain(IMAGE_ORIGIN);
    expect(message).toContain('not requested');
    // The afterEach fetch-count assertion is the other half of this claim.
  });

  it('reports a data: URI planted in a REMOTE key as a foreign origin, not as a target', () => {
    // The walk-through attempt: a data: URI parses, so a filter-based verifier would accept it.
    // `new URL('data:...').origin` is "null", which is not IMAGE_ORIGIN, so the origin check
    // catches it before any request.
    const record = makeRecord('nature-example', {
      original: 'data:image/webp;base64,UklGRhICAABXRUJQ',
    });
    let message = '';
    try {
      assembleTargets([record], {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('nature-example.original');
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
    // 04-10's criterion-1 gate is only meaningful if this is a refusal: a single-record check that
    // silently found nothing would let a live-run gate go green over a run that never happened.
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
    // Measured in 04-RESEARCH §4 and reproduced on 2026-08-27: a HEAD against this origin returns
    // cf-cache-status: DYNAMIC and NO cache-control at all, on an object a GET reports as cached
    // with max-age=14400. A HEAD-mode cache assertion would report a result it did not measure.
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
    const parsed = parseArgv(['some/other.json', '--only', 'nature-example']);
    expect(parsed.manifestArg).toBe('some/other.json');
    expect(parsed.only).toBe('nature-example');
  });

  it('refuses --only with no id, so the flag cannot silently widen the scope', () => {
    expect(() => parseArgv(['--only'])).toThrow(VerifierRefusal);
    expect(() => parseArgv(['--only', '--cache'])).toThrow(VerifierRefusal);
  });

  it('refuses an unknown flag rather than ignoring it', () => {
    // A dropped `--onlyy` would run the whole corpus while the caller believed it had scoped to one
    // record — or, in the pipeline, look like a one-record check that was really 156.
    let message = '';
    try {
      parseArgv(['--onlyy', 'nature-example']);
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

/**
 * The retry path, driven with a stubbed `fetch` — no socket, no real backoff.
 *
 * This block exists because of a MEASUREMENT taken during this plan's own four-step failure proof:
 * a full 156-URL run reported `HTTP 502` for `architecture-hauntedmansionjpg.small`, and ten
 * immediate re-probes of that exact URL (5x HEAD + 5x GET) all returned `200 image/webp`. The origin
 * emits the occasional 5xx blip, and the first version of the verifier reported it as a finding.
 *
 * A retry is the fix and also a risk: the obvious wrong version retries EVERYTHING, which would
 * turn the 404 this gate was built to catch into three slow 404s and then — one careless edit later —
 * into a pass. So both halves are asserted: transient statuses recover, and a status that persists
 * is still REPORTED.
 */
describe('the retry path cannot mask a real failure', () => {
  /** A minimal Response stand-in: only what checkTarget reads. */
  const respond = (status: number, headers: Record<string, string> = {}) => ({
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    arrayBuffer: async () => new ArrayBuffer(0),
  });

  const TARGET = {
    id: 'nature-example',
    key: 'medium',
    url: `${IMAGE_ORIGIN}/photos/nature/example-md.webp`,
  };
  const HEAD_MODE = parseArgv([]).mode;
  const NO_WAIT = { backoffMs: 0 };

  /** Replaces the throwing spy for the duration of one call, then restores it. */
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
    expect(String(result)).toContain('nature-example.medium');
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

/**
 * The exit contract, spawned. Both cases refuse BEFORE any request is issued, so this describe
 * block is still network-free — and the `spawnSync` calls below are the only place a process is
 * created, because asserting on stdout is a worse test than calling the function when the function
 * is available. Output is asserted NON-EMPTY BEFORE its content: `expect('').toContain('x')` fails,
 * but a `grep -c`-shaped check over an empty capture is how 03-07 shipped a gate that could not
 * fail, and the same shape in a test is worth refusing explicitly.
 */
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
    // And it must NOT have printed a PASS report alongside the refusal.
    expect(stdout).not.toContain('PASS');
  });
});
