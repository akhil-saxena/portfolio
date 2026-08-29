---
phase: 05-public-site
plan: 08
subsystem: ui
tags: [astro, prerender, seo, open-graph, exif, design-system, photos, routing]

requires:
  - phase: 05-04
    provides: exifRows, displayCamera/displayLens — the single implementation of PUB-07's omit rule and PUB-08's lookup
  - phase: 05-05
    provides: photoSlug / photoHref (the single URL definition, BL-8), srcsetFor, VARIANTS
  - phase: 05-06
    provides: PublicLayout, public-shell.css, <Seo>, the gutter ladder and the page maxima
provides:
  - "/photos/[category]/[slug] — 40 prerendered pages, zero framework JavaScript"
  - "src/components/public/ExifList.astro — the omit-null EXIF list, no null check of its own"
  - "src/styles/photo-detail.css — the frame, its dark-only hairline, the EXIF panel"
  - "test/public/photo-detail.node.test.ts — 9 HTTP controls, including the 05-07 ↔ 05-08 join"
affects: [05-12, 05-14, 05-15, 06-case-studies, 08-cutover]

tech-stack:
  added: []
  patterns:
    - "getStaticPaths is hoisted out of the component module and cannot read its frontmatter — compose every path inside it and pass them down as props"
    - "an HTML attribute reader captures its opening quote and back-references it; either-quote-terminates truncates any value containing an apostrophe"
    - "a built page inlines its own <style>, so a bare class-name grep counts CSS as markup"

key-files:
  created:
    - src/pages/photos/[category]/[slug].astro
    - src/components/public/ExifList.astro
    - src/styles/photo-detail.css
    - test/public/photo-detail.node.test.ts
  modified: []

key-decisions:
  - "The route's params come from photoSlug and every anchor from photoHref, with a build-time equality tying the emitted path to the library's href. The join itself is proven in the suite, against 05-07's built artefact."
  - "A category holding one photograph renders NO previous/next row: a link that reloads the page you are on announces a way out that is not one. Unreachable today (smallest category holds 2)."
  - "categoryOrder DUPLICATES are refused; density is measured and reported, not enforced. Density is not load-bearing once the neighbour walk is positional, and refusing it would fail the build on a legitimate Phase 7 reorder."
  - "The EXIF label and value are Eyebrow and Text rather than app CSS, so §9.3's two type roles resolve out of primitives.css and photo-detail.css restates no token."
  - "sizes is §9.6's string with the number derived from PAGE_MAX.band; sizesFor is not used because it answers a masonry-column question this page does not have."

patterns-established:
  - "A cross-plan join is asserted by reading one plan's built artefact and fetching it against the other's — never by both consulting the same helper."
  - "A tile href is fetched VERBATIM. Appending the trailing slash tests a path no reader follows."
  - "Every planter asserts its own anchor first and every restore is verified by sha256 against the pre-plant file."

requirements-completed: [PUB-07, PUB-08, PUB-09, SEO-01]

duration: 40min
completed: 2026-08-29
---

# Phase 5 Plan 08: The Photograph's Own Page Summary

**Forty prerendered pages, one per record, at the address `photoHref` gives — proven by fetching all
80 tile hrefs out of 05-07's eight built gallery documents and requiring each to be answered by a
page this route generated — with the EXIF omitted rather than placeheld on the eleven records that
need it, no block at all on the one that has nothing, no raw camera or lens string anywhere, a
social card pointing at the 1200w variant, and zero framework JavaScript.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3 of 3
- **Files created:** 4 · **Files modified:** 0
- **Commits:** `11c81b7`, `6d83e20`, `82f5667`, `4dec444`, `5b0751c`, plus this summary

| commit | what |
|---|---|
| `11c81b7` | the route, the frame, `photo-detail.css` |
| `6d83e20` | `ExifList.astro` and its wiring |
| `82f5667` | the HTTP suite, including the join |
| `4dec444` | the join fetched a slash the tile does not carry |
| `5b0751c` | the suite typechecked green under vitest and red under `astro check` |

---

## The route as built

`src/pages/photos/[category]/[slug].astro` → `PublicLayout mainClass="pub-max-band pd-page"`,
`<Seo>` into the named head slot, then five blocks in document order:

| # | Block | Source | Rendered by |
|---|---|---|---|
| 1 | `← All photographs` · `← {Category}` | §13.2 verbatim; the label from `site_config.json` | design-system `Link variant="quiet"` |
| 2 | the frame | `urls.large` + `srcsetFor`, inline `aspect-ratio` + LQIP | plain `<div>` / `<img>` |
| 3 | `<h1>` title, then `place` if present | the record | `Heading level={1} size="xl" weight="bold"`, `Text size="sm" tone="muted"` |
| 4 | the EXIF `<dl>`, or nothing at all | `exifRows(photo.exif)` | `ExifList.astro` |
| 5 | previous / next | position in the `categoryOrder`-sorted category | `Link variant="quiet"` with `rel="prev"` / `rel="next"` |

