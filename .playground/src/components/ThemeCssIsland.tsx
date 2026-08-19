// Cascade probe — variant C's island (MEASURE-3).
//
// This component exists for ONE reason: to carry `theme-charcoal.css` into the
// page cascade from inside a hydrated island rather than from `.astro`
// frontmatter. Astro HOISTS island CSS out of the island into a page-level
// stylesheet, so it competes in exactly the same cascade bucket as an `.astro`
// import — there is no separate island cascade to reason about. Variant C is
// what proves that claim in a browser instead of assuming it.
//
// The `client:load` directive on the consuming page is load-bearing. Without a
// hydration directive the component still renders and its CSS still hoists,
// but nothing about the ISLAND path would have been exercised — the compiler
// would have treated it as an ordinary server-rendered component. The probe
// must test the path the real site will use.
//
// WHY THIS IS NOT ONE COMPONENT WITH A PROP. `TokensCssIsland.tsx` is a
// near-duplicate of this file that imports the design system's `tokens.css`
// instead. The duplication is deliberate: a CSS `import` is a module-level
// statement and its POSITION inside the importing module is literally what
// Astro's `cssOrder(a, b)` sorts on. A single component that chose its sheet
// from a prop could not express two different import positions, so the two
// variants would collapse into one and variant D would silently become a
// second copy of variant C.
//
// It renders a span rather than null because an island that renders nothing is
// easy to mistake for an island that failed to hydrate.

import "../styles/theme-charcoal.css";

export default function ThemeCssIsland() {
	return <span data-island="theme-css">theme-charcoal.css arrived via a hydrated island</span>;
}
