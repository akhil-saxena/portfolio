# Stack Research

**Domain:** Static-first personal portfolio/photography site + private admin CMS, on Astro islands over the Cloudflare developer platform
**Researched:** 2026-08-16
**Confidence:** HIGH (all version and config claims verified against npm registry + `withastro/docs` source and `developers.cloudflare.com`; exceptions flagged inline)

---

## Read This First — Three Findings That Change the Plan

The brief asked about "Astro 5" and "Cloudflare Pages." Both premises are stale. Verified today:

### 1. Astro is at **7.2.2**, not 5

`astro@7.2.2` published 2026-08-13. `@astrojs/cloudflare@14.2.1` declares
`peerDependencies: { "astro": "^7.2.0", "wrangler": "^4.83.0" }` — it will hard-fail on
Astro 6.x with a `MISSING_EXPORT` error (this was the entire content of the 14.2.1 patch
release). **Astro 7 requires Node >= 22.12.0 and ships Vite 8.**

### 2. `@astrojs/cloudflare` **removed Cloudflare Pages support**

> "The Astro Cloudflare adapter no longer supports deployment on Cloudflare Pages. For the
> best experience and feature support, you should migrate to Cloudflare Workers."
> — [adapter docs, "Removed: Cloudflare Pages support"](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#removed-cloudflare-pages-support)

This landed in adapter v13 / Astro 6. There is no flag to restore it. **`PROJECT.md`'s
requirement "Deploys to akhilsaxena.com via Cloudflare Pages" is not achievable on this
stack and must be rewritten to Cloudflare Workers.** See [Deployment Target](#deployment-target-workers-not-pages).

### 3. `Astro.locals.runtime` is **removed**; `platformProxy` is **gone**; `astro dev` now runs real `workerd`

The Cloudflare integration is now built on `@cloudflare/vite-plugin`. Consequences:

- Bindings come from `import { env } from 'cloudflare:workers'`, **not** `Astro.locals.runtime.env`.
- **R2 bindings work in `astro dev`** (Miniflare local simulation). The legacy constraint
  *"bindings are absent in local dev — access must be guarded"* is obsolete. Delete that
  guard requirement from the plan; it was a `next dev` artifact.
- `platformProxy: { enabled: true }` is not a valid adapter option any more.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `astro` | `^7.2.2` | Framework, routing, per-route static/on-demand rendering, build | The only framework that makes "39-photo gallery with ~zero JS" and "React admin SPA" the same codebase without shipping React to the public pages. Content Collections + `file()` loader also solve the `data/*.json` validation requirement natively. |
| `@astrojs/cloudflare` | `^14.2.1` | Cloudflare Workers adapter | First-party, required for any `prerender = false` route. Pins `astro ^7.2.0` and `wrangler ^4.83.0`. |
| `@astrojs/react` | `^6.0.2` | React island renderer | First-party. Peer range `react ^17 \|\| ^18 \|\| ^19` — React 19 fully supported, no shim needed. Uses `@vitejs/plugin-react@^5.2.0` internally. |
| `react` / `react-dom` | `^19.2.8` | Island runtime | Hard requirement: `@akhil-saxena/design-system@1.11.4` declares `peerDependencies: react ^19.0.0, react-dom ^19.0.0`. |
| `@akhil-saxena/design-system` | `^1.11.4` (charcoal theme release TBD) | All UI | Project's core value. ESM-only (`"type": "module"`, `exports` has only `import`), which is workerd-safe. See [Design System Integration](#design-system-integration) for the bundle-size caveat. |
| `wrangler` | `^4.123.0` | Local runtime, `wrangler types`, deploy | Peer dep of the adapter. Also the source of generated binding types. |
| `typescript` | `~6.0.2` | Type checking | Matches `../design-system` exactly (it pins `~6.0.2`). `@astrojs/check` peer accepts `^5.0.0 \|\| ^6.0.0`. |

### The Central Rendering Config — Verified Exactly

**Use `output: 'static'` (the default) + an adapter + `export const prerender = false` on the
on-demand routes.** Do not use `output: 'server'`. Do not use `output: 'hybrid'` (it does not
exist).

Verified against [`configuration-reference.mdx`](https://docs.astro.build/en/reference/configuration-reference/#output) — `output` is `'static' | 'server'`, default `'static'`; and
[`on-demand-rendering.mdx`](https://docs.astro.build/en/guides/on-demand-rendering/#enabling-on-demand-rendering), quoted verbatim:

> **By default, your entire Astro site will be prerendered** [...] First, add an adapter
> integration for your server runtime to enable on-demand server rendering in your Astro
> project. Then, add `export const prerender = false` at the top of the individual page or
> endpoint you want to render on demand. The rest of your site will remain a static site.

And the docs' own tip, which is exactly this project's shape:

> Start with the default `'static'` mode until you are sure that **most or all** of your pages
> will be rendered on demand! [...] The `'server'` output mode does not bring any additional
> functionality. It only switches the default rendering behavior.

From [`routing-reference.mdx`](https://docs.astro.build/en/reference/routing-reference/): *"In
static mode, [`prerender`] defaults to `true`. In server mode, it defaults to `false`."*

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  // `output: 'static'` is the default — omit it. Adding an adapter does NOT
  // flip the default; it only unlocks `prerender = false`.
  site: 'https://akhilsaxena.com',
  adapter: cloudflare({
    imageService: 'passthrough',   // see Images section
    // prerenderEnvironment: 'node',  // escape hatch, see Pitfalls
  }),
  integrations: [react()],
  session: false,                  // no sessions -> no KV provisioning, smaller Worker
});
```

Route-by-route:

| Route | Directive | Rationale |
|-------|-----------|-----------|
| `/`, `/work`, `/photos`, `/resume`, `/work/[slug]` | *(nothing — prerendered by default)* | Static HTML on Cloudflare's CDN. Zero Worker invocations. This is what buys Lighthouse 95+. |
| `/admin` | `export const prerender = false` | Lets the page run `requireAccess()` server-side before emitting any HTML — the "fails closed" requirement. A prerendered shell + `client:only` island would also work but cannot fail closed at the server. |
| `/api/*.ts` | `export const prerender = false` | Mandatory. A prerendered endpoint is a build-time-generated static JSON file. |

There is **no `runtime = "edge"` export** in Astro. That was a Next.js concept; delete it from
the port checklist.

### Deployment Target: Workers, not Pages

**Recommendation: Cloudflare Workers with Static Assets, deployed by Workers Builds. Unambiguous.**

Three independent reasons, in decreasing order of force:

1. **The adapter gives you no choice.** Pages support was removed in `@astrojs/cloudflare` v13.
2. **Astro's Cloudflare deploy guide says so**, verbatim: *"Cloudflare recommends using
   Cloudflare Workers for new projects. For existing Pages projects, refer to Cloudflare's
   migration guide and compatibility matrix."*
   ([deploy/cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/))
3. Workers gets all new platform investment (Vite plugin, gradual deployments, Workers Logs,
   remote bindings, Cron Triggers — all ✅ on Workers, ❌ on Pages per Cloudflare's own
   [compatibility matrix](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/#compatibility-matrix)).

**Is Pages deprecated?** No. Cloudflare's docs carry no deprecation banner and Pages remains
"Available on all plans" with continued support and bug fixes (MEDIUM confidence — this is an
absence-of-evidence read of the Pages docs plus secondary sources; Cloudflare has not published
a formal EOL). Practically it is legacy: all new capability ships to Workers first, often
Workers-only. For this project it is moot — the adapter has decided.

**The akhilsaxena.com custom domain — the one real migration risk.** From Cloudflare's
migration guide, verbatim:

> "Unlike Pages, Workers does not support any domain whose nameservers are not managed by
> Cloudflare."

So: **verify akhilsaxena.com is on Cloudflare nameservers before committing to this stack.**
If it is (very likely, since it's already fronting a Pages project), attaching it as a
[Worker Custom Domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
is a dashboard/DNS operation. Cutover plan:

1. Deploy the Worker; validate on its `*.workers.dev` subdomain.
2. Remove the custom domain from the Pages project.
3. Add it as a Custom Domain on the Worker.

There is a brief DNS-propagation gap between steps 2 and 3 — Cloudflare's docs do not
characterise it (LOW confidence on exact duration). Given the site is already down for the
rebuild, this is a non-issue here, but it belongs in the cutover phase, not phase 1.

**CI/CD:** Pages' Git integration becomes [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
Same "push to `main` → rebuild" model, which is what the whole commit-to-deploy admin depends
on. Cloudflare notes Workers Builds *"does not yet have the same level of configurability as
Pages does"* for non-production branch builds — irrelevant for a single-branch personal site.

Build command `npx astro build`, deploy command `npx wrangler deploy`.

### Wrangler Configuration

**Use `wrangler.jsonc`, not `wrangler.toml`.** Every current Astro + Cloudflare doc example is
`.jsonc`; the adapter generates `.jsonc`; JSONC supports comments so nothing is lost.

The config file is now *optional* for projects with no bindings — this project has R2, so it is
required.

```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "akhilsaxena-portfolio",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-08-16",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page"   // required for a custom 404 on Workers
  },
  "observability": { "enabled": true },
  "vars": {
    "GITHUB_REPO": "akhil-saxena/portfolio",
    "R2_PUBLIC_URL": "https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev"
  },
  "r2_buckets": [
    { "binding": "PORTFOLIO_BUCKET", "bucket_name": "portfolio-photos" }
    // add "remote": true to hit the real bucket from `astro dev`
  ]
}
```

`"main"` **must** be `@astrojs/cloudflare/entrypoints/server`. The old
`dist/_worker.js/index.js` value is dead. (Note: Astro's *deploy* guide still shows the old
value in its SSR tab — the *adapter* guide is authoritative and explicitly documents the change.
Treat the deploy guide snippet as a docs bug. MEDIUM confidence that it's simply un-updated.)

Analytics Engine (`PHOTO_ANALYTICS`) is **not** carried over — photo analytics is out of scope
per `PROJECT.md`, and dropping it is what makes the public pages fully static.

### Bindings and Environment Variables

| Kind | How to read it | Example |
|------|----------------|---------|
| Resource binding (R2) | `import { env } from 'cloudflare:workers'` | `env.PORTFOLIO_BUCKET.put(key, body)` |
| Non-secret var | `import { env } from 'cloudflare:workers'` or `astro:env/server` | `env.R2_PUBLIC_URL` |
| Secret (`GITHUB_PAT`, `CF_ACCESS_AUD`) | `astro:env/server` with `access: 'secret'` | `import { GITHUB_PAT } from 'astro:env/server'` |
| `cf` request metadata | `Astro.request.cf` | `Astro.request.cf?.country` |
| `ExecutionContext` | `Astro.locals.cfContext` | `Astro.locals.cfContext.waitUntil(p)` |

**Prefer `astro:env` for the secrets**, because it is the only mechanism that satisfies the
"auth fails closed, no bypass when env vars are unset" requirement *structurally*:

```js
// astro.config.mjs
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      GITHUB_PAT:            envField.string({ context: 'server', access: 'secret' }),
      GITHUB_REPO:           envField.string({ context: 'server', access: 'public' }),
      R2_PUBLIC_URL:         envField.string({ context: 'server', access: 'public' }),
      CF_ACCESS_TEAM_DOMAIN: envField.string({ context: 'server', access: 'secret' }),
      CF_ACCESS_AUD:         envField.string({ context: 'server', access: 'secret' }),
    },
    validateSecrets: true,   // fail at startup, not at first admin request
  },
});
```

Non-optional `envField` + `validateSecrets: true` means a missing `CF_ACCESS_AUD` is a **startup
error**, not a silent downgrade to the legacy cookie-presence fallback. That is the fail-closed
guarantee expressed as configuration rather than as a code review.

Secrets are set with `npx wrangler secret put <KEY>` (production) and `.dev.vars` (local,
gitignored).

**Typing:** run `wrangler types` — it generates the `Env` interface from `wrangler.jsonc`. Wire
it into scripts so it can never go stale (this exact pattern is in the adapter docs):

```json
{
  "scripts": {
    "dev":      "wrangler types && astro dev",
    "build":    "wrangler types && astro check && astro build",
    "preview":  "wrangler types && astro preview",
    "deploy":   "npm run build && wrangler deploy",
    "check":    "biome check .",
    "typecheck":"astro check",
    "test":     "vitest run",
    "test:e2e": "playwright test"
  }
}
```

**Local dev with bindings:** `astro dev` runs the site inside real `workerd` via
`@cloudflare/vite-plugin`, with Miniflare simulating R2/KV/D1/Queues/DO locally. `astro preview`
does the same against the built output. To point `PORTFOLIO_BUCKET` at the *real* bucket during
dev (useful for testing the photo staging flow), add `"remote": true` to the binding.

### Images — Plain `srcset`, No Astro Optimizer

**Verified answer: yes, use a hand-written `<img srcset>`/`<picture>` over the five
pre-generated R2 variants. Do not route the 39 photos through `<Image />`.**

Reasoning:

1. The variants already exist (`thumb` base64 LQIP, `small` 400w, `medium` 800w, `large` 1200w,
   `original` 2000w, all WebP, all watermarked). Astro's optimizer would either no-op or
   re-encode already-optimal assets.
2. Sharp cannot run in `workerd` — the adapter now emits an explicit dev-time warning when
   `imageService: 'custom'` resolves to Sharp, *"since Sharp's native binding cannot run inside
   workerd in dev or production."*
3. The adapter's new default, `imageService: 'cloudflare-binding'`, provisions a Cloudflare
   Images binding and transforms at runtime. For a fully-prerendered gallery that would mean
   paying for runtime transforms of images that are already the right size. **Set
   `imageService: 'passthrough'`** to keep the Worker lean and avoid provisioning an
   Images binding you don't need.

Astro's own guidance ([images guide](https://docs.astro.build/en/guides/images/#choosing-image--vs-img)):
use `<img>` "when you do not want your image optimized by Astro" or "to access and change the
`src` attribute dynamically client-side" — both true for the lightbox.

You must still hand-supply `width`/`height` (or `aspect-ratio`) on every `<img>` to avoid CLS.
`portfolio_images.json` carries `dimensions: { width, height }` — use it. Lighthouse 95+ will
not survive an unsized 39-image masonry grid.

`image.remotePatterns` / `image.domains` **only gate optimization**. Since nothing is being
optimized, they are not required — but add them anyway as documentation-of-intent and to keep
the door open:

```js
image: {
  remotePatterns: [{ protocol: 'https', hostname: 'pub-2d90aedeebcf4142afe524930c3b6471.r2.dev' }],
}
```

**Cloudflare Images / Image Resizing: not recommended for the 39 photos.** It's a paid,
per-transform service solving a problem the GitHub Actions + sharp pipeline already solved at
build time, for free, with watermarking baked in. Keep the existing pipeline.

Note the `thumb` variant is a base64 `data:` URI embedded in the JSON — inline it as the LQIP
blur placeholder with no network round-trip. Do not try to feed a `data:` URI to `<Image />`.

### React Islands and Client Directives

| Island | Directive | Why |
|--------|-----------|-----|
| **Theme toggle** | **Not an island.** Inline `<script is:inline>` in `<head>` + a small `client:idle` React island for the button | This is the FOUC answer. `client:load` still hydrates *after* first paint, so a React-only toggle flashes. The correct pattern is a blocking, unbundled `<script is:inline>` in `<head>` that reads `localStorage` and sets `document.documentElement.classList` before paint. `is:inline` is what keeps Astro from bundling and deferring it. The React button then hydrates `client:idle` and only *mutates* the already-correct state. |
| **Photo lightbox** | `client:idle` on a controller that owns the grid, or `client:visible` if the grid itself is an island | The lightbox must be interactive on first click but is not needed for first paint. `client:load` wastes TBT on a page whose whole point is Lighthouse 95+. Do not `client:visible` the lightbox alone — it has no above-the-fold DOM to observe. |
| **Category filters** | `client:visible` (Photos page) / `client:idle` (Home peek grid) | Interactive, below-ish the fold, cheap. `client:visible` defers the JS until the grid scrolls into view. |
| **Admin app** | `client:only="react"` on a `prerender = false` page | Skips SSR entirely. Correct because (a) the admin is a stateful SPA with no SEO value, (b) it pulls the heavy half of the design system (TipTap, dnd-kit) which you do not want executing during prerender, and (c) it avoids all hydration-mismatch classes of bug. **`client:only` requires the framework string** — `client:only="react"`. |

React 19 caveats with `@astrojs/react@6.0.2`: none blocking. Peer range explicitly includes
`^19.0.0`. Two things to know:

- `experimentalReactChildren: true` exists if passing Astro-rendered children into a React
  island misbehaves; it has a runtime cost, so opt in only on a demonstrated failure.
- `include`/`exclude` are only needed when mixing JSX frameworks. Single-framework project →
  omit them.

### Content and Validation — Astro Content Collections with Zod

**Recommendation: Astro Content Collections + the `file()` loader + Zod schemas, defined in
`src/content.config.ts`. This is the right fit and it satisfies the "schema validation on
`data/*.json` before a commit can break the build" requirement with zero extra dependencies.**

`astro@7.2.2` bundles `zod@^4.3.6` and re-exports it as `astro/zod`. **Do not install Zod
separately** — a second copy risks type-identity mismatches with `defineCollection`. Current
docs import as `import { z } from 'astro/zod'`.

The `file()` loader is documented as: *"creates entries from a single file that contains an
array of objects with a unique `id` field, or an object with IDs as keys and entries as values"*
— and its `fileName` is *"relative to the root directory."* `data/portfolio_images.json` is
literally an array of objects each with a unique `id`. It is a drop-in.

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const photos = defineCollection({
  loader: file('data/portfolio_images.json'),
  schema: z.object({
    id: z.string(),
    title: z.string().min(1),
    category: z.enum(['abstract','architecture','nature','portraits','product','street','wildlife']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    urls: z.object({
      original: z.url(), large: z.url(), medium: z.url(), small: z.url(),
      thumb: z.string().startsWith('data:image/'),
    }),
    exif: z.object({
      camera: z.string().nullable(), lens: z.string().nullable(),
      aperture: z.string().nullable(), shutter: z.string().nullable(),
      iso: z.number().nullable(), focalLength: z.string().nullable(),
    }).nullable().optional(),
    order: z.number().int(),
    dimensions: z.object({ width: z.number().int(), height: z.number().int() }).optional(),
  }),
  // note: `tags` is deliberately omitted — dropped per PROJECT.md
});

// Single-object files: use a parser to synthesise the required `id`
const resume = defineCollection({
  loader: file('data/resume.json', {
    parser: (text) => ({ resume: JSON.parse(text) }),   // keyed object => id "resume"
  }),
  schema: /* ... */,
});

export const collections = { photos, resume /* , homeConfig, siteConfig */ };
```

**This is the load-bearing win:** a schema violation in a commit fails `astro build`, which
fails the Workers Build, which means the bad data never reaches production. That is exactly the
requirement. The same schemas are then reused in `/api/deploy` to validate the payload *before*
committing — so the admin rejects bad data at write time and the build rejects it at read time.

Two friction points, both minor:

- `data/resume.json`, `data/home_config.json`, and `data/site_config.json` are single objects,
  not arrays. Wrap them via `parser` as above (one entry, id = a constant). Slightly awkward.
  Acceptable alternative for these three: skip collections and use a plain
  `import resume from '../../data/resume.json'` + `ResumeSchema.parse(resume)` at module scope
  in the page frontmatter — same build-time failure behaviour, less ceremony. **Use collections
  for `photos` (where querying/filtering/sorting earns its keep) and direct import + parse for
  the three config singletons.**
- `astro:content` types require `"include": [".astro/types.d.ts", "**/*"]` in `tsconfig.json`
  and an `astro sync` after schema edits.

**Zod v4 vs Valibot:** use Zod, because Astro already ships it. Valibot's bundle-size advantage
(the only real reason to prefer it) is irrelevant here — validation runs at build time and in
the Worker, never in the browser.

### HTML Sanitization — `ultrahtml/transformers/sanitize`

**Recommendation: `ultrahtml`'s `sanitize` transformer, applied at build time in the résumé
page's frontmatter, with an allowlist of `<strong>`, `<em>`, `<a>`.**

Why this and not the obvious candidates:

| Candidate | Verdict |
|-----------|---------|
| `ultrahtml` `^1.7.0`, `import sanitize from 'ultrahtml/transformers/sanitize'` | **Use this.** Zero runtime dependencies (verified: `npm view ultrahtml dependencies` is empty), pure JS, works in `workerd` and Node alike. Already in the tree as a direct dependency of both `astro` and `@astrojs/react`, so it costs nothing. |
| `isomorphic-dompurify` `3.22.0` | **Reject.** Pulls `jsdom` on the server side. Will not run in `workerd`, and would force `prerenderEnvironment: 'node'`. |
| `sanitize-html` `2.17.7` | **Avoid.** Node-oriented (htmlparser2 + lodash lineage), heavy, and hostile to the workerd prerender default. Only reachable if you also flip `prerenderEnvironment: 'node'`. |
| `dangerouslySetInnerHTML` with no sanitizer | The exact bug being fixed (`Timeline.tsx:48`). |

Critical detail: **the résumé page is prerendered, and as of Astro 6 prerendering runs in
`workerd` by default.** That is precisely why the sanitizer must be edge-safe even though it
"only runs at build time." A Node-only sanitizer would either crash the build or force the
`prerenderEnvironment: 'node'` escape hatch for the whole site.

Best-of-both: sanitize **twice** — once in `/api/deploy` before the bullet is committed
(so the repo never contains hostile markup), and once at render (so a hand-edited commit can't
bypass it). Cheap, and it makes the invariant hold regardless of write path.

Structural alternative worth one sentence of consideration: change the `bullets` contract from
"HTML string" to a small structured type (`{ text, emphasis[] }`) and render it with React
elements. That eliminates the injection surface entirely rather than filtering it. Higher
migration cost against 4 existing résumé entries; flag as a roadmap option, not a default.

### Auth — `jose` v6

**Recommendation: `jose@^6.2.9`. Confirmed correct for Workers.**

- `jose` v6's `.` export resolves to `./dist/webapi/index.js` — the Web Crypto build, no Node
  built-ins. Its keywords include `cloudflare`, `edge`, `workerd`-adjacent runtimes.
- **Cloudflare's own JWT validation doc uses `jose`** with exactly this shape:
  ```js
  const JWKS = jose.createRemoteJWKSet(new URL(CERTS_URL));
  const result = await jose.jwtVerify(token, JWKS, { issuer: TEAM_DOMAIN, audience: AUD });
  ```
- JWKS URL: `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/certs`
- Validate `aud` (the Access application's AUD tag) and `iss` (`https://<team>.cloudflareaccess.com`).
  `exp` is checked implicitly by `jwtVerify`.
- Read the **`Cf-Access-Jwt-Assertion` header**, not the cookie. Cloudflare, verbatim: *"We
  recommend validating the `Cf-Access-Jwt-Assertion` header instead of the `CF_Authorization`
  cookie, since the cookie is not guaranteed to be passed."*

The legacy `jose@^5.9.6` → v6 upgrade is API-compatible for `createRemoteJWKSet` + `jwtVerify`.

**JWKS caching:** `createRemoteJWKSet` handles fetch + in-memory cache + cooldown internally.
Keep the legacy module-level `Map` keyed by team domain so the JWKS set survives across requests
within an isolate. Do **not** add a KV cache layer — unnecessary, and it adds a failure mode to
the auth path.

**Fail closed, concretely:**

```ts
// src/lib/access.ts — no fallback branch exists
import { CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD } from 'astro:env/server';
// If either is unset, astro:env has already failed the build/startup.
// There is no `if (!teamDomain) return allow` path to regress into.
```

**Where to enforce:** per-route `await requireAccess(request)` at the top of every mutating
endpoint, mirroring the legacy pattern. **Middleware is a trap here** — Astro middleware *"runs
at build time for all prerendered pages"*, so a naive `src/middleware.ts` that denies
unauthenticated requests would run during `astro build` against the public pages. If you do add
middleware, gate it on `context.isPrerendered` and a path prefix. Per-route guards are simpler
and are what the test suite should target.

### Testing

**Recommendation: Vitest 4 + `@cloudflare/vitest-pool-workers` for the auth/API boundary,
`@testing-library/react` for islands, Playwright for E2E.** This mirrors `../design-system`
(Vitest 4 + Playwright + Testing Library) so there is one testing idiom across both repos.

| Layer | Tool | Notes |
|-------|------|-------|
| Astro component render | `vitest` + `experimental_AstroContainer` from `astro/container` | Astro's official component-test story (`AstroContainer.create()` → `renderToString(Component, { props, slots })`). Stable since 4.9. |
| React islands | `vitest` + `@testing-library/react@^16.3.2` + `jsdom@^30` | TL peer range covers React 19. DS uses `jsdom@^25`; go to 30 here, no reason to pin old. |
| **Auth boundary + API routes** | `@cloudflare/vitest-pool-workers@^0.21.3` | **This is the important one.** It runs tests *inside `workerd`* with real bindings and Miniflare-simulated R2. It is the only way to actually test that `requireAccess()` fails closed and that R2 writes work — a jsdom test would prove nothing about the runtime that ships. Peers `vitest ^4.1.0`. |
| E2E | `@playwright/test@^1.62.1` | Point `webServer.command` at `npm run preview` (real `workerd`), not `astro dev`. |

Vitest config uses Astro's helper, which loads `astro.config.mjs` into the test env:

```ts
// vitest.config.ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';
export default getViteConfig({ test: { /* ... */ } });
```

Version compatibility is clean: `vitest@4.1.10` peers `vite ^6 || ^7 || ^8`, and Astro 7 ships
Vite 8. Note the workers pool needs its own Vitest project/workspace entry — it cannot share a
config with the jsdom project.

Coverage targets, from `PROJECT.md`: the auth boundary, the publish path (`/api/deploy` +
optimistic concurrency on a **real** `baseSha`), and the photo pipeline.

### Tooling

**Package manager: npm.** `../design-system` uses `package-lock.json`. Cross-repo `file:`
linking works fine with npm and creates a symlink. Introducing pnpm here would mean two package
managers across two repos that must be linked together during development — pure friction for
zero gain at this scale. **Also: drop `.npmrc`'s `legacy-peer-deps=true`.** It existed to paper
over Next.js/React 19 peer conflicts; nothing in this stack needs it, and keeping it would hide
a real peer break (e.g. an adapter/astro version mismatch) behind a silent install.

**Linting/formatting: Biome, matching the design system.** But with a caveat that must be
planned around: **Biome's `.astro` support is experimental** (v2.3.0+, must be explicitly
enabled via `html.experimentalFullSupportEnabled` + `html.formatter.enabled`, and the docs warn
it "may produce false positives").