**Measured on the built artefact:** 40 pages, 476,221 bytes of HTML in total; **1 `<script>` tag per
page** (the shell's inline theme block), **0** of `type="module"`, **0** `astro-island`.

---

## The slug, and the proof it round-trips

**`photoSlug(photo)` is the id with its `<category>-` prefix removed.** The route imports it; it
derives nothing. `params.slug` is that value and every anchor on the page — canonical, `og:url`,
both back links, previous and next — is `photoHref`.

Round-trip, measured over the whole corpus with `PHOTO_ID_SEPARATOR` read from the module:

```
round-trip: 40/40 ids recovered exactly
gentlegiants  id=wildlife-gentlegiants  slug=gentlegiants  href=/photos/wildlife/gentlegiants
  its four published keys, each with a DIFFERENT hash:
    original: gentlegiants-1de8c65e.webp
    large:    gentlegiants-373ba4c9-lg.webp
    medium:   gentlegiants-84557fb8-md.webp
    small:    gentlegiants-9d79605d-sm.webp
```

`wildlife-gentlegiants` is the record the plan flagged and it makes the point sharper than expected:
its four object keys carry **four different content hashes**, so a slug recovered from any URL would
have produced `gentlegiants-1de8c65e` — or three other wrong answers depending which variant you
read. The **id** is the only field that yields `gentlegiants`, and it is the field `photoSlug` reads.

---

## 🔴 How the join was made, and the proof of it

This is the highest-risk item in the plan, so it is answered in three independent places.

### 1. At build time, inside the route

```ts
const params = { category: photo.category, slug: photoSlug(photo) };
const href = photoHref(photo);
const emitted = `/${ROUTE_ROOT}/${params.category}/${params.slug}`;
if (emitted !== href) throw new Error(/* names both paths and the record */);
```

This states the one thing importing the helper does **not** guarantee: that the URL this file's
*location on disk* produces is character-for-character the href the library emits. Exercised in
isolation rather than by reddening a build a concurrent plan was also running:

```
ROUTE_ROOT="photos"   emitted=/photos/wildlife/gentlegiants   photoHref=/photos/wildlife/gentlegiants  -> PASS
ROUTE_ROOT="photo"    emitted=/photo/wildlife/gentlegiants    photoHref=/photos/wildlife/gentlegiants  -> THROW
ROUTE_ROOT="gallery"  emitted=/gallery/wildlife/gentlegiants  photoHref=/photos/wildlife/gentlegiants  -> THROW
```

### 2. In Task 1's gate, which asks `photoHref` and not the route

The plan's own command derived the path with `r.id.replace(r.category + "-", "")` — **the
re-derivation its own `<action>` forbids two paragraphs earlier**, and wrong in its own right
(`String.replace` removes the first occurrence *anywhere*, not the prefix). Replaced with a check
that imports `photoHref` from `src/lib/photo-srcset.ts`, so it can observe a disagreement instead of
agreeing with the route by construction. Full text in **Every gate proven able to fail**, control A.

### 3. In the suite — the assertion neither plan could write alone

`test/public/photo-detail.node.test.ts`'s last block **does not consult `photoHref` for its
expectations at all.** It reads the `href` attribute off every `a.ph-tile` in the eight **built**
gallery documents — 05-07's artefact, the bytes a reader's browser follows — and requires each one,
fetched **verbatim**, to be answered by a page carrying `.pd-frame`:

```
join: 80 tile href(s) across 8 built gallery documents, 40 distinct, every one fetched VERBATIM
      and answered 200 by a photo page (80 of 80 through one 307 to the slashed form);
      40 pages generated
```

`seen.size === generated.size` closes the other direction, so an orphan page cannot pass unseen.

**Proven able to fail** (control I): with `getStaticPaths` planted to drop one record — the gallery
still links to it, the build stays green — the join goes red naming the href, and six other
assertions go with it. Reverted; `git status` reports the file identical to the committed one.

**MEASURED, and it changed the test:** the emitted href answers **307 → 200**, not 200. The first
version of the join appended a trailing slash before fetching, which is the shape that *would have
passed had the un-slashed form 404'd* — it was not testing the reader's path at all. Fixed in
`4dec444`; the redirect is now counted rather than hidden.

---

## PUB-07 and PUB-08, against built HTML

**Null counts re-measured on the committed manifest, and the plan's `<interfaces>` are exact:**
`camera 1 · lens 11 · aperture 2 · shutter 2 · iso 2 · focalLength 2`; **11 of 40** records carry at
least one null; `place` is present on **17 of 40**.

### `product-peppers` — all six null

```
all-null product-peppers: dl 0, pd-exif sections 0, "Details" 0
```

No `<dl>`, no `<section class="pd-exif">`, no heading, no divider (`ds-atom-divider` occurrences on
that page: **0**). The whole element, its rule included, is inside the branch — a `<hr>` above
nothing is the placeholder PUB-07 forbids as much as a heading is.

### `architecture-redbuilding` — camera present, five nulls

```
one-row architecture-redbuilding: dt 1, dd 1, expected value "Nikon D5300"
```

Rendered, verbatim from the artefact:

```html
<section class="pd-exif" aria-labelledby="pd-exif-heading">
  <div class="ds-atom-divider" …></div>
  <h2 id="pd-exif-heading"><span class="ds-atom-eyebrow" data-tone="muted" …>Details</span></h2>
  <dl class="pd-exif-list">
    <dt><span class="ds-atom-eyebrow" data-tone="muted" …>Camera</span></dt>
    <dd><span class="ds-atom-text" data-size="sm" data-tone="secondary" …>Nikon D5300</span></dd>
  </dl>
</section>
```

### Repo-wide, over all 40 built pages

```
exif sections scanned: 39; forbidden strings found: 0
  (en dash U+2013 present on 26 page(s) and deliberately NOT matched)
raw strings searched: 9 (5 camera, 4 lens) across 40 pages; hits 0
exif: 220 row(s) across 39 block(s); 1 record with an entirely null exif rendered no block at all
```

Zero em dashes, zero `Unknown`, zero `N/A`, zero `<dd></dd>` **inside an EXIF section**, and zero of
the nine raw camera/lens strings anywhere on any page.

**Two things about that check that are not incidental:**

- **The scope is the `.pd-exif` section, and it has to be.** The document title of every one of
  these pages legitimately carries an em dash — `Gentle Giants — Akhil Saxena`, the same shape
  05-07's category routes use. A whole-page search for `—` is a check that can only fail, which is
  the "self-invalidating" case the plan's `<done>` warns about; scoping it is the repair.
- **The em dash is U+2014 and only U+2014.** `LENS_DISPLAY_NAMES` renders **en** dashes (U+2013) on
  purpose — `18–55mm f/3.5–5.6` is a range — and they appear on **26 of 40** pages. A matcher that
  conflated the two would red two thirds of the gallery against correct code.

---

## The one-photograph category — decided, not discovered

**A category holding a single photograph renders no previous/next row at all.** Both neighbours
would be the page itself, and a "previous" link that reloads the page you are on is worse than an
absent one for a keyboard or screen-reader user: it announces a way out that is not one.

MEASURED: the smallest categories (`portraits`, `product`) hold **2**, so the branch is unreachable
against the committed manifest — which is exactly why it had to be decided now. The suite asserts
the row's presence against the **derived** category size, so the rule is checked rather than assumed
on all seven categories and on any Phase 7 adds.

**Density: a deliberate narrowing of the plan's wording, recorded rather than done quietly.** The
plan asks for a density assertion. The neighbour walk is **positional** in the sorted list, so
density is not load-bearing — `1, 2, 4` produces a perfectly good cycle — and refusing it would fail
the build on a legitimate Phase 7 reorder for no reader-visible reason. What **is** load-bearing is
a **duplicate**: two records sharing a `categoryOrder` leave their relative order to the sort's
stability, which decides silently and can decide differently between builds, so previous/next would
swap with no edit to any file. Duplicates are refused by name; density is measured and printed by
the suite (`abstract 4 · architecture 14 · nature 8 · portraits 2 · product 2 · street 4 ·
wildlife 6`, dense 1..n in all seven today).

---

## SEO-01

Per page, asserted for all 40: `og:image` is the record's own `urls.large`, absolute, its basename
ending in the large suffix **read from `VARIANTS`**; `og:image:alt` is the photograph's `alt`;
`og:type` is `article`; `twitter:card` is `summary_large_image`; the canonical is the page's own
path and equals `og:url`.

```
social card: 40 og:image(s), every one absolute and ending "-lg";
             og:type=article, twitter:card=summary_large_image, canonical=own path, on all of them
```

The `<Seo>` `description` is the photograph's **`alt`** — reviewed prose describing this exact image
(shortest in the corpus: 83 characters), and by `PhotoSchema`'s own rule never equal to the title,
so the card's title and description cannot degenerate into the same string. No sentence was invented
for a field that does not exist.

---

## Every gate proven able to fail

Four steps each — **PASS on correct code · FAIL naming it · FAIL given nothing to check ·
walk-through**. The interactive shell throughout was **zsh 5.9** (`ps -p $$ -o comm=` → `/bin/zsh`,
`$ZSH_VERSION` → `5.9`); GitHub Actions runs bash, so **no `${PIPESTATUS[0]}` and no
`( cmd && R=0 || R=1 )` appears anywhere below** — where a status was needed across a pipe it was
read as zsh's one-indexed `${pipestatus[1]}`, which is 05-10's finding applied rather than repeated.

**Every check was written to a file with the Write tool and run as `node <file>`**, never through
`echo`/heredoc into `bash -c '…'`. That is deliberate: 05-05 got two false PASSes from a
single-quoted token terminating an outer `bash -c '…'`, and 05-10 got three from zsh's builtin
`echo` interpreting `\n` inside an embedded JavaScript string. Both classes are unreachable here.
**Every planter asserts its own anchor before planting and refuses if it is absent, and every
restore was verified by `sha256`/`cmp` against the pre-plant file.**

### A. Task 1's page-existence gate (`check-pages.mjs`) — shell: zsh 5.9

Imports `photoHref` from `src/lib/photo-srcset.ts`. Run against an HTML-only copy of `dist/client`
held **outside** `dist/` — 05-10 lost three backups to a concurrent `rm -rf dist`.

| # | Control | Result |
|---|---|---|
| A1 | correct build | `records 40, missing 0` · exit **0** |
| A2 | one generated page deleted (anchor asserted, presence re-asserted at check time) | `MISSING …/photos/wildlife/gentlegiants/index.html` · `records 40, missing 1` · exit **1** |
| A3 | restored | `records 40, missing 0` · exit **0** |
| A4 | pointed at an absent dist root | `FAIL: … does not exist — nothing was built to check` · exit **1** |
| A5 | an empty manifest (a copy, `[]`) | `FAIL: the manifest holds no records — this gate would compare nothing` · exit **1** |

**Walk-through — inputs that satisfy it while violating its intent:**

| Probe | Verdict |
|---|---|
| a page that exists but is **empty** (0 bytes) | exit 0 — **ACCEPTED, OPEN.** It checks existence, not content. Closed by the suite, which requires one `<h1>`, the alt, and the whole meta set. |
| the route emitting a path **05-07's tile does not use** | exit 0 — **ACCEPTED, OPEN by construction**, because this gate reads `photoHref` too. This is precisely the hole the suite's join exists to close, and the reason the plan's `<done>` insists the expression come from the module rather than from the route. |

### B. `photo.date` is unreferenced under `src/pages/photos` — shell: zsh 5.9

```
files scanned: 3
grep -rn '\.date' src/pages/photos      -> no output, exit 1  (the pass)
grep -rn 'categoryOrder' src/pages/photos -> exit 0            (the canary: the grep CAN match this tree)
```

The canary matters: an absence assertion whose matcher is broken is indistinguishable from a clean
tree, and `grep` exits **2** on a missing path, which an `if` reads as "not found". The file-count
line is the anti-vacuity guard — three files scanned, not zero.

### C. No `<script type="module">` on any built photo page — shell: zsh 5.9

```
detail pages found: 40
OK: 0 of 40 detail pages carry a module script (both quote spellings matched)
```

| # | Control | Result |
|---|---|---|
| C1 | correct build | `0 of 40` · exit **0** |
| C2 | a planted `<script type="module" src="/_astro/x.js">` (out of tree) | matched · exit **0** from `grep -l`, i.e. the matcher fires |
| C3 | the **single-quoted** spelling `<script type='module' …>` | **also matched** — 03-06's defect class closed rather than inherited |
| C4 | the same command against a directory with no page | `0` pages found → the guard exits **1** rather than reporting a clean scan |

### D. Task 2's EXIF gate (`check-exif.mjs`) — shell: zsh 5.9

The degenerate records are **found** (`exifRows(r.exif).length === 0` and `=== 1`), not named, so
the gate refuses if the corpus ever loses either shape. Status read as `${pipestatus[1]}` where the
output was filtered.

| # | Control | Result |
|---|---|---|
| D1 | correct build | all four claims pass · exit **0** |
| D2 | an EXIF list + `Details` + an em dash planted on the all-null record | 4 findings, incl. `product-peppers rendered a "Details" heading over nothing` · exit **1** |
| D3 | a second row (`Lens: Unknown`) planted on the one-row record | `rendered 2 rows where the record yields exactly one` + `contains Unknown` · exit **1** |
| D4 | the raw string `SONY ILCE-7CM2` planted on a page | `ships the raw camera string "SONY ILCE-7CM2"` · `hits 1` · exit **1** |
| D5 | one page removed | `has no built page at …` · `pages read: 39 of 40` · exit **1** |
| D6 | pointed at an empty dist root | `no built photo page was readable — every assertion below would have read nothing` · exit **1** |
| D7 | restored | exit **0**; both restores `cmp`-identical |

### E. The two manifest-copy controls — `data/` was never written

| # | Control | Result |
|---|---|---|
| E1 | a **further null field** plus an unknown null key, on a **copy** of a record | `before: 6 rows → after: 5 rows`; `rows with an empty value: 0`; `rows carrying an em dash: 0`. The nulled field produced **no row**, and the unknown null key produced none either. |
| E2 | one camera set to `NIKON CORPORATION NIKON D9999` on a **copy of the manifest** | `assert-exif-display-coverage.mjs <copy>` exits **1**, naming the photograph *and* the value: `x abstract-intothemist — exif.camera = "NIKON CORPORATION NIKON D9999" … has no entry in CAMERA_DISPLAY_NAMES` |
| E2b | the same gate against the real manifest | exit **0**, `40 records, 68 non-null values`, `git status data/` empty |

**🔴 One control was NOT run, and the substitution is recorded rather than glossed.** The plan's
`<done>` asks for the unknown camera to be proven by *building against* the corrupted manifest. The
manifest path is hard-coded in `content.config.ts` and `astro.config.mjs`, so building against a
copy requires **writing `data/`** — which this plan is forbidden to do and which would have broken
two concurrent plans' builds in a shared tree. E2 proves the refusal at the gate that owns it and
that names the photograph as well as the value. That the **mechanism** works — an exception raised
in this route's prerendered frontmatter fails `astro build` with exit 1 rather than rendering — was
measured for free by this plan's own first build (see *Findings*, item 1): the throw came from
`getStaticPaths`, the prerender returned 500 and `npm run build` exited **1**.

### F. The wrap control — shell: zsh 5.9 driving `npx vitest run`

Plant: `next` **clamps** at the last index instead of wrapping
(`bucket[Math.min(index + 1, size - 1)]`), anchor asserted first.

```
AssertionError: following next 4 times in abstract did not return to the start:
  expected '/photos/abstract/plane' to be '/photos/abstract/intothemist'
AssertionError: abstract-plane's next does not point back at it:
  expected '/photos/abstract/watertexture' to be '/photos/abstract/plane'
Tests  2 failed | 7 passed (9)
```

It goes red **naming the category**, and only the two claims about ordering break. Reverted; the
file's `sha256` matches the pre-plant file exactly and `git status` reports it identical to the
committed one. **Without this control the cycle assertion could have passed by never reaching an
end** — which is the plan's own reason for demanding it.

### G. The `og:image` suffix assertion, proven non-vacuous

The suffix is read as `VARIANTS.find(v => v.urlKey === 'large').suffix`; there is no `-lg` typed in
the test. Planted in a **copy of the value** (`Object.defineProperty(LARGE, 'suffix', '-xl')`) rather
than by editing `src/lib/photo-variants.ts`, which is 05-05's committed file and shared with two
running plans:

```
AssertionError: abstract-intothemist's og:image basename intothemist-lg.webp
  does not end in the large suffix -xl
Tests  1 failed | 8 passed (9)
```

### H. The suite refuses an emptied fixture rather than passing on nothing

Plant: `(manifest as unknown[]).length = 0` before the module guards.

```
Error: photo-detail: data/portfolio_images.json holds no records; nothing to check.
Test Files  1 failed (1)
      Tests  no tests
```

`Tests no tests` with the **file** failed is the right shape: a suite that derived `0` and then
passed zero comparisons would have reported green.

### I. The join, proven able to fail

Plant: `getStaticPaths` drops one record; the gallery still links to it and **the build stays
green**, so nothing else in the tree is disturbed.

```
FAIL  🔴 the join: every gallery tile resolves to a page this route generated (BL-8)
AssertionError: wildlife-gentlegiants did not answer 200: expected 404 to be 200
AssertionError: wildlife-kingfisher's previous (/photos/wildlife/gentlegiants) is not a generated page
Tests  7 failed | 2 passed (9)
node check-pages.mjs -> MISSING dist/client/photos/wildlife/gentlegiants/index.html · exit 1
```

Reverted; `git status` reports the route identical to the committed file.

---

## 🔴 Defective verify commands found in the plan

### 1. Task 1's path expression is the re-derivation the same task forbids

```js
`dist/client/${r.category}/${r.id.replace(r.category+"-","")}/index.html`
```

Two defects. It **re-derives the slug**, which the `<action>` forbids two paragraphs earlier and
which makes the gate structurally unable to observe a disagreement with 05-07 — the plan's `<done>`
spots this and asks for the repair, so this is recorded as *found and applied*, not as an oversight.
And `String.replace` removes the **first occurrence anywhere**, not the prefix: for an id such as
`nature-riverbend-nature-2` it silently produces a different string from `photoSlug`, which
**refuses** that shape instead. Replaced with an imported `photoHref`.

### 2. Task 2's em-dash sweep, as literally worded, can only fail

The `<done>` asks for "zero occurrences of the strings `—`, `Unknown`, `N/A` … over every built
photo page". Every page's `<title>` carries an em dash by design (`{title} — Akhil Saxena`, matching
05-07's category routes), so a page-wide search returns a hit on all 40. The `<done>` anticipates
this — *"filter out any match inside prose so the check is not self-invalidating"* — and the applied
form scopes the search to the `<section class="pd-exif">`. Recorded because the *unscoped* form is
the one a later plan would copy.

### 3. Both `<verify>` blocks assert on `dist/` without rebuilding or guarding it

Each runs `npm run build` first, which is right — but neither asserts the artefact is present **at
check time**, and this tree bit exactly there: `dist/client/photos/product/peppers/index.html`
vanished mid-inspection when a concurrent plan rebuilt, and reappeared ten seconds later. 05-10's
standing rule is applied instead — every control asserts the state it believes it created, at the
moment it runs — and every gate written here refuses with a named message when its input is absent
rather than reading nothing and passing.

---

## Findings

### 1. 🔴 `getStaticPaths` cannot see the component's frontmatter — and only the build says so

The first revision declared the route's first path segment as a module constant and read it in both
`getStaticPaths` and the component body. **`astro check` passed. The build died:**

```
Failed to get static paths from the Cloudflare prerender server (500: Internal Server Error).
ReferenceError: ROUTE_ROOT is not defined
```

Astro **hoists `getStaticPaths` out of the component module** and evaluates it on its own; only its
imports are in scope. This is 05-01's finding in a new costume — the prerender runs inside `workerd`
and a green typecheck is not evidence about it.

**The repair is not a second copy of the constant.** `getStaticPaths` composes `href`,
`categoryHref` and `galleryHref` once and passes them down as props, so the segment is written in
exactly one place and the component body never composes a URL at all.

### 2. 🔴 An attribute reader that treats either quote as a terminator truncates 8 of 40 records

The obvious shape — `attr=["']([^"']*)["']` — read
`alt="Phantom Manor's mansard roof, …"` as **`Phantom Manor`**, and the suite went red against a
page that was completely correct. Astro has no reason to escape an apostrophe inside a
double-quoted attribute and does not; **8 of the 40 records carry one** in their `alt` or `title`.

The failure direction was lucky. The *same* pattern used to **search** — for a raw camera string,
say — silently reads a shorter needle and reports a clean page. Every attribute in the suite is now
read by a scanner that captures its opening quote and back-references it, and that tracks quoting
while slicing a tag rather than stopping at the first `>`.

### 3. 🔴 A built page inlines its own `<style>`, so a bare class-name grep counts CSS as markup

MEASURED on `dist/client/photos/product/peppers/index.html` — the record that renders **no** EXIF
panel:

```
<style> blocks: 1, <link rel="stylesheet">: 1
naive   grep -c 'pd-exif'   -> 5
precise grep -c 'class="pd-exif"' -> 0     >Details< -> 0     <dl -> 0
```

A "this page renders no EXIF panel" gate written as `! grep -q pd-exif` **could never pass**, on
correct code, forever. This is 05-10's `/<li/` also matching `<link` in a new place: an artefact
matcher must be anchored to markup, not to a name that also appears in the stylesheet the page
carries. Both this plan's gate and its suite match `class="pd-exif"` and `<section class="pd-exif"`.

### 4. `npx vitest run` was green while `npm run build` was red — on the same file

`astro check` covers `test/**` (128 files). `html.match(…) ?? []` types an index as
`string | undefined`, so `stripTags(headings[0])` is `ts(2345)` even though the length was asserted
one line above. The suite was 9/9 green; the build exited **1**. Fixed in `5b0751c` with `?? ''`.
**Read the build's own exit code.**

### 5. `dist/` disappeared mid-inspection, and reappeared

A concurrent plan's `rm -rf dist` landed between two of this plan's reads; the file was back ten
seconds later. Nothing was lost — the reference copy for every control lived in the scratchpad,
outside the tree it protects — and both gates were re-run against the rebuilt artefact and are
recorded green on it.

---

## Design-system gaps — filed upstream, not patched

### 🔴 `Eyebrow` fixes its weight inline and exposes no `weight` prop

MEASURED against the installed `2.0.0-beta.1`: `Eyebrow`'s base style is
`fontWeight: var(--weight-bold)`, inline, and `EyebrowProps` carries `size`, `color` and `tone` and
nothing else. **§3.1 gives this role weight 500.** An inline style cannot be reached by a consumer
stylesheet without `!important` reaching past a component into its internals — the workaround the
Core Value forbids and which Phase 0 declined for the same class of defect (D-16-1). Carried as
shipped. **For `2.0.0-beta.2`: `Eyebrow` should accept a `weight` token, as `Text` and `Heading` do.**

Its `size` scale is also worth writing down, because the names are misleading: **`md` → `--text-xs`
(11px)**, `sm` → `--text-2xs` (9.5px), `xs` → a hard-coded `8`. §3.1's eyebrow role is `--text-xs`,
so the correct prop is `size="md"` — as 05-07 also concluded for its count line.

### `Heading`'s token-size path carries no letter-spacing

`primitives.css` gives `.ds-atom-heading[data-size="xl"]` a `font-size` and a `line-height` and no
`letter-spacing`; only the two display rungs (`3xl`, `4xl`) carry `--ls-tighter`. §3.1 assigns the
photo-title role `--ls-tight`, so `photo-detail.css` carries **one** declaration —
`.pd-title { letter-spacing: var(--ls-tight) }`, written as a token, no number. The legacy *numeric*
size path derives tracking from the px size; the token path should do the same.

### Carried, not re-patched

The `Footer` `variant="footer"` underline defect (05-06) and the `Button`-has-no-`as` gap (05-10)
both reach this route through the shared shell. Neither was patched locally — same reasoning.

---

## Contradictions with the plan and the UI-SPEC

| # | Where | What |
|---|---|---|
| 1 | §9.6 / §9.3 head | The spec says **39 prerendered pages**, and §9.3's null table is stated "across all 39". The manifest is at **40** and every count in the code, the gates and the suite is derived. The plan's `<interfaces>` already corrects this; recorded again because the UI-SPEC body still says 39. |
| 2 | §9.3 vs the corpus | §9.3: `place` is "present on **16 of 39**". Re-measured: **17 of 40**. Nothing depends on the figure; the render is `photo.place && …`. |
| 3 | §9.4 vs the plan | §9.4 says the corpus carries **two** distinct dates, the plan's `<action>` says **three**. Neither is rendered and neither is read, so the discrepancy is inert — recorded so the next reader does not treat either as measured. |
| 4 | Plan Task 3 `<action>` | Asks to "assert density". Density is not load-bearing once the neighbour walk is positional, and enforcing it would fail the build on a legitimate Phase 7 reorder. **Duplicates** are refused instead — that is the case with the silent symptom — and density is measured and printed by the suite. |
| 5 | Plan Task 2 `<done>` | Asks for the unknown-camera refusal to be proven **by building against a corrupted manifest**. Not possible without writing `data/`, which this plan is forbidden to do and which would have broken two concurrent builds. Substituted with the gate that owns the refusal, run against a copy — recorded in full under control E. |
| 6 | §9.6 `sizes` | `min(100vw, 1080px)` ignores the gutters, so it over-states the frame by up to `2 × gutter`. Carried as §9.6 wrote it — the error is in the safe direction and the alternative is a fifth bespoke `sizes` form on a page with one image — with the number derived from `PAGE_MAX.band` rather than typed. |
| 7 | §13.2 | Gives copy for the two back links and **none for previous/next**. Implemented as the neighbouring photograph's own **title** (`← Yin Yang`, `Kingfisher →`) with `rel="prev"`/`rel="next"` and an `aria-label`, so no copy string was invented — the link says where it goes. Flagged for 05-15. |
| 8 | §5.4 route inventory | Lists `Divider` for this route; §9.6's prose does not mention a rule. It is rendered **inside** `ExifList`, so the all-null record gets no divider either. |

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] `getStaticPaths` could not read the route's module constant**
- **Found during:** Task 1's first build
- **Issue:** `ReferenceError: ROUTE_ROOT is not defined` in the prerender; `astro check` was green.
- **Fix:** every path composed inside `getStaticPaths` and passed down as a prop — one definition,
  not two copies.
