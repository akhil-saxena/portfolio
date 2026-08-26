import { readFileSync } from 'node:fs';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { defineConfig, envField } from 'astro/config';
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

  integrations: [react(), contentGate],

  // No sessions. Astro would otherwise auto-provision a Cloudflare KV namespace for a
  // SESSION binding on deploy; nothing here stores server session state (auth is a
  // per-request Access JWT verification), so this keeps the Worker smaller and the
  // account free of a namespace nobody reads.
  session: false,

  env: {
    schema: {
      // Both are non-optional and carry no default, on purpose. A default here would
      // be a fail-open path wearing a config hat: the legacy app degraded to a
      // cookie-presence check when Access config was missing, and this is the
      // structural fix for that. Phases 3 and 4 extend this schema with GITHUB_PAT,
      // GITHUB_REPO and R2_PUBLIC_URL — declaring them now would force the developer
      // to provision secrets that nothing in Phase 2 reads.
      CF_ACCESS_TEAM_DOMAIN: envField.string({ context: 'server', access: 'secret' }),
      CF_ACCESS_AUD: envField.string({ context: 'server', access: 'secret' }),
    },
    // FND-04's structural half. Turns a missing CF_ACCESS_AUD into a build/startup
    // error instead of a runtime surprise on the first /admin request.
    validateSecrets: true,
  },
});