Prescription:

- `@biomejs/biome@^2.5.8` for `.ts`, `.tsx`, `.css`, `.json` — which is the large majority of
  the code (all islands, all API routes, all libs). Fully supported, no caveats.
  (`../design-system` is on Biome `^1.9.4`; bumping the portfolio to 2.x is fine — they are
  separate repos with separate configs. Consider bumping the DS too, separately.)
- **`astro check` (`@astrojs/check@^0.9.10`) is the real correctness gate for `.astro` files** —
  it type-checks the frontmatter and templates, which Biome does not. Put it in CI and in the
  `build` script.
- For `.astro` *formatting*, `prettier@^3.9.6` + `prettier-plugin-astro@^0.14.1` is the mature
  option, scoped to `**/*.astro` only. Running Prettier on `.astro` and Biome on everything else
  is a slightly ugly but well-trodden split. Do **not** enable Biome's experimental HTML
  formatter on `.astro` in a project that also has to ship.

**CI (`.github/workflows/ci.yml`):** Node 22 (Astro requires `>=22.12.0` — the legacy CI's Node
22 is fine, but `process-photos.yml`'s Node 20 must be bumped for any job that touches the Astro
build). Steps: `npm ci` → `biome check .` → `astro check` → `astro build` → `vitest run`.

### Design System Integration