- **Files:** `src/pages/photos/[category]/[slug].astro` · **Commit:** `11c81b7`

**2. [Rule 1 — Bug, in my own gate] The suite's attribute reader truncated at an apostrophe**
- **Found during:** Task 3's first run (red against a correct page)
- **Fix:** a quote-aware tag slicer and a back-referenced quote in every attribute read.
- **Files:** `test/public/photo-detail.node.test.ts` · **Commit:** `82f5667`

**3. [Rule 2 — Missing critical coverage] The join fetched a slash the tile does not carry**
- **Issue:** appending `/` before fetching meant the check would have passed had the emitted href
  404'd. Measured: the emitted href answers **307 → 200**.
- **Fix:** fetch verbatim; count the redirect.
- **Files:** `test/public/photo-detail.node.test.ts` · **Commit:** `4dec444`

**4. [Rule 1 — Bug] The suite failed `astro check` while passing vitest**
- **Fix:** `?? ''` on an index typed `string | undefined`.
- **Files:** `test/public/photo-detail.node.test.ts` · **Commit:** `5b0751c`

**5. [Rule 2 — Missing critical functionality] The LQIP guard was carried to the second
interpolation site.** `thumb` lands inside a CSS `url()`, where the attribute escaper is not the
relevant defence. It is a **second copy** of `PhotoTile.astro`'s guard and says so at the
declaration: extracting it would mean editing 05-07's file while 05-07 was still running. Each guard
protects its own interpolation site; consolidating them is a one-line change filed for 05-14.

