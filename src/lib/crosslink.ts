/**
 * The italic serif cross-link's type role — ONE declaration, shared by both halves of the pair.
 *
 * ================================================================================================
 * WHY THIS IS A MODULE AND NOT A SECOND OBJECT LITERAL ON `/photos`
 * ================================================================================================
 *
 * §13.2 makes the cross-link a PAIR: `/work` points at the gallery with *see the photographs →*
 * and `/photos` points back with *← see the work*. `/work` shipped its half in 05-09; the return
 * path was never built, and 05-15's audit found it with a grep whose only hit in the whole
 * repository was the spec row itself.
 *
 * Building the second half by copying the first one's inline style object would have created two
 * declarations of one reviewed role, four files apart, with nothing holding them together — and a
 * role that is half in one page and half in another is the arrangement nobody can reason about
 * later. This project has already paid for that shape twice: `src/types.ts`'s header records the
 * legacy admin's "local copies that have drifted", and §13.3 records a component count that went
 * stale three times in nine days. So the role is declared once, here, and both pages import it.
 *
 * ================================================================================================
 * WHY IT IS AN INLINE STYLE OBJECT AT ALL — FORCED, NOT CHOSEN
 * ================================================================================================
 *
 * MEASURED (05-09, and unchanged against the installed 2.0.0-beta.1): `Link` emits
 * `style="font-family:var(--font);cursor:pointer"` on EVERY variant, so a serif link is not
 * expressible from an app stylesheet at any specificity without `!important` — the workaround the
 * Core Value forbids. The component DOES merge a consumer `style` over its own, so the role goes
 * through its documented API instead. The rest of the role travels with the family rather than
 * being split between here and a `.css` file, for the same reason the two pages share this object.
 *
 * ================================================================================================
 * THE VALUES ARE J2's VERDICT, NOT A DEFAULT
 * ================================================================================================
 *
 * J2 was OVERRIDDEN and NOT by the offered fallback: the verdict was *"too big and heavy, can keep
 * smaller font too"*, so both the 22px size and the `--ochre-d-strong` weight were rejected. It is
 * `--text-lg` 17 in `--ochre-d` — the smallest serif on the site, and at weight 400 on a dark field
 * it clears §3.3's floor only because 17 is above the 15px that section sets for a Playfair body
 * role. §4.3 keeps `--ochre-d-strong` for the metric; `test/public/work.node.test.ts` asserts the
 * served bytes carry `--ochre-d` and NOT `--ochre-d-strong`, and `photos-routes.node.test.ts`
 * asserts the same of the returning half.
 *
 * NOTHING HERE IS A COLOUR LITERAL, A SIZE OR A FAMILY NAME. Every value is a token the monochrome
 * theme owns (§4.3 item 3, §3.1 "Italic serif cross-link").
 */

export const CROSSLINK_TYPE = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: 'var(--text-lg)',
  fontWeight: 'var(--weight-regular)',
  lineHeight: 'var(--lh-snug)',
  letterSpacing: 'var(--ls-tight)',
  color: 'var(--ochre-d)',
} as const;
