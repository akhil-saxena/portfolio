import { readFileSync } from 'node:fs';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
// Astro loads this config through Vite, so it can import TypeScript out of src/ — measured, not
// assumed (plan 03-08, experiment 4f). Note the explicit `.ts`: `src/schemas/index.ts` re-exports
// with EXTENSIONLESS relative specifiers, which only a bundler resolves. A plain
// `node scripts/*.mjs` cannot import this module, which is why the content gate lives in the build
// rather than in a script beside the other gates.
import { formatContentSetReport, validateContentSet } from './src/schemas/index.ts';

/**
 * The five committed content files, keyed as `ContentSetInput` names them.
 *
 * FIVE, NOT FOUR. Plan 03-08's own `must_haves` and `<verification>` say "the four content files";
 * that is a mistake in the plan and `03-CONTEXT.md` §2 is right. `projects.json` was created by
 * 03-05 (decision D-24) as a fifth file, and 03-06's `validateContentSet` takes all five — RI-5
 * checks project id uniqueness and would be skipped without it. The count is asserted below rather
 * than trusted, because a gate that quietly reads four files and reports on five is the exact
 * failure class this phase has shipped ten times.
 */
const CONTENT_FILES = {
  photos: './data/portfolio_images.json',
  site: './data/site_config.json',
  home: './data/home_config.json',
  projects: './data/projects.json',
  resume: './data/resume.json',
};

/** Every key `validateContentSet` consumes. If these two disagree, a rule is silently skipped. */
const REQUIRED_CONTENT_KEYS = ['photos', 'site', 'home', 'projects', 'resume'];

/**
 * The content gate — the one enforcement point that does not depend on a page existing.
 *
 * WHY AN INTEGRATION HOOK RATHER THAN A MODULE-SCOPE PARSE
 * -------------------------------------------------------
 * `research/ARCHITECTURE.md` §"Pattern 2" says a module-scope `Schema.parse()` in `src/lib/content.ts`
 * aborts the build because Astro evaluates it during prerender. Plan 03-08 measured it: with a
 * corrupt `data/resume.json` and that parse in place, `astro build` exited **0** and emitted
 * `dist/`, because Astro evaluates modules that something IMPORTS and nothing imports it until
 * Phase 5 writes a page. ADR-002 deleted `/admin/site` on the strength of the referential-integrity
 * rule in `src/schemas/content-set.ts`; leaving that rule in an unimported module would have made
 * the trade for nothing.
 *
 * `astro:config:done` was chosen over `astro:build:start` after measuring both. Both fail the build
 * (exit 1, no `dist/`). `config:done` additionally fires on `astro check` and `astro sync`, so
 * `npm run typecheck` and `npm run dev` enforce the same rules as `npm run build` — three chances
 * to hear about a bad edit instead of one. The hook name is confirmed against
 * `node_modules/astro/dist/types/public/integrations.d.ts`, not against a tutorial.
 *
 * The thrown error's `stack` is emptied on purpose. Astro prints `error.message` verbatim and then
 * `error.stack` under a "Stack trace:" heading; with the stack present, a readable report is
 * followed by twelve frames of `astro/dist/integrations/hooks.js`, and "readable" does not survive
 * having to be scrolled to. Measured: with the stack emptied the output is the two-line Astro
 * preamble and then the report, and nothing else.
 */