**6. [Rule 2] The category label is refused rather than defaulted.** A photograph filed under a
category `site_config.json` does not declare would render `← undefined` on every page of that
category. RI-2 covers the opposite direction only.

### Deliberate non-actions

- **`data/portfolio_images.json` and `data/site_config.json` were read and never written.**
  `git status data/` is empty; every corrupted-input control ran against a copy in the scratchpad.
- **No file outside this plan's declared set was touched.** `PhotoTile.astro`, `photo-variants.ts`
  and `photo-srcset.ts` were read constantly and edited never, including for controls — G was
  planted in a copy of a value rather than in 05-05's module for exactly that reason.
- **No `git add -A`, no `git add` from a verify step, no `git checkout`/`stash`/`reset`/`clean`/
  `worktree`.** Every commit staged explicit paths. Untracked files belonging to 05-09 (`work.astro`,
  `ProjectCard.astro`, `EmploymentBand.astro`, `work.css`) were present throughout and never staged.
- **No scratch file in the repo root.** Every check, canary and reference copy lives in the session
  scratchpad; the one temporary probe placed under `test/` (to measure the trailing-slash behaviour)
  was removed in the same command that ran it, and `git status test/` was checked after.
- **`gate:sinks` untouched**, no rule added, no allowlist entry added. Every value on the page lands
  in an attribute or a text node Astro escapes; there is no raw-HTML directive anywhere.

