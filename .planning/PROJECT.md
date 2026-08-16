# akhilsaxena.com — Portfolio Rebuild

## What This Is

A personal portfolio and photography site for Akhil Saxena — frontend engineer and
photographer. Four public views (a two-act Home, Work, Photos, Résumé) plus case-study
pages for his own projects, and a private `/admin` CMS he uses to edit content and
publish photos without touching a terminal. It is being rebuilt from scratch on Astro +
React islands, consuming his own published design system,
[`@akhil-saxena/design-system`](https://www.npmjs.com/package/@akhil-saxena/design-system).

The audience is people evaluating him professionally — hiring managers, collaborators,
peers — and himself, as the person who adds photos on a Sunday.

## Core Value

**The site must be the proof that the design system works.** A component library's
strongest possible argument is a real product built on it — so if a tradeoff arises
between shipping something bespoke and shipping it out of the design system, the design
system wins, and any gap it exposes is a finding rather than a workaround.

## Requirements

### Validated

<!--
These are validated as PRODUCT requirements — the live Next.js site proved people want
them and that Akhil uses them. None of them are built in the new stack. They are
"validated" in the sense that we are not re-litigating whether to have them, only how
to rebuild them.
-->

- ✓ Photo gallery over 39 images across 7 categories — live site
- ✓ Résumé rendered from structured data + downloadable PDF — live site
- ✓ Project/work showcase — live site
- ✓ Private admin CMS with commit-to-deploy publishing — live site
- ✓ Photo upload pipeline with automated resize + EXIF extraction — live site
- ✓ Dark/light theme toggle with persistence — live site + handoff spec

### Active

**Foundation**

- [ ] Charcoal/ochre/Playfair identity ships as a theme from `@akhil-saxena/design-system`, published to npm
- [ ] Theme's light mode passes the design system's own WCAG AA contrast contract
- [ ] Astro 7 + React islands app on `@astrojs/cloudflare`, public pages prerendered
- [ ] Deploys to akhilsaxena.com via **Cloudflare Workers + Static Assets** (not Pages)
- [ ] All 39 photo URLs migrated off `pub-*.r2.dev` onto a cached R2 custom domain
- [ ] `/portfolio` → `/photos` 301, and `akhilsaxena.pages.dev` → apex 301

**Public site**

- [ ] Two-act Home — identity + photo grid above the fold, work below
- [ ] Work page listing four own projects + Brevo engineering
- [ ] Photos gallery — masonry, category filters, all 39 photos
- [ ] Photo lightbox showing EXIF (camera, lens, aperture, shutter, ISO, focal length)
- [ ] Résumé page from `resume.json` + static PDF download
- [ ] Project case-study pages — problem, decisions, outcome
- [ ] Dark/light toggle, persisted, dark by default
- [ ] Respects `prefers-reduced-motion`

**Admin**

- [ ] Authenticated `/admin` that fails closed — no auth bypass when env vars are unset
- [ ] Edit résumé, home config, and site config through design-system form components
- [ ] Upload photos via R2 staging → `workflow_dispatch` → processing → commit
- [ ] Publish changes by committing to the repo, triggering a Pages rebuild
- [ ] Concurrent-edit protection that actually engages (real base SHA, not `"latest"`)

**Quality**

- [ ] Lighthouse 95+ across the board on public pages
- [ ] Résumé bullets rendered without an unsanitized HTML injection path
- [ ] Schema validation on `data/*.json` before a commit can break the build
- [ ] Test coverage on the auth boundary, the publish path, and the photo pipeline

### Out of Scope

- **Photo view analytics** — considered and cut. It was the only thing forcing a server
  runtime onto the public pages; dropping it makes the whole public site statically
  prerenderable and removes an attack surface. Telemetry on a personal site did not
  justify that cost.
- **Blog / writing section** — never part of the vision; Akhil hasn't considered wanting
  one. Revisit as a v2 milestone if that changes.
- **Generating the résumé PDF from `resume.json`** — the PDF stays hand-maintained.
  Automating it is work with no reader-visible payoff.
- **Porting the inline WYSIWYG admin** — the legacy admin grew a WYSIWYG editor with a
  properties panel and draggable masonry. The rebuild uses plain form editors with a
  preview pane instead: fewer moving parts, and design-system inputs already carry the
  accessibility work.
- **Photo `tags` field** — present in the schema, unused by all 39 photos. Dropped.
- **Keeping the legacy Next.js app running in parallel** — `main` was deliberately
  purged; downtime during the rebuild was accepted explicitly.

## Context

**The legacy app.** A Next.js 15 App Router site on Cloudflare Pages via
`@cloudflare/next-on-pages`, preserved on branch `legacy/nextjs-portfolio` at `1435ac1`
and purged from `main` in `92a9bb5`. It is fully mapped in `.planning/codebase/` — that
map is the porting reference for the admin CMS and content pipeline, which are the only
parts being carried forward rather than replaced.

**What the map found that changes the rebuild.** Four issues that would have been
faithfully reproduced as bugs:

1. **Stored XSS** — `Timeline.tsx:48` and three admin components render résumé bullets
   through `dangerouslySetInnerHTML` with no sanitization anywhere in the repo.
2. **Silent data loss** — `DeployButton.tsx:86` hardcodes `baseSha: "latest"`, disabling
   the optimistic-concurrency guard at `deploy/route.ts:87-102`, so a deploy can clobber
   whatever the photo pipeline just committed. The fix is written in a code comment that
   was never acted on.
3. **Auth fails open** — `access.ts:38-61` falls back to checking only that a cookie
   *exists* when `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` are unset.
4. **A second, composed fail-open path** (found in research, not in the legacy code):
   Astro prerenders `src/pages/api/*` **by default** under `output: 'static'`, and
   Cloudflare Workers serve **static assets before the Worker** — the opposite of Pages,
   where Functions ran first. Miss `export const prerender = false` on one endpoint and
   Cloudflare serves a build-time-baked file; `requireAccess()` is never invoked, and a
   prerendered `GET /api/data` returns plausible JSON so smoke tests still pass.
   Mitigation: `run_worker_first: ["/admin","/admin/*","/api/*"]` plus a build assertion
   that `dist/api/` does not exist.
5. **`baseSha` has a root cause, not just a bug.** HEAD-comparison is *too strict* — the
   photo pipeline commits constantly, so it 409s unrelated edits. Someone hit that and
   disabled the guard. The fix is per-file **blob**-SHA comparison (GitHub's
   `PUT /contents/{path}` wants the blob SHA of the file being replaced and returns 409 on
   mismatch), not "remember to pass a real SHA".
6. **The documented pipeline is dead code** — `AGENTS.md` describes an R2 `temp/` →
   `/api/dispatch` → `workflow_dispatch` flow, but nothing calls it. The live path is
   `/api/upload` base64-ing images straight into `new-photos/` via the GitHub Contents
   API. The rebuild deliberately implements the *documented* design, not the live one:
   it keeps binaries out of git history and off the base64-through-a-Worker route.

Seven admin components (`PhotoGrid`, `PhotoEditModal`, `PreviewPanel`, `ExperienceEditor`,
`EducationEditor`, `ProjectEditor`, `SkillsEditor`) are unreferenced dead code, so the
admin surface being ported is smaller than its file count suggests. There are no tests
anywhere in the repo.

**The design handoff.** `design_handoff_portfolio/` holds four HTML prototypes plus a
detailed spec. High fidelity on Home; Work and Photos are an earlier ivory-themed
iteration that must be ported to the dark palette. It contains **no design at all for
`/admin` or for project case-study pages** — Phase 0 has to produce those.

**The design system.** v1.11.4, 80 components, token-driven, fully dark-mode capable,
with contrast invariants enforced by tests in `src/tokens.test.ts`. It already ships the
hard parts of this site: `Lightbox`, `InfiniteList`, `Pagination`, `Chip`,
`SegmentedControl`, `Timeline`, `StatCard`, `AppBar`, `Footer`, plus form inputs for the
admin. It currently has exactly two theme scopes — `:root` and `:root.dark` — so a
charcoal brand theme introduces a third axis it has never had.

**Design system findings, measured from the published tarball** (each is a fix to
upstream, not to work around — that is what the Core Value requires):

- `dist/index.js` is a single **334 KB / 71 KB-gzip barrel with no per-component JS
  subpath exports**. Only CSS splits. It statically imports `@tiptap/*`, `lowlight`,
  `@dnd-kit/*` and `lucide-react` at top level, so a single `Chip` import risks pulling
  ProseMirror into a public island. Whether tree-shaking saves us is a 5-minute build
  experiment and must be an explicit early task.
- CSS is **204 KB** total (`primitives.css` alone is 176-181 KB), but 74 split
  per-component sheets already exist in `dist/css/` — public pages need roughly 30 KB.
  This is the single biggest Lighthouse lever.
- **`tokens.css` conflates tokens with font delivery**: 14-15 `@fontsource` imports
  declaring ~73 `@font-face` rules across Inter/Archivo/JetBrains Mono/Newsreader — and
  **none** of the handoff's Playfair Display, DM Sans or IBM Plex Mono. A charcoal theme
  that only redefines `--font-serif` will silently fall back to Georgia.
- Those font `@import`s are **bare specifiers that Vite inlines at build time**, so there
  is no render-blocking `@import` waterfall. The problem is font *count*, not sequencing.
- Cascade risk: `:root[data-brand]` ties with `:root.dark` at specificity (0,2,0), so
  source order decides the winner — and Astro does not guarantee CSS ordering across
  `.astro` and React imports. All DS CSS must be imported from a single file.
- `Lightbox` already ships focus trap and restore, reference-counted scroll lock,
  layer-aware Escape, arrow keys and `role="dialog"`. It lacks backdrop-click close,
  `srcset` (it takes `src: string`), swipe, and `aria-live` slide announcements.

**Contrast measurements already taken** against the handoff palette:

| Theme | Token | Ratio | Body AA |
|-------|-------|------:|---------|
| Dark on `#161616` | primary `#EAE7E0` | 14.65:1 | pass |
| Dark on `#161616` | secondary `#C9C5BC` | 10.51:1 | pass |
| Dark on `#161616` | muted `#8F8B82` | 5.33:1 | pass |
| Dark on `#161616` | ochre `#B0722A` | 4.56:1 | pass |
| Light on `#F4F1EA` | muted `#7A7568` | 4.07:1 | **fail** |
| Light on `#F4F1EA` | ochre `#B0722A` | 3.52:1 | **fail** |

The dark palette is clean. Light mode needs a darker muted (~`#6E6A5E`) and an `--ochre-d`
for focus rings and body text — exactly the fix the design system already applied to
`--amber` for the same reason.

**Content.** `data/portfolio_images.json` holds 39 photos across architecture (14),
nature (8), wildlife (5), abstract (4), street (4), portraits (2), product (2). Each has
five URL variants (`thumb`/`small`/`medium`/`large`/`original`) — a better responsive
`srcset` than the handoff assumed. All 39 are titled.

Measured facts that shape the gallery build:

- **All 39 at `small` total 0.9 MB.** The handoff's "SHOWING 8 OF 39 — implement real
  pagination" is over-engineering; no pagination is needed.
- **LQIP and dimensions already exist.** Every photo carries `dimensions` and a base64
  placeholder in `urls.thumb` (21.6 KB for all 39), so CLS prevention and blur-up are
  nearly free and no Astro image service is required.
- **EXIF gaps are field-level, not photo-level.** 11 of 39 have at least one null field;
  `lens` is null on 11; `product-peppers` has none at all; `architecture-redbuilding` has
  camera only. Missing fields must be omitted entirely — a `—` beside `f/11` reads as a
  data bug.
- **Camera strings are raw model codes** (`NIKON CORPORATION NIKON D5300`,
  `samsung SM-N970F`, `OnePlus AC2001`, `SONY ILCE-7CM2`). Only 5 distinct cameras — a
  5-entry display lookup.
- **`pub-*.r2.dev` is uncached, rate-limited and development-only** per Cloudflare's docs.
  All 39 URLs point at it. This alone blocks Lighthouse 95+, and fixing it is a manifest
  data migration, so it belongs early rather than in a performance pass.
- `home_config.peekPositions` already carries per-photo `object-position` for the 3:2 hero
  crops — surface it in the admin or it will rot.
- The `tags` field is unused across all 39 photos.

## Constraints

- **Design system**: All UI comes from `@akhil-saxena/design-system` where a component
  exists — app-specific CSS confined to layout. This is the project's core value, not a
  preference.
- **Cross-repo dependency**: The charcoal theme must be built and published from the
  `design-system` repo (`../design-system`) before the portfolio can consume it. During
  development the portfolio consumes it as a **packed tarball** (`npm pack` →
  `file:*.tgz`), never `file:../design-system` or `npm link` — both are symlinks and
  carry the duplicate-React "invalid hook call" hazard. A CI gate fails the build if the
  dependency spec still starts with `file:` at ship time.
- **Platform**: Cloudflare **Workers + Static Assets** — `@astrojs/cloudflare` dropped
  Pages support in v13. Config is `output: 'static'` (the default) + `adapter:
  cloudflare()`, with `export const prerender = false` on `/admin` and every
  `src/pages/api/*` route. Bindings come from `import { env } from "cloudflare:workers"`
  (`Astro.locals.runtime` is removed) and **work in local dev** — `astro dev` runs real
  `workerd`, so binding access must NOT be guarded; a guard would mask a real failure.
- **No runtime filesystem**: Content is committed JSON. The admin publishes by committing
  to the repo via the GitHub API; there is nothing to write to at runtime.
- **Security**: Auth fails closed. Mutating routes verify the signed Cloudflare Access
  JWT; a missing configuration denies rather than degrades.
- **Performance**: Lighthouse 95+ on public pages, with a real budget on the 39-photo
  gallery.
- **Live site is down** until cutover — accepted, but it is a clock on the project.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild rather than refactor | Four reinforcing motives — dogfood the design system, adopt the new identity, strengthen the recruiting signal, and clear accumulated debt (no tests, XSS, fail-open auth, dead code, type drift) | — Pending |
| Astro + React islands over Next.js | Mostly-static content site; React only where interaction lives (lightbox, filters, theme toggle, admin). Near-zero JS on public pages. The handoff itself suggested Astro | — Pending |
| Upstream the theme into the design system | Cleanest long-term home for the identity, and it forces the design system to support brand theming — a capability it lacks today. Cost: portfolio blocks on a design system release | — Pending |
| Drop photo analytics | Only thing forcing a server runtime onto public pages; removing it makes them fully static and shrinks the attack surface | — Pending |
| Implement the R2 staging pipeline, not the live one | Keeps binaries out of git history and off the base64-through-a-Worker path. The dead `/api/dispatch` code was the better design, just abandoned | — Pending |
| Auth fails closed, deny by default | The legacy cookie-presence fallback validates nothing. A personal admin that can commit to a repo and dispatch GitHub Actions warrants a real auth boundary | — Pending |
| Purge `main` immediately, accept downtime | Explicitly chosen over branch-and-merge after the downtime cost was raised twice. Legacy preserved on `legacy/nextjs-portfolio` | — Pending |
| Deploy to Workers + Static Assets, not Pages | Forced: `@astrojs/cloudflare` v13 dropped Pages support outright. Cloudflare has *not* deprecated Pages — the break is on Astro's side | — Pending |
| DS components everywhere, no `client:*` directive by default | Research found the DS primitives are pure `forwardRef` with zero hooks, so Astro renders them to static HTML with no JS. Dissolves the apparent conflict between "built on the design system" and "Lighthouse 95+". Only `/photos` hydrates | — Pending |
| Consume the DS as a packed tarball in dev, never a symlink | `file:../design-system` and `npm link` both symlink, duplicating React and causing "invalid hook call". `npm pack` → `file:*.tgz` actually copies | — Pending |
| Fail-closed auth lands in the foundation phase, not the admin phase | The moment `/admin` exists in a deployed Worker it is a live surface. Treating auth as an admin-phase concern is precisely how the legacy fail-open fallback came to be written | — Pending |
| Split the photo pipeline: Actions half before admin UI | The Actions half depends only on the schemas and can be driven with `gh workflow run`, taking the riskiest integration (sharp + exifr + R2 + concurrent git push) off the critical path instead of wedging it behind the admin at the end | — Pending |
| No gallery pagination | Measured: all 39 photos at `small` total 0.9 MB. The handoff's "SHOWING 8 OF 39" pagination requirement is unjustified | — Pending |
| Form-based admin, not WYSIWYG | "Good usable admin panel" with fewer moving parts; design-system inputs already carry the accessibility work | — Pending |
| Claude drafts copy, Akhil edits | Reacting to concrete first-pass copy beats a blank field, and build phases then work against real text lengths | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-16 after initialization, revised same day with research corrections
(Astro 7 not 5; Workers not Pages; `cloudflare:workers` env not `locals.runtime`; bindings
work in local dev; tarball not symlink for DS linking; field-level EXIF gaps; r2.dev is
uncached).*
