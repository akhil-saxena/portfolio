/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('the workers project executes inside real workerd', () => {
  it('exposes WebSocketPair, which Node does not', () => {
    expect(typeof WebSocketPair).toBe('function');
  });

  it('exposes caches.default, which is Cloudflare-specific', () => {
    expect(typeof caches).toBe('object');
    // @ts-expect-error DOM CacheStorage lacks workerd's unnamed default cache
    const defaultCache = caches.default as { match?: unknown } | undefined;
    expect(defaultCache).toBeDefined();
    expect(typeof defaultCache?.match).toBe('function');
  });

  it('reports navigator.userAgent as Cloudflare-Workers', () => {
    expect(navigator.userAgent).toBe('Cloudflare-Workers');
  });
});

describe('the pool inherited the real bindings from wrangler.jsonc', () => {
  it('has the PORTFOLIO_BUCKET R2 binding', () => {
    expect(env.PORTFOLIO_BUCKET).toBeDefined();
  });

  it('can complete a real list() round trip against that bucket', async () => {
    const listed = await env.PORTFOLIO_BUCKET.list({ limit: 1 });
    expect(listed).toBeDefined();
    expect(Array.isArray(listed.objects)).toBe(true);
  });
});