---

## Verification

| Command | Result |
|---|---|
| `npm run build` | **exit 0** (`wrangler types` → `astro check` → `astro build` → `gate:content`) |
| `npm run typecheck` | **exit 0** — 128 files, 0 errors, 0 warnings, 7 pre-existing hints |
| `npm test` | **exit 0** — 38 files, **1363 passed**, 0 failed (unit, integration, workers) |
| `npx vitest run test/public/photo-detail.node.test.ts` | **9 passed** |
| `npm run check` | **exit 0** — biome + prettier; 6 pre-existing warnings, none in this plan's files |
| `node scripts/assert-exif-display-coverage.mjs` | **exit 0** — 40 records, 68 non-null values, tables read from the module |
| `node scripts/assert-no-raw-html-sinks.mjs` | **exit 0** |
| `node scripts/assert-ds-import-contract.mjs` | **exit 0** — subpath imports only, no barrel |
| `node scripts/assert-gutter-ladder.mjs` | **exit 0** — 4 rungs, 4 maxima |
| `node scripts/assert-no-unresolved-placeholders.mjs` | **exit 0** |
| page-existence gate (`photoHref`-derived) | **exit 0** — `records 40, missing 0` |
| EXIF gate (built HTML) | **exit 0** — all four claims |
| `<script type="module">` on a photo page | **0 of 40** |
| `git add` inside a verify step | **never** |
| `data/` written | **never** |

