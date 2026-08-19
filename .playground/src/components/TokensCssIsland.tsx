// Cascade probe — variant D's island (MEASURE-3).
//
// The mirror of `ThemeCssIsland.tsx`: same job, opposite sheet. Variant D puts
// `theme-charcoal.css` in the `.astro` frontmatter and pulls the design
// system's `tokens.css` in through the island, which is the reverse of variant
// C and therefore the reverse emitted order.
//
// See `ThemeCssIsland.tsx`'s header for why this is a separate file rather
// than the same component with a prop: the import POSITION is the variable
// under test, and a prop cannot vary a module-level import statement.

import "@akhil-saxena/design-system/tokens.css";

export default function TokensCssIsland() {
	return <span data-island="tokens-css">tokens.css arrived via a hydrated island</span>;
}
