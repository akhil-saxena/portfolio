/**
 * The zero-JavaScript proof.
 *
 * A plain React 19 function component: no props, no hooks, no state, no effects.
 * `src/pages/index.astro` renders it with **no** `client:*` directive, so Astro
 * server-renders it to static HTML at build time and ships no client bundle for it.
 *
 * That claim is load-bearing. Phase 0's research rests the whole "design system
 * everywhere AND Lighthouse 95+" strategy on it — the design system is React, and if
 * React components could not be composed into static HTML the two goals would be in
 * direct conflict. This is the first time the claim is tested in the shipping stack
 * rather than in the gitignored playground, which is why the marker below is asserted
 * against `dist/index.html` by this plan's verification and not merely eyeballed.
 *
 * The `data-stack-proof` attribute is that marker. Do not rename it without updating
 * 02-03's verification.
 */
export function StackProof() {
  return (
    <section data-stack-proof="stack-proof-ok">
      <h2>Stack proof</h2>
      <p>
        This block was rendered by a React 19 component with no client directive. If you are reading
        it in page source with no accompanying script tag, the proof holds.
      </p>
      <dl>
        <dt>Framework</dt>
        <dd>Astro 7</dd>
        <dt>UI runtime</dt>
        <dd>React 19, server-rendered only</dd>
        <dt>Platform</dt>
        <dd>Cloudflare Workers with Static Assets</dd>
      </dl>
    </section>
  );
}