---

## Known Stubs

None. Every element on every page is wired to `data/portfolio_images.json` or
`data/site_config.json`. There is no placeholder text, no empty array reaching a renderer and no
"coming soon" — and the one thing that *looks* like an omission, the missing EXIF panel on
`product-peppers`, is PUB-07's requirement rather than a gap, asserted by name against built HTML.

## Threat Flags

None. The route introduces no network endpoint, no auth path, no file access and no schema change.

- **T-05-08-01** (injection through meta values) — mitigated: every value lands in an attribute
  Astro escapes, there is no raw-HTML directive in either new component, and `gate:sinks` was re-run
  unchanged. The one value that lands in a CSS `url()` rather than an ordinary attribute carries an
  explicit whole-value base64 guard.
- **T-05-08-02** (spoofed `og:url`/canonical) — mitigated: both are built by `<Seo>` from
  `Astro.site`, which throws on anything it cannot make absolute. Asserted per page: the canonical's
  pathname is the record's own `photoHref` and `og:url` equals it.
- **T-05-08-03** (a false claim about equipment) — mitigated: `displayCamera`/`displayLens` throw on
  an unknown string, `assert-exif-display-coverage.mjs` catches it earlier naming the photograph,
  and the suite asserts repo-wide that no raw string reaches a page.