`@akhil-saxena/design-system@1.11.4` is ESM-only with a single barrel entry (`./dist/index.js`)
plus `./hooks`, `./icons`, and CSS subpaths (`./tokens.css`, `./primitives.css`,
`./utilities.css`, `./css/*`). `"sideEffects": ["*.css"]` is declared, which is what makes JS
tree-shaking possible.

**The Lighthouse risk is real and specific.** The barrel's dependency graph includes
`@tiptap/*` (8 packages), `@tiptap/pm` (ProseMirror), `lowlight`, `@dnd-kit/*`, and
`lucide-react@^1.14.0`. A public-page island that does `import { Lightbox } from
'@akhil-saxena/design-system'` will only stay small if Rollup successfully tree-shakes TipTap
and ProseMirror out. That usually works with a properly-built ESM barrel, but it is exactly the
kind of thing that silently regresses.

Mitigations, in order of preference:

1. **Measure it in Phase 1**, before building the gallery on top of it. `npx astro build` then
   inspect `dist/_astro/*.js` sizes. If a public island pulls in ProseMirror, that is a design
   system finding — which is explicitly what `PROJECT.md` wants ("any gap it exposes is a
   finding rather than a workaround").
2. If it regresses, the fix belongs in the DS (add per-component subpath exports), not in the
   portfolio.
3. Keep TipTap-dependent components (rich editors) strictly inside the `client:only` admin
   island so they can never land in a public bundle regardless.

**Fonts.** The DS bundles `@fontsource/{archivo,inter,jetbrains-mono}` and
`@fontsource-variable/newsreader`. **Playfair Display is not among them.** Two options:

- Ship Playfair from the design system as part of the charcoal theme release (consistent with
  "the theme lives in the DS"), or
- Use **Astro's built-in `fonts` config** (stable top-level API since Astro 6 — verified in the
  configuration reference), which self-hosts, subsets, and generates optimized fallback metrics:
  ```js
  import { defineConfig, fontProviders } from 'astro/config';
  export default defineConfig({
    fonts: [{ provider: fontProviders.google(), name: 'Playfair Display', cssVariable: '--font-playfair' }],
  });
  ```

