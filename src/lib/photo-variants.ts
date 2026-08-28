/**
 * The NODE-FREE half of the photo contract. (Phase 5, plan 05-05, Task 1.)
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `src/lib/photo-pipeline.ts` is the one definition of how a photograph becomes a URL, and it
 * imports `node:crypto` at module scope because it hashes bytes on a GitHub Actions runner. Three
 * of the values it declared are ALSO needed by prerendered public pages — the variant table, the
 * LQIP shape, and the `id` separator — and a page that imports them through `photo-pipeline.ts`
 * drags `node:crypto` into its module graph.
 *
 * `05-UI-SPEC.md` §7.4 recorded that as UNVERIFIED and asked for a measurement in the first
 * Phase 5 wave. **MEASURED, 2026-08-28, plan 05-05 Task 1** — a throwaway
 * `src/pages/probe-variants.astro` importing `VARIANTS` from `photo-pipeline.ts`:
 *
 *     npm run build                                        → exit 0
 *     dist/client/probe-variants/index.html                → emitted, data-n="4"
 *     grep -rl 'node:crypto\|createHash' dist/client/      → exit 1 (no match, 11 files scanned)
 *     grep -rl 'node:crypto'            dist/server/       → exit 1 (no match, 30 files scanned)
 *
 * So it BUILT. The hazard is not that it fails; it is that it succeeds **quietly**, because
 * `wrangler.jsonc` sets `nodejs_compat` and workerd therefore supplies `node:crypto`. The same
 * sentence is already in `photo-pipeline.ts`'s own header about accidental imports: it "would NOT
 * fail loudly — it would just quietly ship the pipeline into the Worker."
 *
 * §7.4 named the fix and §5.3 assertion 5 requires it to be PROVABLE rather than
 * currently-true: "move `VARIANTS` and `THUMB` down into a Node-free module that
 * `photo-pipeline.ts` re-exports — **never a second copy of the numbers**." This is that module.
 *
 * THERE IS STILL EXACTLY ONE DEFINITION. `photo-pipeline.ts` re-exports these bindings; it does
 * not restate them. `test/pipeline/photo-pipeline-contract.unit.test.ts` asserts the re-exported
 * objects are REFERENTIALLY IDENTICAL (`toBe`, not `toEqual`) to the ones declared here, because a
 * copy would satisfy `toEqual` and that is precisely the failure this move exists to prevent.
 *
 * ZERO `node:` IMPORTS, AND THE ONE RELATIVE IMPORT CARRIES `.ts`
 * ---------------------------------------------------------------
 * Two constraints meet in this file and they pull in opposite directions.
 *
 *   - It is imported by prerendered `.astro` pages, which execute inside **workerd**. Nothing from
 *     `node:` may appear here, and nothing may read a filesystem: the prerender has none (plan
 *     05-01 measured `process.cwd() === '/bundle'`, `import.meta.url === undefined`).
 *   - It is also reached, transitively through `photo-pipeline.ts`, by five `.mjs` scripts that
 *     plain `node` loads on the Actions runner via Node 22's type stripping. Node's ESM resolver
 *     will not resolve an EXTENSIONLESS relative TypeScript specifier — measured as
 *     `ERR_MODULE_NOT_FOUND` in `photo-pipeline.ts`'s header. So `./image-origin.ts` below carries
 *     its extension, exactly as `photo-pipeline.ts` spells its own import, and that is load-bearing
 *     rather than stylistic.
 *
 * The OD-1 and OD-11 rationale below travelled WITH the constants it explains. A constant whose
 * reasoning stayed behind in another file is one nobody can evaluate in two years — the discipline
 * `photo-pipeline.ts`'s header sets, applied to its own extraction.
 */

import type { REMOTE_URL_KEYS } from './image-origin.ts';

/* ==============================================================================================
 * 1. THE VARIANT TABLE.  Read from `git show legacy/nextjs-portfolio:scripts/process-images.js`
 *    and confirmed against served bytes (a 400px `-sm.webp` decodes to 400x267).
 *    Moved here from `photo-pipeline.ts` §3 by plan 05-05; the numbers are unchanged.
 * ============================================================================================ */