---

## For the plans that depend on this one

- **05-12 (`assert-photo-date-unrendered.mjs`):** `photo.date` is unreferenced under
  `src/pages/photos` — 3 files, `grep -rn '\.date'` empty, with a `categoryOrder` canary proving the
  matcher works on that tree. `ExifList` cannot reach the field: `exifRows` takes the exif object.
- **05-14 (bundle / JS budget):** a photo page ships **one** `<script>` tag — the shell's inline
  theme block — **0** of `type="module"`, **0** `astro-island`. The suite asserts all three across
  all 40. **Not closed by anything today: a dynamic `import()` inside a classic script.**
  Also yours: the `THUMB_URI` guard now exists in two files (`PhotoTile.astro` and this route) at
  two real interpolation sites; consolidating it into one export is a one-line change that was not
  safe to make while 05-07 was running.
- **05-15 (human review):** three things. (i) previous/next read as the neighbouring photograph's
  **title**, because §13.2 gives no copy for them. (ii) The EXIF panel is headed **"Details"** — the
  word PUB-07's own prose uses, but not a §13.2 contract row. (iii) The EXIF label ships at
  `--weight-bold`, not §3.1's 500, because `Eyebrow` fixes it inline.
- **Anyone writing an artefact gate on a class name:** the page inlines its own `<style>`, so
  `grep -c 'pd-exif'` returns **5** on the page that renders **none**. Anchor to markup.
