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
- [ ] Astro + React islands app on `@astrojs/cloudflare`, public pages prerendered
- [ ] Deploys to akhilsaxena.com via Cloudflare Pages

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
4. **The documented pipeline is dead code** — `AGENTS.md` describes an R2 `temp/` →
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
`srcset` than the handoff assumed. All 39 are titled; one lacks camera EXIF, so the
lightbox needs a graceful empty state.

## Constraints

- **Design system**: All UI comes from `@akhil-saxena/design-system` where a component
  exists — app-specific CSS confined to layout. This is the project's core value, not a
  preference.
- **Cross-repo dependency**: The charcoal theme must be built and published from the
  `design-system` repo (`../design-system`) before the portfolio can consume it. During
  development the portfolio links it locally (`file:`), switching to the published
  version at integration — so "consumes it from npm" is a ship-time guarantee verified by
  an explicit gate, not an every-hour truth.
- **Platform**: Cloudflare Pages. Public pages prerendered static; `/admin` and its API
  routes server-rendered via `@astrojs/cloudflare`. Cloudflare bindings (R2
  `PORTFOLIO_BUCKET`) come from `locals.runtime.env`, not `process.env`, and are absent
  in local dev — access must be guarded.
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
*Last updated: 2026-08-16 after initialization*