const contentGate = {
  name: 'content-gate',
  hooks: {
    'astro:config:done': ({ logger }) => {
      // ANTI-VACUITY, FIRST: a gate that reads four of five files would report a clean set while
      // never looking at the fifth. This is not defensive coding; it is the specific bug found in
      // 03-07's scan root and in two earlier gates this phase.
      const declared = Object.keys(CONTENT_FILES);
      const missingKeys = REQUIRED_CONTENT_KEYS.filter((key) => !declared.includes(key));
      if (missingKeys.length > 0 || declared.length !== REQUIRED_CONTENT_KEYS.length) {
        const wiring = new Error(
          `content-gate is misconfigured: it reads ${declared.length} file(s) ` +
            `(${declared.join(', ')}) but validateContentSet consumes ` +
            `${REQUIRED_CONTENT_KEYS.length} (${REQUIRED_CONTENT_KEYS.join(', ')}). ` +
            `Missing: ${missingKeys.join(', ') || '(none — count mismatch)'}. ` +
            'A rule whose input is absent is skipped, and a skipped rule looks exactly like a ' +
            'rule that passed.'
        );
        wiring.stack = '';
        throw wiring;
      }

      const input = {};
      const unreadable = [];
      for (const [key, relative] of Object.entries(CONTENT_FILES)) {
        try {
          input[key] = JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
        } catch (error) {
          // A file that is absent, or is not JSON at all, never reaches a schema — so it would
          // produce no zod issue and, without this, no finding either.
          unreadable.push(
            `  ✖ ${relative.replace('./', '')} could not be read as JSON — ${error.message}`
          );
          input[key] = undefined;
        }
      }

      const report = validateContentSet(input);

      if (unreadable.length === 0 && report.ok) {
        // The census is logged on the PASS path deliberately: "content set: PASS" over zero
        // photographs and over thirty-nine are the same sentence, and only one of them is a pass.
        logger.info(formatContentSetReport(report).replace(/\n\s+/g, ' · '));
        return;
      }

      const lines = [
        '',
        '══════════════════════════════════════════════════════════════════════════════',
        '  BUILD REFUSED — a file in data/ does not match the schema in src/schemas',
        '══════════════════════════════════════════════════════════════════════════════',
        '',
        ...unreadable,
      ];
      if (unreadable.length > 0) lines.push('');
      lines.push(formatContentSetReport(report));
      lines.push('');
      lines.push('  Each finding names the FILE, the RECORD by its own identifier, and the FIELD.');
      lines.push('  Fix the data, or change the schema in src/schemas if the rule is wrong —');
      lines.push('  there is exactly one definition of each shape and this is what reads it.');
      lines.push('');
      lines.push('  Requirements CONT-01…CONT-04; criterion 2; threats T-03-08-01, T-03-08-02.');
      lines.push('');

      const refusal = new Error(lines.join('\n'));
      refusal.stack = '';
      throw refusal;
    },
  },
};

/**
 * SEO-03's filter, and the two things MEASURED about it that the plan predicted wrongly.
 *
 * MEASUREMENT 1 — `/404` needs no filter, and a filter cannot be what excludes it.
 * ------------------------------------------------------------------------------
 * Plan 05-13 instructs "configure a `filter` excluding `/404`" and prescribes a control that
 * removes that filter and watches the exclusion assertion go red. Built once with a bare
 * `sitemap()` and no filter at all, the emitted `dist/client/sitemap-0.xml` held **52** `<loc>`
 * entries and NONE of them was `/404` — `@astrojs/sitemap` drops Astro's 404 route itself. So the
 * prescribed control is structurally impossible: removing the filter changes nothing, and an
 * exclusion assertion "proven" that way would have been proven against a no-op. The absence is
 * still asserted in `test/public/seo.node.test.ts`, and it is proven able to fail by PLANTING a
 * 404 entry (`customPages`) rather than by removing a filter that never did the work.
 *
 * MEASUREMENT 2 — the real leak was `/admin`, and the plan does not mention it.
 * ---------------------------------------------------------------------------
 * That same unfiltered build listed `https://akhilsaxena.com/admin/` — the private CMS, gated by
 * Cloudflare Access, advertised to every crawler. `/admin` carries `export const prerender = false`
 * and emits no file under `dist/client/` at all, so the sitemap was naming a route Static Assets
 * cannot serve and the Worker answers only with a valid Access JWT. That is threat T-05-13-02's
 * named failure mode ("a sitemap that lists a route the site does not serve") arriving through the
 * one route where it is also an information-disclosure finding, and it reached this config only
 * because the build was inspected rather than assumed.
 *
 * WHY THE LIST IS RESTATED HERE RATHER THAN IMPORTED
 * -------------------------------------------------
 * `src/middleware.ts` owns `RUN_WORKER_FIRST_PATTERNS`, the same four patterns `wrangler.jsonc`
 * sets on `assets.run_worker_first`. It is neither exported nor importable from here: that module's
 * first import is `astro:middleware`, a virtual module that exists only inside Astro's own module
 * graph, so pulling it into the config would fail at config load. Exporting the constant means
 * editing a file this plan does not own while 05-12 runs in the same tree.
 *
 * The drift that costs is therefore caught downstream instead of prevented upstream, and it is
 * caught twice: `test/public/seo.node.test.ts` asserts every sitemap URL resolves to a real file
 * under `dist/client/` AND fetches every one of them over HTTP expecting 200. A protected or
 * non-existent route reappearing here fails both, independently of this list. 05-14 should export
 * the constant and collapse the two definitions.
 */
