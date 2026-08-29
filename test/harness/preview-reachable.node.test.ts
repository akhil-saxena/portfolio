/**
 * The `integration` project's own proof of life: the built site is genuinely reachable
 * over HTTP, served by real `workerd`.
 *
 * This test runs in Node, on purpose. It is an HTTP client, not a runtime under test —
 * the runtime under test is on the other end of the socket, where `astro preview` is
 * running the build output through `@cloudflare/vite-plugin`. Putting these assertions
 * inside the workers pool instead would place them in the same isolate as the thing they
 * assert about, which is the self-confirming evidence this phase exists to avoid.
 *
 * Scope note: this file asserts nothing about the three protected route prefixes that
 * plan 02-04 created. Those are asserted by plan 02-07, once auth exists and their
 * refusal means something. Asserting them here would be testing a sibling plan's stub.
 */
import { describe, expect, inject, it } from 'vitest';

const previewBaseUrl = inject('previewBaseUrl');

describe('the built site is served over HTTP by real workerd', () => {
  it('was given a base URL by the global setup', () => {
    expect(previewBaseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it('answers the index route with 200 and the static build marker', async () => {
    const response = await fetch(`${previewBaseUrl}/`);

    expect(response.status).toBe(200);

    // MARKER MIGRATION, plan 05-11. This assertion used to read `stack-proof-ok`, emitted
    // by a scaffold component that the real Home replaced. The contract did not change and
    // was not dropped: `home-render-ok` is the `data-home-marker` attribute on Home's <h1>,
    // which is a design-system `Heading` — a React 19 component rendered with no client
    // directive. So finding it still proves the whole chain in one assertion: the build ran,
    // a React component was rendered to static HTML, the output was served, and this process
    // read it off a real socket. The marker's definition is in src/pages/index.astro.
    const body = await response.text();
    expect(body).toContain('home-render-ok');
  });
});