Prefer the second for the portfolio and let the DS own only the *token* (`--font-display`) that
points at it — otherwise the DS grows a font dependency that only one consumer wants. Either
way, do not load Playfair from `fonts.googleapis.com` at runtime; that's a render-blocking
third-party request against a Lighthouse 95+ budget.

---

## Installation

```bash
# Core
npm install astro@^7.2.2 @astrojs/cloudflare@^14.2.1 @astrojs/react@^6.0.2 \
  react@^19.2.8 react-dom@^19.2.8 @akhil-saxena/design-system@^1.11.4

# Supporting (runtime)
npm install jose@^6.2.9 ultrahtml@^1.7.0
# zod is NOT installed — use `astro/zod` (astro bundles zod ^4.3.6)

# Dev
npm install -D wrangler@^4.123.0 typescript@~6.0.2 @astrojs/check@^0.9.10 \
  @types/react@^19 @types/react-dom@^19 \
  @biomejs/biome@^2.5.8 prettier@^3.9.6 prettier-plugin-astro@^0.14.1 \
  vitest@^4.1.10 @vitest/coverage-v8@^4.1.10 \
  @cloudflare/vitest-pool-workers@^0.21.3 \
  @testing-library/react@^16.3.2 @testing-library/jest-dom@^6.9.1 jsdom@^30.0.1 \
  @playwright/test@^1.62.1

# GitHub Actions photo pipeline only (never bundled into the Worker) — unchanged from legacy
npm install -D sharp@^0.34.5 exifr@^7.1.3 @aws-sdk/client-s3@^3.1019.0

# Scaffolding shortcut that writes astro.config + wrangler.jsonc for you:
npx astro add cloudflare react
```

