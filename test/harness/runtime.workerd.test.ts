/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * The harness's own proof of identity.
 *
 * Criterion 2 does not ask merely that unauthenticated requests be rejected — it asks
 * that this be proven "by a test running against real workerd rather than a mock". That
 * sentence is load-bearing: a jsdom or Node test of `requireAccess()` proves nothing
 * about the runtime that ships, and a green mock-based suite is precisely the evidence
 * that lets a fail-open auth path reach production.
 *
 * So this file asserts two separate things, and the second is the one that matters:
 *
 *  1. That the code below is executing inside `workerd` and not Node. Three globals
 *     discriminate the runtimes and at least two are asserted, so a single upstream API
 *     change cannot quietly turn the check into a no-op.
 *  2. That the R2 binding declared in `wrangler.jsonc` actually arrived, proven by a real
 *     `list()` round trip rather than a truthiness check on the binding object.
 *
 * Assertion (1) is backed by a negative control run during plan 02-05: the same three
 * assertions, copied into the Node `integration` project, FAILED. A control that passes
 * in both runtimes would mean this file proves nothing, so its failure is the evidence.
 */
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('the workers project executes inside real workerd', () => {
  // Global 1. workerd's WebSocket-pair constructor. Node has no such global at any
  // version — not under --experimental-websocket, which adds `WebSocket`, not this.
  it('exposes WebSocketPair, which Node does not', () => {
    expect(typeof WebSocketPair).toBe('function');
  });

  // Global 2. The Cache API's unnamed default cache. Node has no `caches` global at all;
  // browsers have `caches` but no `caches.default` (that property is Cloudflare-specific,
  // and is why this discriminates workerd from both other runtimes).
  it('exposes caches.default, which is Cloudflare-specific', () => {
    expect(typeof caches).toBe('object');
    // The suppression below is a types-vs-runtime gap, NOT a runtime absence, and the
    // distinction matters because this is evidence. worker-configuration.d.ts:1031 declares
    // `declare abstract class CacheStorage { readonly default: Cache }`, but the ambient DOM
    // lib's CacheStorage wins name resolution in this program and has no such member. The
    // runtime is the authority here and it disagrees with the type: this assertion passes
    // inside workerd and fails in Node, which is exactly what the negative control measured.
    // The expect-error form is used rather than an ignore on purpose: it self-corrects,
    // failing the build if the type ever gains `default` and the suppression becomes a lie.
    // @ts-expect-error DOM CacheStorage lacks workerd's unnamed default cache
    const defaultCache = caches.default as { match?: unknown } | undefined;
    expect(defaultCache).toBeDefined();
    expect(typeof defaultCache?.match).toBe('function');
  });

  // Global 3. workerd reports itself in navigator.userAgent. Kept alongside the other two
  // rather than instead of them: it is the most likely of the three to be changed
  // upstream, and the point of asserting all three is that no single change is silent.
  it('reports navigator.userAgent as Cloudflare-Workers', () => {
    expect(navigator.userAgent).toBe('Cloudflare-Workers');
  });
});

describe('the pool inherited the real bindings from wrangler.jsonc', () => {
  it('has the PORTFOLIO_BUCKET R2 binding', () => {
    expect(env.PORTFOLIO_BUCKET).toBeDefined();
  });

  // The assertion that makes this a harness for FND-03 and AUTH-04 rather than runtime
  // trivia. A binding stubbed by ad-hoc Miniflare options, or a binding that never came
  // through from wrangler.jsonc at all, cannot complete this round trip — whereas a
  // truthiness check on `env.PORTFOLIO_BUCKET` alone would pass against any object.
  it('can complete a real list() round trip against that bucket', async () => {
    const listed = await env.PORTFOLIO_BUCKET.list({ limit: 1 });
    expect(listed).toBeDefined();
    expect(Array.isArray(listed.objects)).toBe(true);
  });
});
