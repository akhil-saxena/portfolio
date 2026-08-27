/**
 * The canonical origin every photograph in `data/portfolio_images.json` is served from.
 *
 * This is the ONLY place in the repository the hostname is written. The migration script
 * (`scripts/migrate-photo-origin.mjs`), the CONT-04 ship gate
 * (`scripts/assert-no-r2dev-urls.mjs`) and the content schema (plan 03-06) all import it
 * from here rather than restating it. If they each held their own copy, the gate could
 * assert an origin the data does not use and still pass — which is the failure mode this
 * module exists to make structurally impossible.
 *
 * ---------------------------------------------------------------------------------------
 * WHY A PLAIN MODULE, AND NOT `astro:env` OR A `wrangler.jsonc` `vars` ENTRY
 *
 * Both `astro.config.mjs` and `wrangler.jsonc` carry comments predicting that Phase 3
 * would add `R2_PUBLIC_URL` to the env schema and to a `vars` block. Checked before acting
 * on it: NOTHING IN PHASE 3 READS THE VALUE AT RUNTIME. The manifest holds absolute URLs
 * resolved at build time, and the only producer of new URLs is the Phase 4 GitHub Actions
 * pipeline, which runs on a Node runner and never inside the Worker.
 *
 * That matters because `astro.config.mjs` sets `validateSecrets: true`. A declared but
 * unprovisioned variable is therefore a BUILD FAILURE, not a latent TODO — so declaring
 * `R2_PUBLIC_URL` now would force a developer to provision a secret that nothing reads, to
 * satisfy a prediction rather than a consumer. `astro.config.mjs`'s own comment states the
 * rule that settles it: "declaring them now would force the developer to provision secrets
 * that nothing in Phase 2 reads."
 *
 * PHASE 4 CHECKED THAT CONDITION AND IT DID NOT HOLD. (Amended 2026-08-27 by plan 04-02.)
 *
 * This paragraph used to record a PHASE 4 OBLIGATION: that when the Actions publishing pipeline
 * landed and a real consumer of the origin existed AT RUNTIME, `R2_PUBLIC_URL` would gain its
 * `astro:env` schema entry and its `wrangler.jsonc` `vars` entry, with this constant becoming
 * that variable's build-time default. The reasoning was right and the prediction was wrong,
 * so it is falsified here rather than deleted — a document recording what was true on a date is
 * falsified by a blanket replace, not improved by one (the 01-23 precedent, the same one that
 * keeps `.planning/**` out of the CONT-04 gate's scan set).
 *
 * WHAT PHASE 4 ACTUALLY BUILT: `src/lib/photo-pipeline.ts` plus `scripts/**`, run by GitHub
 * Actions on a NODE RUNNER. It composes every URL from `IMAGE_ORIGIN` below, imported — decision
 * OD-3, taken 2026-08-26, specifically so the pipeline cannot emit a non-canonical origin and so
 * the five-month-old `R2_PUBLIC_URL` secret is never read. Nothing in Phase 4 reads the origin
 * inside the Worker, which is the trigger the obligation named. So the condition is still unmet
 * after the pipeline exists, and declaring the variable would still force a developer to
 * provision a secret nothing reads — under `validateSecrets: true`, a BUILD FAILURE.
 *
 * The same prediction is written in `astro.config.mjs` (the `envSchema` comment naming Phases 3
 * and 4) and in `wrangler.jsonc` (the "Deliberately absent" block). Both are equally falsified by
 * the measurement above. Plan 04-02 does not own those two files, so they are named here rather
 * than edited, and a reader arriving at either one should arrive here.
 *
 * If a runtime consumer inside the Worker is ever built — a Phase 7 admin route composing an
 * upload URL, say — the original reasoning applies again and the variable earns its entry then.
 *
 * Provisioned in plan 02-02; the DNS records, the cache evidence and the byte-for-byte
 * bucket check are in `02-DNS-R2-PREREQS.md`.
 */

/**
 * Absolute origin, no trailing slash — so `${IMAGE_ORIGIN}${url.pathname}` composes
 * correctly and `String.startsWith(IMAGE_ORIGIN)` cannot be defeated by a doubled slash.
 */
export const IMAGE_ORIGIN = 'https://images.akhilsaxena.com';

/**
 * The `urls` keys that hold a remote address, in the order the manifest declares them.
 *
 * The fifth key, `thumb`, is DELIBERATELY ABSENT: it is a base64 LQIP data URI carrying no
 * hostname, and rewriting it would corrupt 39 inline previews. Every consumer iterates this
 * list explicitly rather than iterating `Object.entries(urls)` and filtering, because a
 * `data:` URI parses perfectly well as a URL — so a "skip what isn't a URL" filter would
 * silently include the thumb while looking careful.
 */
export const REMOTE_URL_KEYS = ['original', 'large', 'medium', 'small'] as const;