Do **not** install `@cloudflare/workers-types`. `wrangler types` generates the runtime types
(including your `Env`) and is the current recommendation; a hand-added `@cloudflare/workers-types`
can conflict with it.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Cloudflare Workers + Static Assets | Cloudflare Pages | Only if you abandon `@astrojs/cloudflare` and go pure-static with no `/api/*`. Not viable — the admin needs server routes. |
| `output: 'static'` + `prerender = false` on 2 route groups | `output: 'server'` + `prerender = true` on 5 pages | If the admin ever grew to outnumber public pages. Today it's 2 on-demand vs ~6+ static — `'static'` is correct and Astro's docs explicitly advise starting there. |
| `imageService: 'passthrough'` | `'cloudflare-binding'` (the adapter default) | If you ever accept arbitrary user-uploaded images that lack pre-generated variants. Then runtime transforms earn their keep. |
| `imageService: 'passthrough'` | `'compile'` + Sharp, with `prerenderEnvironment: 'node'` | If you decide to optimize *local* `src/` images at build time. Costs you the workerd-fidelity prerender. |
| Zod via `astro/zod` | Valibot 1.4.2 | Only if validation ever runs client-side and bundle size matters. It doesn't here. |
| Content Collections `file()` for photos | Plain `import` + `schema.parse()` | Use for the three single-object config files — collections' array/keyed-object contract makes singletons awkward. Recommended split is already stated above. |
| `ultrahtml/transformers/sanitize` | Restructure `bullets` to typed segments, no HTML at all | Strictly better security posture. Worth doing if the résumé editor is being rewritten anyway (it is). Flag as a roadmap decision. |
| npm | pnpm | If the portfolio and design system ever become a monorepo. As two sibling repos linked by `file:`, npm is simpler. |
| Biome (TS/TSX/CSS) + `astro check` + Prettier (`.astro`) | Biome experimental `.astro` full support | Revisit once Biome's HTML/Astro support leaves experimental. Tracking it is a maintenance task, not a phase-1 decision. |
| `wrangler.jsonc` | `wrangler.toml` | Never for a new project. Every current doc example is `.jsonc`, and the adapter emits `.jsonc`. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `output: 'hybrid'` | **Removed in Astro 5.** Does not exist in the `'static' \| 'server'` union. Config validation will reject it. | `output: 'static'` (default) + `export const prerender = false` |
| Cloudflare **Pages** as the deploy target | **`@astrojs/cloudflare` v13+ removed Pages support entirely.** No flag restores it. | Cloudflare Workers + Static Assets, deployed via Workers Builds |
| `@cloudflare/next-on-pages` | Next.js-only build adapter. Nothing in the new stack uses it. | `@astrojs/cloudflare` |
| `export const runtime = "edge"` | A Next.js App Router directive. Meaningless in Astro; will be silently ignored, giving false confidence. | `export const prerender = false` |
| `Astro.locals.runtime.env` / `.cf` / `.caches` / `.ctx` | **Removed in adapter v13.** Most Astro+Cloudflare tutorials still show it — it will be `undefined`. | `import { env } from 'cloudflare:workers'`; `Astro.request.cf`; global `caches`; `Astro.locals.cfContext` |
| `platformProxy: { enabled: true }` adapter option | **Gone.** Replaced by `@cloudflare/vite-plugin`; `astro dev` runs real `workerd` with local bindings automatically. | Nothing — it's the default behaviour now |
| `workerEntryPoint` adapter option | Removed in v13. | Set `"main"` in `wrangler.jsonc`, import `handle` from `@astrojs/cloudflare/handler` |
| `cloudflareModules` adapter option | Removed in v13 — workerd natively imports `.wasm`/`.bin`/`.txt`. | Nothing |
| `"main": "dist/_worker.js/index.js"` | Dead entrypoint path. Astro's *deploy* guide still shows it; the *adapter* guide documents the change. | `"main": "@astrojs/cloudflare/entrypoints/server"` |
| Guarding binding access "because bindings are absent in local dev" | Obsolete constraint inherited from `next dev`. Miniflare simulates R2 locally in `astro dev`. Keeping the guards means a broken binding fails *silently* instead of loudly. | Let it throw. Add `"remote": true` if you want the real bucket. |
| A separate `zod` install | Astro bundles `zod ^4.3.6`; a second copy causes type-identity mismatches with `defineCollection`. | `import { z } from 'astro/zod'` |
| `isomorphic-dompurify` / `sanitize-html` | Both drag in Node-only machinery (`jsdom`, htmlparser2 lineage). Won't run in `workerd`, and prerendering now defaults to `workerd`. | `ultrahtml/transformers/sanitize` |
| `sharp` anywhere in the Astro app | Native binding; **cannot** run in `workerd` in dev or production. The adapter now warns about this explicitly. | Keep sharp confined to `scripts/*` on the GitHub Actions Node runner (unchanged from legacy) |
| `@cloudflare/workers-types` as a devDep | Superseded by `wrangler types`; can conflict with generated declarations. | `wrangler types` in the `dev`/`build`/`preview` scripts |
| `.npmrc` `legacy-peer-deps=true` | A Next.js/React-19 workaround. Carrying it forward hides genuine peer breaks (e.g. astro/adapter mismatch). | Delete it; fix peers properly |
| A blanket auth `src/middleware.ts` | Middleware **runs at build time for prerendered pages** — it would execute against the public site during `astro build`. | Per-route `await requireAccess(request)`; if middleware is used, gate on `context.isPrerendered` + path prefix |
| Analytics Engine binding (`PHOTO_ANALYTICS`) | Out of scope per `PROJECT.md`; it's the one thing that would force a runtime onto public pages. | Nothing |
| Loading Playfair from `fonts.googleapis.com` | Render-blocking third-party request against a Lighthouse 95+ budget. | Astro's `fonts` config with `fontProviders.google()` (self-hosts + subsets + fallback metrics) |

