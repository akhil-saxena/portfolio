// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// Phase 0 throwaway playground (D-02).
//
// DELIBERATELY ABSENT, and the absence IS the enforcement mechanism:
//   - `adapter`            (no @astrojs/cloudflare)
//   - `output`             (stays on the 'static' default)
//   - wrangler / CI wiring
//   - src/pages/api/*
//   - any auth dependency
//   - vitest
//
// Adding any of them converts this directory into a Phase 2 foundation
// candidate, which is exactly what the D-02 scope fence exists to prevent.
// Plan 17 deletes this directory and asserts `test ! -d .playground`.

// INLINE_CSS exists so plan 07's cascade probe can run BOTH Astro stylesheet
// settings without editing this file. Editing astro.config.mjs from plan 07
// would be a cross-plan file conflict, so the switch is env-driven here
// instead. 'auto' (Astro's default) inlines small sheets into <style> tags;
// 'never' forces every sheet out to a <link>. The cascade tie between
// :root[data-brand] and :root.dark is order-sensitive, and those two settings
// order differently - so the probe must cover both.
const inlineStylesheets = process.env.INLINE_CSS === "never" ? "never" : "auto";

export default defineConfig({
	integrations: [react()],
	build: {
		inlineStylesheets,
	},

	// REQUIRED by check-bundle.mjs, not a debugging convenience.
	//
	// The DS-09 measurement counts contributing modules by reading each chunk's
	// `.js.map` `sources` array — that is what turns "the bundle is big" into
	// "10 ProseMirror + 23 TipTap + 4 lowlight modules are in it", which is the
	// difference between an assertion and a finding. Sourcemaps are off by
	// default, so dist/_astro holds the 570 KB chunk but no .js.map and the
	// measurement cannot run at all.
	//
	// This MUST live under `vite.build`, not Astro's own `build`. Astro's
	// public config schema has no `sourcemap` key (grep config.d.ts — zero
	// hits) and it does NOT error on the unknown key, it silently drops it.
	// A `build: { sourcemap: true }` here looks correct, passes config
	// validation, builds successfully, and emits no maps.
	//
	// Side effect worth knowing when comparing byte counts: each chunk gains a
	// trailing `//# sourceMappingURL=` comment, so raw sizes run a few dozen
	// bytes above a sourcemap-less build.
	vite: {
		build: {
			sourcemap: true,
		},
	},
});
