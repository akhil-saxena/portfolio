# Feature Research

**Domain:** Personal portfolio + photography site with a private git-backed admin CMS
**Researched:** 2026-08-16
**Confidence:** HIGH on measured/verified items, MEDIUM on convention items (marked inline)

---

## Scope Note — Read This First

The feature set is **already decided** in `.planning/PROJECT.md`. Nothing new is proposed
here. This document answers one question: *within the decided features, what are the
specific details that portfolio and photography sites get right or wrong?*

Everything in PROJECT.md's Out of Scope list is respected and is **re-confirmed as an
anti-feature** below (photo analytics, blog, generated PDF, WYSIWYG admin, photo `tags`,
parallel legacy app). None are re-proposed.

**Evidence base.** Beyond web research, this document is grounded in direct measurement of
the real content and the real design-system code:

| Measured | Finding |
|----------|---------|
| `data/portfolio_images.json` | All 39 photos have `dimensions.width/height` **and** a base64 WebP LQIP in `urls.thumb` |
| R2 variant widths | `thumb` ≈40w data-URI · `small` 400w · `medium` 800w · `large` 1200w · `original` 2000w |
| R2 variant weights (n=8) | `small` avg 24 KB / max 73 KB · `medium` avg 88 KB / max 304 KB · `large` avg 175 KB / max 645 KB |
| Full-gallery payload | **All 39 at `small` ≈ 0.9 MB.** At `medium` ≈ 3.3 MB |
| Total LQIP payload | 21.6 KB of base64 for all 39 (pre-gzip) |
| EXIF completeness | camera 38/39 · lens **28/39** · aperture 37/39 · shutter 37/39 · ISO 37/39 · focal 37/39 |
| Aspect ratios present | 0.56, 0.67, 0.73, 0.75, 0.80, 1.00, 1.31, 1.46, 1.48, 1.50 — portrait **and** landscape |
| `data/resume.json` | Bullets contain raw `<strong>` HTML — the live XSS vector |
| `data/home_config.json` | Has `peekIds` (6 hero photos) + `peekPositions` (per-photo `object-position`) |
| `data/site_config.json` | Has `categoryColumns` — column count varies **per category** (3 for Architecture, 2 for Portraits) |
| DS `Lightbox` source | Ships focus trap + restore, scroll lock, Escape (layer-stacked), arrow keys, `role="dialog"`, caption slot |
| DS `Lightbox` gaps | No backdrop-click close · no `srcset` (`src: string` only) · no neighbour preload · no live-region announcement · no swipe |
| Legacy public routes | `/`, `/portfolio`, `/resume` — the new design uses `/photos` and `/work` |
| `public/resume.pdf` | 129 KB, hand-maintained (stays that way per PROJECT.md) |

> **PROJECT.md correction (HIGH confidence, measured).** PROJECT.md states "one lacks camera
> EXIF, so the lightbox needs a graceful empty state." The real picture is worse: **11 of 39**
> photos are missing at least one field. `lens` is null on 11 photos. `product-peppers` has
> **zero** EXIF. `architecture-redbuilding` has camera only. The empty state is needed at
> *field* level and at *whole-block* level, not as a single edge case.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the site feel broken or unfinished. Grouped by surface.

#### A. Photography gallery (`/photos`)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Reserve tile space from known `dimensions` (`aspect-ratio` on the wrapper) | Prevents CLS as 39 images stream in; a jumping gallery reads as amateur | **LOW** | Data already has `dimensions` for all 39. This is also what makes `loading="lazy"` behave — images with collapsed intrinsic height all appear "in viewport" and load at once |
| `break-inside: avoid` on masonry items | Without it `column-count` splits an image across two columns | **LOW** | One CSS line; the #1 `column-count` bug |
| LQIP blur placeholder from `urls.thumb` | 39 grey rectangles resolving one by one looks broken; a blur-up reads as intentional | **LOW** | Already in data. 21.6 KB total inline for all 39 — acceptable. Set as `background-image` on the wrapper; clear on `img.decode()`/`onload` |
| Responsive `srcset` + `sizes` across the 4 real variants | Tiles render ~350px wide; shipping `medium` (800w) to a 350px slot triples the bytes | **LOW** | `sm 400w, md 800w, lg 1200w, original 2000w`. **No Astro image service needed** — variants already exist, so plain `<img>` avoids the whole Cloudflare Images config/cost question |
| Eager + `fetchpriority="high"` on the first tile, lazy on the rest | Lazy-loading the LCP element is a direct, Lighthouse-audited penalty | **LOW** | Lighthouse has a dedicated `lcp-lazy-loaded` audit. Applies to the Home hero grid too — 6 above-the-fold photos there |
| Load all 39 — no pagination, no infinite scroll | The handoff's "SHOWING 8 OF 39" implies paging; **measured, all 39 at `small` = 0.9 MB** | **LOW** (it is *less* work) | Pagination/infinite-scroll here is complexity with negative payoff. Keep the counter as a *label*, not a pager. See anti-features |
| Filter state lives in the URL | Sharing "my architecture shots" and the browser Back button are both expected | **LOW–MED** | **Recommend prerendered `/photos/[category]` routes with real `<a>` filter pills** over a query param + client filter: zero JS to filter, crawlable, Back works for free, and `site_config.categoryColumns` (per-category column counts) only makes sense if categories render separately. Add `<ClientRouter/>` if the swap needs to feel instant |
| `aria-current="page"` on the active filter pill | Icon/fill-only active state is invisible to screen readers | **LOW** | DS `Chip` or `SegmentedControl` |
| Accurate per-filter count ("Showing 14 of 39") | A counter that doesn't change with the filter is worse than no counter | **LOW** | |
| Per-photo `object-position` on cropped hero tiles | The Home grid force-crops to 3:2; centre-crop decapitates some subjects | **LOW** | `home_config.peekPositions` already exists for exactly this. Keep the field; expose it in admin |
| Real alt text on 39 photos | Titles like "Into The Mist" are poetic, not descriptive | **LOW** (code) / **MED** (content) | Using `title` as `alt` is defensible for artistic images, but it's a content task worth doing deliberately. 39 strings |
| Deep link to a single photo (`/photos#<id>` or `?photo=<id>`) | Sending someone a specific photo is the single most common share action | **MED** | `pushState` on open, `popstate` closes, read on mount. Depends on the lightbox |
| `prefers-reduced-motion` disables the 1.03 hover scale and the "↓ THE WORK" nudge | Already an Active requirement; the nudge is an infinite loop animation | **LOW** | DS ships `useReducedMotion`; prefer the pure-CSS media query for public pages |

