import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { defineConfig, envField } from 'astro/config';

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

  integrations: [react()],

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