---

## Stack Patterns by Variant

**If a prerendered page fails to build inside `workerd`** (CJS `require`, a native binding, or a
design-system transitive dep that isn't ESM-clean):
- Set `adapter: cloudflare({ prerenderEnvironment: 'node' })`
- Because Astro 6+ prerenders in `workerd` by default to match production. Public pages are
  static HTML on the CDN and never touch production `workerd`, so there is no fidelity loss in
  flipping to `'node'` — only a loss of early warning. This is a **likely Phase 1 decision
  point** given the DS pulls TipTap/ProseMirror/lucide.
- Narrower first attempt: a Vite plugin using `optimizeDeps.include` to pre-compile the specific
  offending dep (pattern documented in the adapter's upgrade guide).

**If `astro dev` needs the real R2 bucket** (testing the `temp/` staging → `workflow_dispatch`
flow end to end):
- Add `"remote": true` to the `PORTFOLIO_BUCKET` entry in `wrangler.jsonc`
- Because Miniflare's local R2 starts empty; remote bindings talk to the deployed bucket.

**If a public island's JS budget blows up:**
- Import from DS subpaths (`/hooks`, `/icons`) rather than the barrel, and confirm TipTap is
  tree-shaken out of `dist/_astro/*.js`
- Because the barrel's transitive graph includes ProseMirror. If subpaths don't exist for the
  component you need, **that is the design-system finding** — fix it upstream.

**If akhilsaxena.com's nameservers are not on Cloudflare:**
- Move them to Cloudflare before cutover, or the Worker cannot serve the apex domain at all
- Because Workers, unlike Pages, requires Cloudflare-managed nameservers. Verify this in Phase 0.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@astrojs/cloudflare@14.2.1` | `astro ^7.2.0`, `wrangler ^4.83.0` | **Hard pin.** `astro@7.0.x`–`7.1.x` fail at build with `MISSING_EXPORT` — the adapter imports `beginContentEntryCollection`/`beginImageCollection`/`endContentEntryCollection`/`endImageCollection` from `astro/app`, added only in 7.2.0. |
| `astro@7.2.2` | Node `>=22.12.0`, npm `>=9.6.5` | Bump `.github/workflows/*.yml` off Node 20. Add `.nvmrc` + `engines` — the legacy repo had neither. |
| `astro@7.2.2` | `vite ^8.0.13`, `zod ^4.3.6` | Both are direct deps of `astro`. Any Vite plugin you add must support Vite 8. |
| `@astrojs/react@6.0.2` | `react ^17 \|\| ^18 \|\| ^19`, Node `>=22.12.0`, `@vitejs/plugin-react ^5.2.0` | React 19 fully supported. Note DS dev-deps `@vitejs/plugin-react@^4` — irrelevant, separate repo. |
| `@akhil-saxena/design-system@1.11.4` | `react ^19.0.0`, `react-dom ^19.0.0` (peers) | ESM-only, `type: module`, `sideEffects: ["*.css"]`. workerd-friendly on paper; verify empirically during prerender. |
| `vitest@4.1.10` | `vite ^6 \|\| ^7 \|\| ^8` | Clean with Astro 7's Vite 8. |
| `@cloudflare/vitest-pool-workers@0.21.3` | `vitest ^4.1.0`, `@vitest/runner ^4.1.0`, `@vitest/snapshot ^4.1.0` | Needs its own Vitest project entry; cannot share a config with the jsdom project. |
| `@testing-library/react@16.3.2` | `react ^18 \|\| ^19`, `@testing-library/dom ^10` | `@testing-library/dom` is a peer — install it explicitly. |
| `@astrojs/check@0.9.10` | `typescript ^5.0.0 \|\| ^6.0.0` | Works with the DS's `typescript ~6.0.2`. |
| `jose@6.2.9` | Web Crypto only (`dist/webapi`) | No Node built-ins. v5 → v6 is API-compatible for `createRemoteJWKSet` + `jwtVerify`. |
| `@biomejs/biome@2.5.8` | TypeScript 5.9 (stated ceiling) | Biome's stated TS support is 5.9 while the project is on TS 6.0 — Biome may not parse the newest 6.x-only syntax. Low practical risk (this codebase won't use exotic syntax), but `astro check`/`tsc` is the real type gate. MEDIUM confidence. |

---

## Sources

- npm registry (`npm view`, queried 2026-08-16) — exact `latest` versions, `peerDependencies`,
  `engines`, `exports`, `dependencies` for every package named above. **HIGH**
- `/withastro/docs` via Context7 (`ctx7 docs`) — `output`/`prerender` semantics, static vs server
  mode. **HIGH**
- `raw.githubusercontent.com/withastro/docs/main/.../reference/configuration-reference.mdx` —
  `output` type/default, `fonts` (stable since 6.0), `image.remotePatterns`. **HIGH**
- `.../guides/on-demand-rendering.mdx` — verbatim per-route prerender guidance and the
  "start with `'static'`" tip. **HIGH**
- `.../guides/integrations-guide/cloudflare.mdx` — Pages removal, `Astro.locals.runtime` removal,
  `main` entrypoint change, `imageService` values/default, `prerenderEnvironment`, `wrangler types`,
  workerd dev, sessions, node compat. **HIGH**
- `.../guides/deploy/cloudflare.mdx` — "Cloudflare recommends using Cloudflare Workers for new
  projects"; Workers Builds setup; `not_found_handling`. **HIGH** (one stale `main` snippet noted)
- `.../guides/upgrade-to/v7.mdx` — Vite 8, Rust compiler, `compressHTML: 'jsx'`, `src/fetch.ts`
  reserved, Sätteri markdown default, `@astrojs/db` removed. **HIGH**
- `.../reference/content-loader-reference.mdx`, `.../guides/content-collections.mdx` — `file()`
  loader contract, `parser`, `astro/zod`. **HIGH**
- `.../guides/images.mdx` — `<Image />` vs `<img>`, authorizing remote images, passthrough. **HIGH**
- `.../guides/testing.mdx` — `getViteConfig()`, Container API, Playwright `webServer`. **HIGH**
- `.../guides/middleware.mdx` — "This rendering occurs at build time for all prerendered pages."
  **HIGH**
- `.../guides/environment-variables.mdx` — `envField`, `validateSecrets`, secret/public matrix.
  **HIGH**
- `packages/integrations/cloudflare/CHANGELOG.md` (withastro/astro) — 14.2.1 peer-range fix,
  14.2.0 image service object form, Sharp-in-workerd warning. **HIGH**
- `developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/` —
  JWKS URL, `aud`/`iss` claims, "validate the header not the cookie", `jose` example. **HIGH**
- `developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/` —
  compatibility matrix, Workers Builds swap, "Workers does not support any domain whose
  nameservers are not managed by Cloudflare." **HIGH**
- `developers.cloudflare.com/workers/development-testing/` — Miniflare local simulation of
  R2/KV/D1/Queues/DO; `"remote": true`. **HIGH**
- `biomejs.dev/internals/language-support/` — Astro support experimental (v2.3.0+), opt-in,
  TS 5.9 ceiling. **MEDIUM** (fetched summary, not raw source)
- Secondary (Pages "maintenance mode" framing) — WebSearch, community posts. **LOW**; treated as
  colour only. Cloudflare has published no formal deprecation, and the decision here rests on the
  adapter, not on Pages' status.
- `../design-system/package.json` read directly — v1.11.4, npm, Biome 1.9.4, Vitest 4,
  Playwright 1.59, TS ~6.0.2, tsup. **HIGH**

---

## Open Questions for the Roadmap

1. **`PROJECT.md` says "Cloudflare Pages." It must be changed to Cloudflare Workers.** This is
   not a preference; the adapter removed Pages support. Update the requirement and the Key
   Decisions table.
2. **Are akhilsaxena.com's nameservers Cloudflare-managed?** Blocks the entire deploy target if
   not. Phase 0 verification, one dashboard check.
3. **Does the design-system barrel prerender cleanly in `workerd`?** Unknown until measured. If
   not, `prerenderEnvironment: 'node'` is the one-line fix, but it should be a conscious call.
4. **Does a public island tree-shake TipTap/ProseMirror out?** Measure in Phase 1; a failure here
   is a design-system finding, which is the project's stated purpose.
5. **Playfair Display: DS theme or `astro:fonts`?** Recommendation is `astro:fonts` in the
   portfolio with the DS owning only the token, but this crosses the repo boundary and should be
   settled before the theme release is cut.
6. **Keep `bullets` as HTML + sanitize, or restructure to typed segments?** Sanitization is the
   safe default; restructuring eliminates the class of bug. Cheap to decide now, expensive later.

---
*Stack research for: static-first Astro islands portfolio + Cloudflare Workers admin CMS*
*Researched: 2026-08-16*
