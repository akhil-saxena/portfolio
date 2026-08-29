/**
 * The empty-category state (§13.2). Plan 05-07, Task 2.
 *
 * ================================================================================================
 * WHY THIS IS A COMPONENT AND NOT FIVE LINES INSIDE THE ROUTE
 * ================================================================================================
 *
 * The plan requires this branch to be proven to RENDER, "by generating the branch in a test rather
 * than by adding a fake category to committed data". Neither of the two obvious ways to do that is
 * available in this repository, and both reasons are measured rather than assumed:
 *
 *   1. NO TEST CAN RENDER AN `.astro` FILE HERE. `test/public/shell.unit.test.ts` measured it: the
 *      `unit` project has no Astro Vite plugin by deliberate design, and importing an `.astro`
 *      component fails in `vite:import-analysis` on the first template expression.
 *
 *   2. THE STATE CANNOT BE REACHED BY A BUILD OVER PLANTED DATA EITHER — see the finding in
 *      `src/pages/photos/[category]/index.astro`. `validateContentSet`'s RI-2 REFUSES a declared
 *      category that no photograph uses, so a build carrying an empty category record never gets
 *      as far as rendering a page.
 *
 * A React component rendered with NO `client:*` directive is static HTML on the page and an
 * ordinary import in a test. `renderToStaticMarkup` is the same server path the page takes, and it
 * is already how `test/content/bullets.unit.test.ts` and `xss-boundaries.unit.test.ts` assert
 * rendered output in this repository.
 *
 * ================================================================================================
 * THE COPY IS §13.2's, VERBATIM, AND ONE READING IS RECORDED
 * ================================================================================================
 *
 *     **No photographs in {Category} yet.**
 *     *Every category on this site has at least one today; this one is new.*
 *     → `See all {n}`
 *
 * THE ARROW IS THE TABLE'S MARKER FOR "THEN A LINK", NOT COPY. It sits OUTSIDE the backticks in
 * §13.2, and the 404 row directly below has the identical shape — `→ \`Go to the home page\`` —
 * where an arrow inside the link text would read oddly. Every row whose arrow IS copy carries it
 * inside the backticks (`ALL WORK →`, `SCROLL FOR THE WORK ↓`). So the link's text is `See all {n}`
 * and nothing else. Recorded because it is a judgement, not a transcription.
 *
 * `{n}` is DERIVED and passed in — §13.3: the photograph count comes from the collection and a
 * group-by, never a literal. §13.2 prints "39" and the manifest is at 40; that is exactly the drift
 * the rule exists to prevent.
 */

import { Heading } from '@akhil-saxena/design-system/components/Heading';
import { Link } from '@akhil-saxena/design-system/components/Link';
import { Text } from '@akhil-saxena/design-system/components/Text';

export interface PhotoEmptyProps {
  /** The category's own label from `data/site_config.json` — `Portraits`, not `portraits`. */
  label: string;
  /** The total number of photographs on the site, derived by the caller from the collection. */
  total: number;
}

export function PhotoEmpty({ label, total }: PhotoEmptyProps) {
  return (
    <div className="ph-empty">
      {/* `level={2}` — the page already has its `<h1>`, which is the category's own name. */}
      <Heading level={2} size="md">
        No photographs in {label} yet.
      </Heading>
      <Text variant="small">
        Every category on this site has at least one today; this one is new.
      </Text>
      {/* `variant="default"` — §4.6a measured that `inline`, `footer` and `action` set `color` as
          an INLINE style, which beats any app rule while every jsdom test still passes. */}
      <Link href="/photos" variant="default">
        See all {total}
      </Link>
    </div>
  );
}
