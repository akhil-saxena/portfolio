/**
 * The render boundary for stored résumé prose (plan 03-07, criterion 3, requirement CONT-03).
 *
 * WHAT THIS COMPONENT IS FOR
 * --------------------------
 * The legacy stored-XSS class in this repository was **entirely** a rendering defect.
 * `Timeline.tsx:48` plus three admin components passed bullet strings straight to React's raw-HTML
 * prop, with no sanitiser anywhere in the repository. 03-02 made the stored shape unable to
 * express a tag and 03-06 made the schema reject one — but a correct store with a careless
 * renderer reproduces the hole exactly, because neither says anything about what happens on the
 * way out. This file is that half.
 *
 * THE MECHANISM, WHICH IS DELIBERATELY NOT CODE IN THIS FILE
 * ----------------------------------------------------------
 * Bold runs become `<strong>` ELEMENTS and plain runs become text CHILDREN. React escapes text
 * children by construction — `"&<>` are encoded on the way into the markup string — and that
 * mechanism is the entire security property here.
 *
 * So there is no escaping code below, and adding some would be a regression rather than
 * belt-and-braces:
 *
 *   - a hand-rolled escaper is a second implementation of something React already does correctly,
 *     and it is the classic place to forget an entity;
 *   - worse, it would DOUBLE-encode. `data/resume.json` carries one literal `&`
 *     (`upsell & cross-sell`); React emits `&amp;`, which is one ampersand correctly encoded.
 *     Encoding it again produces `&amp;amp;`, which renders visibly wrong. The suite asserts the
 *     rendered corpus contains exactly ONE `&` character for exactly that reason.
 *
 * The corresponding ban is structural: `scripts/assert-no-raw-html-sinks.mjs` fails the build if
 * a raw-HTML sink appears anywhere under `src/`, in the React spelling, the Astro one or the
 * plain-DOM one. This component being safe is worth little on its own; the gate is what makes the
 * unsafe alternative fail.
 *
 * WHY IT TAKES STRINGS AND CALLS THE PARSER ITSELF
 * ------------------------------------------------
 * `parseBullet` is IMPORTED from `src/lib/bullets.ts`, never reimplemented. The bullet grammar has
 * exactly one definition, and the migration, the schema and this renderer all ask that definition
 * rather than restating it — a regex here would be the third copy. Taking `string[]` rather than
 * `BulletRun[][]` keeps the parser in one place and the call site simple: a Phase 5 page hands
 * over what is on disk and nothing in between gets an opinion.
 *
 * `parseBullet` THROWS on malformed input, and that throw is deliberately not caught. Every stored
 * bullet has already passed `ResumeSchema`, whose own refinement is `parseBullet` — so a throw
 * here means content reached the renderer without going through the schema, which is a build-time
 * failure worth having loudly rather than a silently half-rendered résumé.
 *
 * NOTHING RENDERS THIS YET. There is no `/resume` page until Phase 5. That is the honest extent of
 * the claim: this proves the component is safe, not that the site is.
 *
 * Constraint: no Node-only imports. This renders during prerender inside `workerd`.
 */

import { Fragment } from 'react';
import { parseBullet } from '../lib/bullets';

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, itemIndex) => (
        // Index keys throughout. Runs are derived deterministically from a string and are never
        // reordered, inserted into or removed — the two conditions under which an index key goes
        // wrong. The list itself is static committed content for the same reason.
        // biome-ignore lint/suspicious/noArrayIndexKey: derived deterministically, never reordered
        <li key={itemIndex}>
          {parseBullet(item).map((run, runIndex) =>
            run.bold ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              <strong key={runIndex}>{run.text}</strong>
            ) : (
              // A keyed Fragment, not a wrapper element: the run needs a key because it is an
              // array child, and a <span> would put styling surface into the markup that the
              // stored shape never asked for.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              <Fragment key={runIndex}>{run.text}</Fragment>
            )
          )}
        </li>
      ))}
    </ul>
  );
}