**On `column-count` reordering — verdict: acceptable here, with one mitigation.**
CSS `column-count` fills top-to-bottom per column, so visual order ≠ DOM order, which is a
probable WCAG 1.3.2 (Meaningful Sequence) concern and makes Tab order jump down column 1
before column 2. That guidance is aimed at content where *sequence carries meaning*. It does
not here: `order` in the data is arbitrary, photos are a set not a narrative, and each tile
has exactly one action. The genuinely order-preserving no-JS alternative (CSS Grid +
build-time-computed `grid-row: span N`) is **not masonry** — it packs row-by-row and leaves
ragged gaps. A JS masonry gets both but adds JS and layout thrash to a page whose stated goal
is near-zero JS. **Keep `column-count`**, and mitigate by making the lightbox the primary
interaction: once open, arrow-key traversal follows DOM order consistently.
*(Confidence: MEDIUM on the WCAG framing, HIGH on the mechanics.)*

**Native CSS masonry is not shippable yet.** The CSSWG spent years split between
`grid-template-rows: masonry` (Firefox/WebKit) and a `display: masonry` / "grid lanes"
approach; as of now it is behind flags in Firefox and Chrome, with Safari 26 the only
unflagged shipment reported. Do not build on it. It is a fine `@supports` progressive
enhancement later (listed under Differentiators). *(Confidence: MEDIUM — sources agree on
"not ready", disagree on final syntax.)*

#### B. Lightbox

The design system's `Lightbox` **already ships** focus trap + focus restore to the opener,
reference-counted body scroll lock, Escape via a layer stack (so nested overlays unwind
correctly), ArrowLeft/ArrowRight with wrap-around, `role="dialog"` + `aria-modal` + a label
derived from the active item's alt, a caption slot, and an always-dark surface. Those are
solved. What follows are the gaps.

Per PROJECT.md's Core Value ("any gap it exposes is a finding rather than a workaround"),
items marked **[DS finding]** should be raised against `@akhil-saxena/design-system`, not
patched locally.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Click the backdrop to close | Universal lightbox behaviour; its absence reads as a bug | **LOW** | **[DS finding]** — `Lightbox` wires `useDismiss` (Escape only); DS already has `useClickOutside` |
| Announce slide changes to screen readers | The dialog's `aria-label` changes on navigate, but SRs do not re-announce a changed label | **MED** | **[DS finding]** — needs a visually-hidden `aria-live="polite"` region: "Image 12 of 39, Into The Mist" |
| Preload the next (and previous) image | Measured: neighbours are 175 KB avg, up to 645 KB — arrowing through 39 photos with a blank frame each time is the whole experience | **LOW** (app layer) | `new Image().src = next` on index change |
| Show the LQIP under the loading full image | Otherwise: black void → image pop | **LOW** | `urls.thumb` again, as a scaled background on the frame |
| Responsive source in the lightbox | `LightboxProps` takes `src: string` only. `large` is 1200w — visibly soft full-screen on a 1440p or retina display; `original` (2000w) is the right top end | **MED** | **[DS finding]** — needs `srcSet`/`sizes` on `LightboxItem`. Local stopgap: pick variant by `matchMedia`/DPR |
| Swipe left/right on touch | Half the traffic; a mobile gallery you can only advance by tapping a 40px chevron is broken | **MED** | **[DS finding]** — DS has `useLongPress` but no swipe/pointer-drag hook |
| Visible "12 / 39" counter | Orientation in a 39-item set | **LOW** | Fits the caption slot |
| Graceful EXIF omission | **Measured: 11/39 photos have at least one null field; 1 has none at all** | **LOW** | **Omit missing fields silently.** Do *not* render "—", "N/A" or "Unknown" — a dash next to `f/11` reads as a data bug. If the whole EXIF object is empty, drop the metadata row entirely rather than showing DS `EmptyState`; an "No EXIF available" panel is louder than the absence |
| Restore scroll position on close | Handled by DS `useScrollLock` — but verify it survives a filter change while open | **LOW** | Regression-test it; don't assume |

**Decide, don't discover:** the DS `Lightbox` **wraps around** at both ends (last → first).
That's a reasonable default for a gallery, but it should be a recorded decision, because the
alternative expectation (arrows disable at the ends) is equally common.

#### C. EXIF display

