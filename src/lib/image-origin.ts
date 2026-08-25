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
 * PHASE 4 OBLIGATION (recorded here so it is not rediscovered as an omission): when the
 * Actions publishing pipeline lands and a real consumer of the origin exists at runtime,
 * `R2_PUBLIC_URL` gains its `astro:env` schema entry and its `wrangler.jsonc` `vars` entry,
 * and this constant becomes that variable's build-time default rather than a second source
 * of truth. Until that consumer exists, adding the variable is cost with no benefit.
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