- **Anyone reading an HTML attribute:** capture the opening quote and back-reference it. 8 of 40
  `alt`/`title` values carry an apostrophe and Astro does not escape it.
- **Anyone writing a `getStaticPaths`:** it cannot see the file's frontmatter. Compose inside it and
  pass down.
- **Upstream, for `2.0.0-beta.2`:** `Eyebrow` should accept a `weight` token; the `Heading`
  token-size path should carry its role's letter-spacing.

---

## Self-Check: PASSED

All four files this plan claims to have created exist on disk and are tracked; all six commit
hashes quoted above resolve in `git log`; the four source files are byte-identical to their
committed state after every planted control; no scratch file was left in the repository.

```
FOUND: src/pages/photos/[category]/[slug].astro
FOUND: src/components/public/ExifList.astro
FOUND: src/styles/photo-detail.css
FOUND: test/public/photo-detail.node.test.ts
FOUND: .planning/phases/05-public-site/05-08-SUMMARY.md
FOUND: 11c81b7  feat(05-08): the photograph's own page — the path is the imported href, not a second derivation
FOUND: 6d83e20  feat(05-08): the EXIF list that omits rather than placeholds — one rule, one implementation
FOUND: 82f5667  test(05-08): the 40 photo pages over HTTP — and the join no single plan could assert
FOUND: 4dec444  fix(05-08): the join fetched a slash the tile does not carry
FOUND: 5b0751c  fix(05-08): the suite typechecked green under vitest and red under astro check
FOUND: 7dc200d  docs(05-08): the photo detail route — the join asserted against 05-07's artefact, and four findings
git ls-files --error-unmatch <all five>  -> all five tracked
git status --short <my four source files> -> empty
```