Photographers scan EXIF in exposure-triangle order. Convention (MEDIUM confidence — widely
observed on Flickr/500px/photoblogs, not formally specified): a **camera + lens** line, then a
**focal · aperture · shutter · ISO** line in mono.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Normalise camera model strings | The raw values are `NIKON CORPORATION NIKON D5300`, `samsung SM-N970F`, `OnePlus AC2001`, `SONY ILCE-7CM2`. Shipping internal model codes is the single most visible "nobody looked at this" tell | **LOW** | Only **5 distinct cameras** in the whole set — a 5-entry static lookup map: `Nikon D5300`, `Samsung Galaxy Note 10+`, `OnePlus 8T`, `Sony a7C II`, `Samsung Galaxy Z Fold5` |
| Normalise lens strings | `18.0-55.0 mm f/3.5-5.6` → `18–55mm f/3.5–5.6` | **LOW** | Strip trailing `.0`, close the space, en-dash the range. Only 4 distinct lenses |
| Format shutter with a unit | `1/500` alone is ambiguous; `1/500s` is not | **LOW** | All 37 values are `1/N` — no long exposures, no decimals |
| Label ISO | `200` floating in a row means nothing; `ISO 200` does | **LOW** | |
| Round phone focal lengths | Data contains `4.745mm` and `5.4mm`. To a photographer, `4.745mm` reads as a bug, not precision | **LOW** | Round to 1 dp, or map to 35mm-equivalent if you ever capture it |
| Mono typeface for the metadata row | The design already assigns IBM Plex Mono to labels/metadata; digits align | **LOW** | Consistent with the handoff |
| No GPS / location | Not in the data — keep it that way | **NONE** | Publishing home-adjacent coordinates is a privacy footgun. See anti-features |

#### D. Résumé (`/resume`)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bullets rendered through an allowlist sanitizer | `resume.json` bullets contain raw `<strong>`; the legacy site piped them through `dangerouslySetInnerHTML` unsanitized | **MED** | Already an Active requirement. Detail that matters: sanitize at **both** the publish boundary and the render boundary, allowlisting `<strong>`/`<em>` only. DS `RichText` sanitizes on paste via the TipTap schema but its own docs state server-side sanitization is the consumer's job |
| Print stylesheet | Recruiters print or Cmd-P-to-PDF the page — the PDF link is not always the path taken | **MED** | `@media print`: hide nav/footer/theme toggle, force black-on-white, `break-inside: avoid` on each experience block (splitting a job title from its bullets is the classic failure), size in `pt` |
| Visible PDF download with format + weight | "Download" with no hint of what arrives is a small trust cost | **LOW** | `public/resume.pdf` is 129 KB. Label it: "Résumé — PDF, 129 KB". Add the `download` attribute. Stays hand-maintained per PROJECT.md |
| Reverse-chronological, dates and company scannable at a glance | Recruiters scan role / company / dates before reading a word of a bullet | **LOW** | Design/content, not engineering |
| Lead each role with the outcome bullet | Research is consistent: metrics, dates and named systems beat technical novelty | **LOW** | Content. The Brevo data already leads with the +15% conversion bullet — keep that pattern |
| `Person` JSON-LD (`name`, `jobTitle`, `url`, `image`, `sameAs`, `worksFor`, `knowsAbout`) | This is how search engines and AI assistants resolve "who is Akhil Saxena" to an entity | **LOW** | Be honest about payoff: valid markup grants *eligibility*, not a rich result. The real return is entity disambiguation and AI-assistant citation. `sameAs` → GitHub + LinkedIn (already in `home_config.socialLinks`) |
| No form gate on the PDF | Lead-capture on a personal résumé is hostile | **NONE** | See anti-features |

#### E. Project case-study pages (`/work/[project]`)

No design exists for these — the handoff covers Home, Work, Photos, Résumé only. PROJECT.md
already flags Phase 0 must produce it. **Write one case study first, then design the
template**; designing against lorem ipsum is how case-study pages end up as filler.

Research on what separates a real engineering case study from filler converges on the
inverted pyramid plus *decisions with rejected alternatives*:

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-sentence outcome above the fold | Hiring managers scan; they will not reverse-engineer your thinking from a screenshot | **LOW** | Inverted pyramid: outcome → context → problem → decisions → result |
| 2–4 decisions, each with the alternative you rejected and why | **This is the entire load-bearing part.** A decision without its rejected alternative is a description; with one, it is evidence of judgement | **LOW** (code) / **HIGH** (writing) | Maps exactly onto the chosen "problem, decisions, outcome" narrative |
| Explicit statement of your role and ownership | "If you worked with others, state what you owned, otherwise your impact gets lost" | **LOW** | Especially for Brevo work |
| Link out to the live artefact / repo / npm package | For a design system and a Chrome extension, the artefact *is* the proof | **LOW** | |
| Rough dates or duration | Undated work reads as either stale or fictional | **LOW** | |
| At least one image per case study | A wall of prose on a *portfolio* is a mismatch | **MED** | No image assets exist beyond photos and typographic project icons — this is an asset-production task |
| Cap at 3–5 case studies | Consistent recommendation; quality over exhaustiveness | **NONE** | 4 projects + Brevo is already exactly right. Don't grow it |

#### F. SEO / social

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `<link rel="canonical">` on every page, absolute, on `akhilsaxena.com` | The apex and `akhilsaxena.pages.dev` will serve byte-identical content | **LOW** | Set Astro's `site` config; derive from `Astro.url` |
| **301 `akhilsaxena.pages.dev` → `akhilsaxena.com`** | Verified: Pages *preview* deployments carry `X-Robots-Tag: noindex` automatically, but the **production `*.pages.dev` hostname does not**. The old domain is already indexed | **LOW** | Cloudflare Bulk Redirects / Redirect Rules. Canonical alone is a hint; the 301 is the fix, and it also transfers the existing ranking signal |
| **301 legacy paths: `/portfolio` → `/photos`** | The live site served `/`, `/portfolio`, `/resume`. The rebuild renames to `/photos` and `/work`. Every existing inbound link and index entry for `/portfolio` breaks | **LOW** | A `public/_redirects` file. Easy to forget precisely because the old app is gone from `main` |
| Full OG set: `og:title`, `og:description`, `og:image` (absolute), `og:type`, `og:url`, `og:site_name`, `og:locale` | Sharing the site in a DM or on LinkedIn is the primary distribution channel for a portfolio | **LOW** | `og:image` **must** be an absolute URL |
| `twitter:card="summary_large_image"` + `twitter:image:alt` | Verified: without `twitter:card`, no large preview. X falls back to `og:image` when `twitter:image` is absent — so one image file suffices | **LOW** | Target 1200×630. X centre-crops to 2:1 and caps at 5 MB; JPG/PNG/WebP |
| Per-page OG images | A photography page whose share card is a generic headshot wastes the strongest asset | **LOW** | For `/photos` and per-photo deep links, use the photo's own `large` (1200×800). For Home/Work/Résumé, commit **3–4 hand-made static images** to `public/`. Do **not** generate them at the edge — see anti-features |
| Sitemap via `@astrojs/sitemap` | Free; needed for the domain move to settle quickly | **LOW** | Requires `site` set |
| `robots.txt` referencing the sitemap | | **LOW** | |
| Complete favicon set | `public/favicon.svg` is 253 bytes and alone — no ICO fallback, no apple-touch-icon, no manifest | **LOW** | A blank tab icon on an iOS home screen is a visible miss |
| No RSS | Correct — there is no blog, and PROJECT.md keeps it that way | **NONE** | Don't add an empty feed |