/**
 * A mapped TUPLE over `REMOTE_URL_KEYS`. This is the type-level half of the
 * `VARIANTS.map(v => v.urlKey)` deep-equals `REMOTE_URL_KEYS` claim: adding, removing, renaming
 * or REORDERING a remote key makes `VARIANTS` stop satisfying this type, which `npm run
 * typecheck` reports. The contract test asserts the same thing at runtime, independently.
 *
 * THE SHAPE OF THIS DECLARATION IS LOAD-BEARING, and both simpler forms were MEASURED to fail
 * (`npm run typecheck`, i.e. `astro check`, 2026-08-27):
 *
 *   - `readonly [I in keyof typeof REMOTE_URL_KEYS]: ImageVariant<(typeof REMOTE_URL_KEYS)[I]>`
 *     → ts(2344): inside the mapped type the type argument is checked against the constraint for
 *       EVERY key, `length` included, so `4` is offered where a key name is required.
 *   - the same mapping with the entry shape inlined, still over a CONCRETE tuple
 *     → ts(1360): the mapping is not homomorphic, so `length` is mapped too and the result is an
 *       object type with a `length` property rather than a tuple.
 *
 * Mapping over a TYPE PARAMETER (`Keys` below) is what makes it homomorphic, which is what makes
 * the result a tuple, which is what makes the position-for-position check happen at all. A
 * "tidied" version of this type may well stop asserting anything while still compiling.
 */
export type VariantTableFor<Keys extends readonly string[]> = {
  readonly [I in keyof Keys]: {
    readonly urlKey: Keys[I];
    readonly suffix: string;
    readonly maxWidth: number;
    readonly quality: number;
  };
};

export type VariantTable = VariantTableFor<typeof REMOTE_URL_KEYS>;

/**
 * Resize is `sharp(buf).resize({ width: Math.min(maxWidth, sourceWidth), withoutEnlargement:
 * true })` — 04-07 owns the derivation; this table owns the numbers, so no width or quality
 * literal appears in the deriver.
 *
 * The SAME property is what makes a width descriptor derivable without storing a served size:
 * because the resize is by width, capped, and never enlarging, the descriptor for a variant is
 * exactly `Math.min(variant.maxWidth, photo.dimensions.width)`. `src/lib/photo-srcset.ts` is the
 * one place that arithmetic is written; §7.4 verified it against real served bytes on four records
 * spanning the edge cases, including the two whose source is under a cap
 * (`min(2000, 1920) = 1920`, `min(1200, 1318) = 1200`).
 */
export const VARIANTS = [
  { urlKey: 'original', suffix: '', maxWidth: 2000, quality: 85 },
  { urlKey: 'large', suffix: '-lg', maxWidth: 1200, quality: 85 },
  { urlKey: 'medium', suffix: '-md', maxWidth: 800, quality: 85 },
  { urlKey: 'small', suffix: '-sm', maxWidth: 400, quality: 80 },
] as const satisfies VariantTable;

/**
 * The LQIP. Width 40, quality 60, NO watermark, emitted inline as a data URI — which is why
 * `thumb` is absent from `REMOTE_URL_KEYS`: it carries no hostname and an origin migration must
 * never rewrite it.
 *
 * `dataUriPrefix` is the same string `PhotoUrlsSchema` enforces. It is not imported from
 * `src/schemas/photo.ts` — see "WHERE THIS MODULE RUNS" in `photo-pipeline.ts`'s header for the
 * measurement that forbids that import, which binds here too because this file is reached through
 * it. `THUMB_PREFIX` is EXPORTED from `photo.ts` so the contract test can import both sides and
 * assert they are equal; before that export the only available assertion compared this value
 * against a literal re-typed in the test, which agrees with itself.
 */
export const THUMB = {
  width: 40,
  quality: 60,
  dataUriPrefix: 'data:image/webp;base64,',
} as const;

/* ==============================================================================================
 * 2. THE RECORD ID SEPARATOR.
 * ============================================================================================ */

/**
 * `id === category + PHOTO_ID_SEPARATOR + slug`.
 *
 * WHY THIS ONE-CHARACTER CONSTANT LIVES IN A NODE-FREE MODULE (plan 05-05, and it is not
 * housekeeping). `PhotoSchema` has no `slug` field, so the public routes have to RECOVER the slug
 * from the id: `/photos/<category>/<slug>` is derived, not stored. That derivation
 * (`photoSlug` in `src/lib/photo-srcset.ts`) runs in a prerendered page, so it cannot import
 * `photo-pipeline.ts` — and if it spelled `'-'` itself there would be TWO definitions of the
 * separator, one of which is invisible to `photoIdFor`. The failure mode is silent and total:
 * every gallery tile links to a page that exists under a different slug, with a green build, a
 * green suite and a green gate, first detected by a human clicking a tile.
 *
 * `photoIdFor` stays in `photo-pipeline.ts` — it validates both halves against the schema slug
 * grammar and only the pipeline composes new ids. Only the separator itself moved.
 */
export const PHOTO_ID_SEPARATOR = '-';