const NON_PUBLIC_SITEMAP_PREFIXES = ['/admin', '/api', '/_actions'];

/**
 * `@astrojs/sitemap` calls this with the page's FULL ABSOLUTE URL, not a pathname — measured:
 * `https://akhilsaxena.com/admin/`. Parsing it rather than matching the raw string means a prefix
 * cannot accidentally match inside the origin.
 */
function isPublicSitemapUrl(page) {
  const { pathname } = new URL(page);
  // `pathname === prefix || startsWith(prefix + '/')`, and NOT a bare `startsWith(prefix)`. The
  // loose form matches `/apifoo` and `/administrators` — the identical trap `src/middleware.ts`
  // documents on its own matcher, where an over-broad pattern is the harmless direction and an
  // under-broad one fails open. Here it is reversed: over-broad silently DROPS a public route from
  // the sitemap, which no build error catches. The two-way check in the suite is what would.
  return !NON_PUBLIC_SITEMAP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default defineConfig({
  // The `output` key is deliberately absent. 'static' is the default, and attaching an
  // adapter does NOT flip it — it only unlocks `export const prerender = false` on the
  // individual routes that need on-demand rendering (/admin and src/pages/api/* from
  // plan 02-04 onward). Every other route stays prerendered HTML on the CDN, which is
  // what buys the Lighthouse budget. 'hybrid' was removed in Astro 5 and no longer
  // exists in the union, so config validation rejects it.
  site: 'https://akhilsaxena.com',

  adapter: cloudflare({
    // Explicit, not decorative: the adapter's own default is 'cloudflare-binding'
    // (see node_modules/@astrojs/cloudflare/dist/utils/image-config.js — `config ??
    // "cloudflare-binding"`), which silently expects the paid Cloudflare Images
    // product. This project ships pre-derived srcset variants from R2 instead, so
    // passthrough is both correct and the only free option.
    imageService: 'passthrough',
  }),

  integrations: [react(), contentGate, sitemap({ filter: isPublicSitemapUrl })],

  vite: {
    /*
     * SANDBOXED BUILDS MUST NOT SHARE ONE VITE CACHE.
     *
     * Three fixtures — `test/pipeline/record-valid`, `test/pipeline/partial-failure` and
     * `test/content/build-fails-loudly` — build in a temp directory and SYMLINK the real
     * `node_modules` into it, so `node_modules/.vite` resolves to the same physical directory for
     * every one of them. Vite pre-bundles into `deps_ssr_temp_<hash>` and then
     * `renameSync`s it onto `deps_ssr`; two concurrent sandboxes race there, and the loser's build
     * exits non-zero. MEASURED (plan 05-15): orphaned `deps_ssr_temp_*` directories of ~1,197
     * entries each, carrying the timestamps of the failing runs, one named verbatim in the error.
     *
     * That is the "recorded intermittent" in `build-fails-loudly` — a real race, not flakiness.
     *
     * `undefined` keeps Vite's own default for every ordinary build, so this changes nothing
     * outside the fixtures; each sandbox sets the variable to a path INSIDE itself, which its own
     * cleanup already removes.
     */
    cacheDir: process.env.PORTFOLIO_VITE_CACHE_DIR || undefined,
  },

  // No sessions. Astro would otherwise auto-provision a Cloudflare KV namespace for a
  // SESSION binding on deploy; nothing here stores server session state (auth is a
  // per-request Access JWT verification), so this keeps the Worker smaller and the
  // account free of a namespace nobody reads.
  session: false,
});