#### G. Theme toggle

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Blocking inline `<script is:inline>` in `<head>` reading `asx-theme` | The flash of wrong theme is the most-noticed defect on a dark-default site. Astro's own docs prescribe exactly this | **LOW** | Must be `is:inline` — Astro otherwise bundles and defers it, which reintroduces the flash. HIGH confidence, official Astro docs |
| `color-scheme: dark` / `light` on `:root` | Without it the scrollbar, form controls and the pre-paint canvas render light against a `#161616` page — a white scrollbar strip is a visible flash on its own | **LOW** | One declaration per theme scope. Frequently forgotten |
| `<meta name="theme-color">` per theme | Mobile browser chrome renders white above a charcoal page otherwise | **LOW** | `#161616` / `#F4F1EA` |
| Toggle is a `<button>` with a stated action label | Icon-only with no accessible name is unusable by screen reader and unclear on hover. The handoff specs a 42px circle with a ☀/☾ glyph and no label | **LOW** | `aria-label="Switch to light theme"` (state the *destination*), updated on toggle. Consider `aria-pressed` |
| No cross-fade of `background-color` on `*` | A global colour transition on a page holding 39 images janks; and it must be suppressed under `prefers-reduced-motion` | **LOW** | Instant switch is the safer default |
| `astro:after-swap` handler **if** `<ClientRouter/>` is adopted | Verified in Astro docs: inline scripts do not re-run across view transitions, so the theme resets mid-navigation | **LOW** | Only applies if view transitions are used (they're attractive for the filter-pill UX). `data-astro-rerun` is the alternative |
| The light theme must actually be finished | PROJECT.md already measured two light tokens failing AA. "Dark by default" makes light the *less-tested* path, which is exactly how it ships broken | **MED** | Already an Active requirement; noted here because dark-default is the reason it gets under-tested |

**On `prefers-color-scheme`.** PROJECT.md settles this: dark by default, persisted in
`asx-theme`. That is an identity decision and this document does not relitigate it. The
table-stakes consequence is only that the toggle must be **discoverable on every page** (the
handoff wires it on Home only) and that light mode must be genuinely finished — a visitor who
prefers light will use the toggle, and it is the first thing they'll touch.

#### H. Git-backed admin CMS

Established git-backed CMSs (Decap, Sveltia, Tina, Pages CMS, CloudCannon) converge on a small
set of behaviours, and conspicuously *diverge* on one — build feedback. Both facts are useful.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Real optimistic concurrency** | Already an Active requirement (legacy hardcoded `baseSha: "latest"`, disabling the guard). The concrete mechanism matters | **MED** | **Verified in GitHub docs:** `PUT /repos/{o}/{r}/contents/{path}` requires the **blob SHA of the file being replaced** (not a commit SHA — the legacy `baseSha` naming suggests the two were conflated) and returns **409 Conflict** on mismatch. For a multi-file commit via the Git Data API, pass the expected head commit as the new commit's parent and `PATCH /git/refs/heads/main` with `force: false` so a non-fast-forward fails. Either way: **surface the 409 as "this changed underneath you — reload"; never auto-retry** |
| Preview renders from *edited* state, not committed state | A preview pane that shows the last publish is worse than none — it silently lies | **MED** | Already the chosen design ("form editors with a preview pane"). Reuse the real public components |
| **Post-publish build feedback** | This is the biggest real gap across git-backed CMSs: you commit, and then you're guessing. On a site with no staging, "did it deploy?" is the top operator question | **MED** | Poll `GET /accounts/{id}/pages/projects/{name}/deployments`; the deployment object exposes `latest_stage` (name + status) and the stage list. Show queued → building → success/failed with a link. Needs a Pages:Read API token |
| Validate **before** commit, and again in CI | Already an Active requirement. The detail: validate in three places or it leaks | **MED** | Same schema (1) in the form, (2) in the publish route before it commits, (3) in CI — so a hand-edited or pipeline-written commit can't break the build either |
| **Recover from a bad publish in one click** | With no staging and a live site, "the build is red and I don't know why" is the actual disaster scenario | **MED** | You already hold the pre-publish commit SHA. A "revert last publish" button that creates a revert commit turns a broken site into a 30-second fix. Rarely built; disproportionately valuable for a single operator |
| Unsaved-changes guard + local draft | Losing 20 minutes of résumé editing to a closed tab is the classic complaint against form-based CMSs | **LOW** | `beforeunload` + localStorage autosave keyed per document |
| Per-photo pipeline status | The upload → R2 → `workflow_dispatch` → resize/EXIF → commit path is asynchronous and slow. Fire-and-forget leaves the operator staring at nothing | **MED** | Poll the workflow run; show staged → processing → committed → visible. Depends on the R2 staging pipeline being implemented |
| Fail-closed auth | Already an Active requirement (legacy fell open to cookie-presence) | **MED** | |
| Admin surfaces `object-position` for hero crops | `peekPositions` exists in data; if the admin can't set it, the field rots and hero crops silently degrade | **LOW** | Depends on hero-crop feature |
| Admin excluded from indexing | `/admin` behind auth still shouldn't appear in a sitemap | **LOW** | Exclude from `@astrojs/sitemap`; `noindex` header |

---

### Differentiators (Worth Doing, Not Mandatory)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Prerendered per-photo pages (`/photos/<id>`) | Gives every photo a crawlable URL and a real per-photo OG card; makes deep links work with JS off | **MED** | 39 static pages, trivially cheap. Supersedes hash-based deep linking. Depends on: lightbox deep-link |
| `@supports` progressive enhancement to native CSS masonry | Costs a `@supports` block; upgrades free as browsers ship | **LOW** | Only worth it once one engine ships unflagged and the syntax settles |
| Case-study "decision log" as a repeated, structured block | Turns the narrative into a scannable pattern and makes the fifth case study cheap to write | **MED** | Reinforces the chosen problem/decisions/outcome frame rather than replacing it |
| View transitions (`<ClientRouter/>`) between filter routes | Makes prerendered category routes feel like in-place filtering with no filtering JS | **LOW–MED** | **Requires** the `astro:after-swap` theme handler, or the theme resets on navigate |
| `EXIF` normalisation applied at ingest, not at render | Cleans the data once, in the pipeline, instead of every page load | **LOW** | Alternative placement of a table-stakes item |
| One-click "revert last publish" *(listed as table stakes above)* | Genuinely rare across git CMSs | **MED** | Included here too because most teams would classify it as a nice-to-have; for a solo operator with no staging it isn't |
| Admin shows a diff of what will be committed | "Here's exactly what changes" before pressing publish | **MED** | Strong confidence-builder; not expected |

---

### Anti-Features (Deliberately NOT Building)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Pagination / infinite scroll on the gallery** | The handoff literally says "SHOWING 8 OF 39 — implement real pagination/lazy-load" | **Measured: all 39 at `small` = 0.9 MB.** Paging adds state, URL handling, a11y announcements and a scroll-restoration bug class to save nothing. Infinite scroll also breaks the footer | Render all 39; native `loading="lazy"` + LQIP does the work. Keep "39 photographs" as a static label |
| **Scroll-jacking / smooth-scroll libraries** (Locomotive, Lenis, GSAP ScrollTrigger) | Reads as "premium portfolio" | NN/g: scrolljacking degrades user control, discoverability, attention, efficiency and task success. Also imports a large JS bundle onto pages whose stated goal is near-zero JS | Native scrolling. The one specced scroll affordance ("↓ THE WORK" nudge) is a 6px CSS keyframe |
| **Custom cursors** | Awwwards aesthetic | Overrides OS cursor size/contrast settings; breaks magnification and high-contrast modes; pointless on touch | System cursor |
| **Full-screen preloader** | Hides the loading of a photo-heavy page | Directly delays LCP by hiding the largest element behind an overlay — mathematically incompatible with the Lighthouse 95+ requirement | LQIP blur-up per tile. Content appears progressively |
| **Heavy animation library on public pages** (Framer Motion, GSAP) | Wanting polish | Every interaction in the handoff — hover scale, nudge, border transition, theme swap — is a CSS transition. A React animation runtime on a prerendered page is pure regression against the Astro-islands decision | CSS transitions + `prefers-reduced-motion` |
| **Autoplaying video / audio / background music** | "Immersive" | Universally hostile; blocked by browsers; destroys LCP and bandwidth | Nothing |
| **Dynamic/edge OG image generation** | Per-page cards without hand-making files | Forces a server runtime onto public pages — **the exact cost that got photo analytics cut.** Reintroducing it for share cards would undo that decision | Real photos as OG images for photo pages; 3–4 hand-made static PNGs in `public/` for the rest |
| **Contact form** | "Get in touch" is expected | Needs a server runtime + spam handling + an email provider — again, a server runtime on static pages | `mailto:` — already present in `home_config.socialLinks` |
| **Right-click / download disable, watermarks** | Protecting photos | Trivially bypassed, breaks "open in new tab", and reads as distrust of the visitor. Real protection is not shipping `original` — you already ship a 1200w `large` | Ship `large`, not `original`, in the lightbox on non-retina; keep `original` for high-DPR only |
| **GPS / location EXIF display** | Photographers sometimes share it | Not in the data. Publishing coordinates near where you live or work is a real privacy exposure, and it would have to be added to the pipeline on purpose | Camera, lens, exposure only — exactly the six fields decided |
| **Photo date display or "sort by date"** | The `date` field exists | **Measured: all 39 dates fall in 2026-03-28 → 2026-04-07.** These are ingest dates, not capture dates. Showing them implies the whole body of work was shot in ten days | Use the curated `order` field. If capture dates matter later, extract `DateTimeOriginal` in the pipeline first |
| **Photo search** | Search boxes look complete | 39 items across 7 categories, all visible in under a second. A search box over 39 photos is decoration | Category filters |
| **Stat cards / animated counters / skill percentage bars** | The design system ships `StatCard`, `RollingNumber`, `MiniBar` and they're tempting to dogfood | PROJECT.md chose narrative ("problem, decisions, outcome") over stats for case studies. "React: 85%" is unfalsifiable and reads as filler. Dogfooding the DS is not a reason to use the wrong component | Dogfood the DS with `Timeline`, `Chip`, `Card`, `Lightbox`, form inputs — components the content actually needs. The Work page's existing mono metrics (`+15% CONVERSION`) are real numbers in context, which is different |
| **Three-state theme toggle (system / light / dark)** | Feels more correct | Adds a third state, a third icon and a "what does 'system' mean right now" ambiguity — to a site that has already decided on dark-by-default with two finished palettes | Two-state toggle, `asx-theme`, dark default |
| **Editorial workflow / draft branches in admin** | Decap's headline feature; Sveltia has deferred it to 2.0 | Branch-per-entry exists to coordinate *multiple* editors with review. There is one editor and no reviewer. It buys nothing and adds branch state, merge conflicts and a second failure mode | Preview pane → explicit Publish → build status → one-click revert |
| **WYSIWYG / draggable admin** | The legacy admin had one | Already Out of Scope in PROJECT.md — restated because it's the natural thing to "just add back" while porting | Form editors from DS inputs + preview pane |
| **Photo view analytics / likes / view counters** | Curiosity | Already Out of Scope — the sole reason the public site can be fully prerendered | None |
| **Blog / writing section** | Portfolios usually have one | Already Out of Scope. An empty or two-post blog actively signals abandonment | None. Case studies carry the writing |
| **Generating the résumé PDF from `resume.json`** | Single source of truth | Already Out of Scope: real work, zero reader-visible payoff | Hand-maintained `public/resume.pdf` (129 KB) |
| **Cookie / consent banner** | Assumed mandatory | With analytics cut there are no cookies to consent to. A banner would *imply* tracking that doesn't happen — a net negative on trust and on LCP | None |
| **"Available for hire" banner** | Signals openness | Goes stale silently and dates the site the moment it stops being true | The résumé and an email link |
| **AI chatbot / "ask my résumé"** | Novelty | Novelty depreciates fast; adds a server runtime and an API bill to a static site | Well-structured résumé + `Person` JSON-LD so assistants can read it directly |

---

## Feature Dependencies

```
Astro + prerendered public pages
    └──enables──> No server runtime on public pages
                      └──conflicts──> Dynamic OG generation  [anti-feature]
                      └──conflicts──> Contact form           [anti-feature]
                      └──conflicts──> Photo analytics        [already Out of Scope]

Photo data (dimensions + urls.thumb + 4 size variants)
    └──enables──> aspect-ratio space reservation (no CLS)
                      └──enables──> correct loading="lazy" behaviour
    └──enables──> LQIP blur-up (gallery AND lightbox)
    └──enables──> srcset/sizes without any image service

Masonry gallery
    └──requires──> break-inside: avoid
    └──requires──> per-tile aspect-ratio
    └──requires──> filter routing decision  (prerendered /photos/[category])
                       └──enables──> per-category column counts (site_config)
                       └──enhanced-by──> <ClientRouter/> view transitions
                                             └──REQUIRES──> astro:after-swap theme handler
                                                            (else theme resets mid-navigation)

Lightbox (DS component)
    └──requires──> backdrop-click close        [DS finding]
    └──requires──> aria-live slide announce    [DS finding]
    └──requires──> swipe on touch              [DS finding]
    └──requires──> srcset in LightboxItem      [DS finding]
    └──requires──> neighbour preload           (app layer)
    └──requires──> EXIF field-level omission   (11/39 photos are partial)
    └──enables───> deep link to a single photo
                       └──enhanced-by──> prerendered /photos/<id> pages
                                             └──enables──> per-photo OG cards

Theme toggle
    └──requires──> is:inline pre-paint script (no FOWT)
    └──requires──> color-scheme on :root      (no scrollbar/control flash)
    └──requires──> finished, AA-passing light palette
                       └──BLOCKED BY──> design-system charcoal theme release

Résumé page
    └──requires──> allowlist sanitizer for <strong> bullets  (XSS fix)
    └──requires──> print stylesheet
    └──requires──> Person JSON-LD
    └──uses──────> static public/resume.pdf   (hand-maintained, not generated)

Admin publish path
    └──requires──> real blob-SHA concurrency + 409 surfacing
    └──requires──> schema validation (form + route + CI)
    └──enables───> post-publish build-status polling (CF Pages deployments API)
                       └──enables──> one-click revert last publish
    └──requires──> unsaved-changes guard

Domain move to akhilsaxena.com
    └──requires──> canonical URLs (Astro `site`)
    └──requires──> 301 from akhilsaxena.pages.dev  (production host has NO auto-noindex)
    └──requires──> 301 /portfolio -> /photos       (legacy route rename)
    └──requires──> sitemap + robots.txt
```

### Dependency Notes

- **`loading="lazy"` requires `aspect-ratio`:** an image with no reserved height collapses to
  zero, so every tile intersects the viewport and the browser fetches all 39 at once — then
  reflows the columns as each resolves. Reserving space fixes correctness *and* CLS with one
  change. The data already carries `dimensions` for all 39.
- **View transitions require the `astro:after-swap` handler:** verified in Astro's docs —
  inline scripts do not re-execute across a client-side swap, so the theme class is lost. If
  `<ClientRouter/>` is adopted for filter navigation, this is not optional.
- **Prerendered category routes conflict with a query-param client filter:** pick one. The
  route approach removes filtering JS entirely and makes `site_config.categoryColumns` natural;
  the query-param approach requires a React island and gives worse crawlability.
- **Light-mode completeness blocks nothing technically but gates quality:** dark-by-default
  means light mode is the under-exercised path. Two tokens already fail AA per PROJECT.md.
- **Build-status polling depends on a Cloudflare API token** (Pages:Read) reaching the admin
  route — an env-var/binding dependency, not just code.
- **Backdrop-click, swipe, `srcset` and live-region announce are all DS findings**, so they
  gate on a design-system release, exactly like the charcoal theme. Batch them into that
  release rather than shimming four workarounds in the portfolio.

---

## MVP Definition

### Launch With (v1) — the cutover set

The live site is down until cutover, so "MVP" here means "ready to replace the old site".

- [ ] Gallery renders all 39 with `aspect-ratio`, LQIP, `srcset`, `break-inside: avoid` — no CLS, no pagination
- [ ] Category filtering with URL state (prerendered routes) + `aria-current`
- [ ] Lightbox with backdrop close, arrow keys, Escape, swipe, neighbour preload, `12 / 39` counter, live-region announce
- [ ] EXIF row: normalised camera/lens, formatted exposure, **fields omitted when null** (11/39 need this)
- [ ] Résumé page: sanitized bullets, print stylesheet, labelled PDF link, `Person` JSON-LD
- [ ] Four case studies + Brevo, each with outcome-first framing and 2–4 decisions with rejected alternatives
- [ ] Theme: `is:inline` pre-paint script, `color-scheme`, `theme-color`, labelled toggle on every page
- [ ] SEO: canonical, OG + Twitter card set, per-page OG image, sitemap, robots.txt, favicon set
- [ ] **Redirects: `*.pages.dev` → apex, and `/portfolio` → `/photos`**
- [ ] Admin: fail-closed auth, form editors, preview pane, real blob-SHA concurrency with 409 surfaced, schema validation, unsaved-changes guard
- [ ] Photo upload: R2 staging → dispatch → processing → commit, with per-photo status
- [ ] `prefers-reduced-motion` honoured on hover scale and scroll nudge

### Add After Validation (v1.x)

- [ ] Post-publish Cloudflare Pages build-status polling — add once the first "did it deploy?" moment happens (it will, immediately)
- [ ] One-click revert last publish — add after the first bad publish, or pre-emptively since the SHA is already in hand
- [ ] Prerendered per-photo pages with per-photo OG cards — add when a photo gets shared and the card is generic
- [ ] Admin commit diff preview — add when the preview pane stops feeling sufficient
- [ ] `<ClientRouter/>` view transitions on filter navigation — add if the full-page swap feels heavy in practice

### Future Consideration (v2+)

- [ ] Native CSS masonry via `@supports` — defer until one engine ships unflagged and the syntax settles
- [ ] Capture-date extraction (`DateTimeOriginal`) in the pipeline — defer until there's a reason to show or sort by date; current dates are ingest dates
- [ ] 35mm-equivalent focal length for phone shots — defer; rounding is enough for now

---

## Feature Prioritization Matrix

Public-facing items first, then admin. Only the non-obvious calls are listed.

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `aspect-ratio` from `dimensions` (CLS + lazy correctness) | HIGH | LOW | **P1** |
| LQIP blur-up from existing `urls.thumb` | HIGH | LOW | **P1** |
| `srcset`/`sizes` over the 4 real variants | HIGH | LOW | **P1** |
| Eager + `fetchpriority="high"` on LCP tile | HIGH | LOW | **P1** |
| Pre-paint `is:inline` theme script + `color-scheme` | HIGH | LOW | **P1** |
| 301s: `pages.dev` → apex, `/portfolio` → `/photos` | HIGH | LOW | **P1** |
| EXIF null-field omission (11/39 affected) | HIGH | LOW | **P1** |
| EXIF camera/lens string normalisation | MEDIUM | LOW | **P1** |
| Résumé bullet sanitization | HIGH (security) | MEDIUM | **P1** |
| Blob-SHA concurrency + 409 surfacing | HIGH (data loss) | MEDIUM | **P1** |
| Lightbox backdrop close | HIGH | LOW | **P1** *(DS)* |
| Lightbox swipe on touch | HIGH | MEDIUM | **P1** *(DS)* |
| Lightbox neighbour preload | MEDIUM | LOW | **P1** |
| Lightbox `srcset` | MEDIUM | MEDIUM | **P2** *(DS)* |
| Lightbox `aria-live` announce | MEDIUM (HIGH for AT) | MEDIUM | **P1** *(DS)* |
| Prerendered `/photos/[category]` routes | MEDIUM | LOW–MED | **P1** |
| Deep link to a single photo | MEDIUM | MEDIUM | **P2** |
| Résumé print stylesheet | MEDIUM | MEDIUM | **P2** |
| `Person` JSON-LD | MEDIUM | LOW | **P2** |
| Per-page OG images (static files) | MEDIUM | LOW | **P2** |
| Case-study decision-with-rejected-alternative structure | HIGH | HIGH (writing) | **P1** |
| Case-study imagery | MEDIUM | MEDIUM | **P2** |
| Unsaved-changes guard in admin | MEDIUM | LOW | **P1** |
| Post-publish build status | HIGH (operator) | MEDIUM | **P2** |
| One-click revert last publish | HIGH (operator) | MEDIUM | **P2** |
| Per-photo pipeline status | MEDIUM | MEDIUM | **P2** |
| Prerendered per-photo pages + OG | MEDIUM | MEDIUM | **P3** |
| Admin commit diff | LOW–MED | MEDIUM | **P3** |
| Native masonry `@supports` | LOW | LOW | **P3** |

---

## Prior-Art Analysis (Git-Backed CMS)

Compared only to establish what is table stakes for a single-operator admin.

| Capability | Decap CMS | Sveltia CMS | Pages CMS | Our Approach |
|-----------|-----------|-------------|-----------|--------------|
| Draft/publish via branch-per-entry ("editorial workflow") | Beta, long-standing, incomplete | Deferred to 2.0; single-branch today | Not a headline feature | **Skip.** One editor, no reviewer — pure overhead. Preview pane + explicit publish + revert |
| Preview | Configurable preview templates | Improved preview UX | Preview pane | **Preview pane rendering the real public components from edited state** |
| Conflict / concurrent-edit protection | Not surfaced as a first-class feature | Not surfaced | Not surfaced | **Table stake for us:** blob SHA on `PUT`, 409 surfaced as "reload"; ref `PATCH` with `force:false` for multi-file commits. This is a named Active requirement precisely because the legacy build broke it |
| Build/deploy feedback after publish | Netlify-coupled deploy status only | Not covered | Not covered | **Poll CF Pages deployments API** (`latest_stage`). The clearest gap in the category; the highest-leverage thing to build |
| Recover from a bad publish | Manual — go to git | Manual | Manual | **One-click revert commit** using the pre-publish SHA we already hold |
| Media handling | Media library | Advanced asset library, drag-drop, folders | Media library | **R2 staging → workflow → commit**, with per-photo status. Different problem (processing pipeline), same expectation: don't leave the operator guessing |
| Auth | Git Gateway / OAuth | GitHub OAuth | GitHub OAuth | **Cloudflare Access, fail-closed** |

**Takeaway:** the category has solved *editing* and largely not solved *publishing feedback*.
That inverts the intuitive priority — the differentiated effort belongs on "did my change go
live, and how do I undo it", not on richer editing.

---

## Sources

**Verified / HIGH confidence**
- Measured directly from `data/portfolio_images.json`, `data/resume.json`, `data/home_config.json`, `data/site_config.json`, `public/resume.pdf`, and live R2 HTTP `HEAD`/`GET` requests against `pub-2d90aedeebcf4142afe524930c3b6471.r2.dev`
- Read directly from `../design-system/src/overlays/Lightbox/index.tsx`, `src/hooks/useDismiss.ts`, `src/interaction/RichText/index.tsx`, `src/feedback/EmptyState/index.tsx`
- [GitHub REST — Repository contents (`sha` required for update; **409 Conflict** on mismatch)](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28)
- [Cloudflare Pages — Preview deployments (`X-Robots-Tag: noindex` on previews; Access can gate them)](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Cloudflare API — Pages deployments (`latest_stage`, stage list)](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/get/)
- Astro docs via Context7 (`/withastro/docs`) — view transitions script re-execution, `astro:after-swap` theme pattern, `data-astro-rerun`, Cloudflare adapter `imageService`

**MEDIUM confidence (multiple sources agree, or authoritative but secondary)**
- [Nielsen Norman Group — Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/)
- [Eric Bailey — Don't use custom CSS mouse cursors](https://ericwbailey.website/published/dont-use-custom-css-mouse-cursors/)
- [David Bushell — Custom cursor accessibility](https://dbushell.com/2025/10/27/custom-cursor-accessibility/)
- [web.dev — Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)
- [Unlighthouse — Don't lazy-load your LCP image](https://unlighthouse.dev/learn-lighthouse/lcp/lcp-lazy-loaded)
- [GoogleChrome/modern-web-guidance — optimize image priority](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/performance/optimize-image-priority.md)
- [Smashing Magazine — Native CSS masonry layout in CSS Grid](https://www.smashingmagazine.com/native-css-masonry-layout-css-grid/)
- [WebKit — Help us invent CSS Grid Level 3, aka "Masonry"](https://webkit.org/blog/15269/help-us-invent-masonry-layouts-for-css-grid-level-3/)
- [Stefan Judis — How to use and feature-detect CSS grid masonry layout](https://www.stefanjudis.com/blog/how-to-use-and-feature-detect-css-grid-masonry-layout/)
- [CSS-Tricks — Approaches for a CSS masonry layout](https://css-tricks.com/piecing-together-approaches-for-a-css-masonry-layout/)
- [Astro — Flashless dark mode with `is:inline`](https://www.vbesse.com/en/blog/flashless-dark-mode/)
- [Sveltia CMS docs — intro / feature comparison with Decap](https://sveltiacms.app/en/docs/intro)
- [LogRocket — 9 best git-based CMS platforms](https://blog.logrocket.com/9-best-git-based-cms-platforms/)
- [Northstar Themes — Redirect `.pages.dev` to your custom domain](https://northstarthemes.com/blog/cloudflare/pages-dev-redirect/)
- [OGPreview — Twitter/X card requirements (`summary_large_image`, 2:1, 5 MB, og fallback)](https://ogpreview.io/guide/twitter)
- [Aubrey Yung — Person schema markup / `knowsAbout`](https://aubreyyung.com/person-schema-markup/)
- [TBH Creative — Printer-friendly website print stylesheets](https://www.tbhcreative.com/blog/website-print-friendly-styling/)
- [Portfolio.Website — How to write a portfolio case study](https://www.portfolio.website/blog/how-to-write-portfolio-case-study)
- [Fonzi — How to build an engineering portfolio that gets you hired](https://fonzi.ai/blog/portfolio-for-engineer)

**LOW confidence (convention, not specification)**
- EXIF display ordering (focal · aperture · shutter · ISO, with camera/lens on a separate line) is an observed community convention across Flickr/500px/photoblogs, not a documented standard. Sources: [ExifReader — Understanding EXIF camera settings](https://exifreader.org/blog/understanding-exif-camera-settings-a-photographers-guide), [FooPlugins — Display EXIF data](https://fooplugins.com/understanding-exif-data/)
- Camera model friendly-name mappings (`SM-N970F` → Galaxy Note 10+, `AC2001` → OnePlus 8T, `ILCE-7CM2` → Sony a7C II) should be spot-checked by the owner against his own gear before shipping

---

## Gaps / Open Questions

1. **Case-study page design does not exist** and neither does the copy. The recommendation
   (write one case study, then design the template) is a sequencing constraint on Phase 0.
2. **Camera friendly-name map needs owner confirmation** — five models, one-time task.
3. **Alt text for 39 photos** is a content task nobody has scheduled.
4. **Whether `<ClientRouter/>` is adopted** changes the theme implementation (`astro:after-swap`
   handler required) and the filter UX. Decide before building either.
5. **Which DS findings make the charcoal-theme release** — batching backdrop-click, swipe,
   `srcset` and live-region announce into that release avoids four local workarounds, but
   widens its scope. This is a real cross-repo scheduling tradeoff, not a technical one.
6. **Lightbox top-end variant** — `large` is 1200w; `original` is 2000w and up to a few hundred
   KB. Whether high-DPR displays get `original` is a bytes-vs-sharpness call not yet made.

---
*Feature research for: personal portfolio + photography site with git-backed admin CMS*
*Researched: 2026-08-16*
