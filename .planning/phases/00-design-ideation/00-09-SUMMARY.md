---
phase: 0
plan: 09
subsystem: design-ideation
tags: [dsgn-03, ivory-to-charcoal, public-sketches, oq-1, contact-sheet, zero-js, attributability]

requires:
  - .playground/ harness (plan 01)
  - theme-charcoal.css + fonts-charcoal.css (plan 04)
  - manifest.css — the D-33 public CSS manifest (plan 07)
  - 00-COPY/one-liners.md (plan 02)
provides:
  - X-work-recolour — the handoff's Work page, recoloured only
  - X-work — Work restructured into two bands, five projects, status badges
  - X-photos — 39 photographs on charcoal with anchor filters, zero framework JS
  - X-home-act2 — OQ-1 resolved by sketch
  - X-contact-sheet — Parts 1 and 4, built from the first sketch
  - check-no-ivory.sh — the DSGN-03 absence-of-ivory guard
  - 00-PUBLIC-DESIGN-NOTES.md — the nine resolutions and the OQ-1 decision
affects:
  - Phase 1 (six new design-system findings, one of which breaks the brand accent outright)
  - Phase 5 (PUB-01 inherits a rendered Act-2 layout; PUB-04 inherits the anchor filter shape)
  - Phase 0 plans 11 (eye review), 12 and 16 (contact-sheet Parts 1-3), 17 (screenshots)

tech-stack:
  added: []
  patterns:
    - recolour and restructure as two artefacts, one variable each
    - the contact sheet built from the first sketch, never retrofitted
    - guard exclusions closed by a positive assertion rather than trusted
    - build-time assertion instead of a source grep, so the check survives real data
    - describe a hex by its role, never spell it, so prose cannot trip a guard

key-files:
  created:
    - .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md
    - .playground/src/layouts/Public.astro (gitignored)
    - .playground/src/components/PublicNav.tsx (gitignored)
    - .playground/src/pages/index.astro (gitignored)
    - .playground/src/pages/work-recolour.astro (gitignored)
    - .playground/src/pages/work.astro (gitignored)
    - .playground/src/pages/photos.astro (gitignored)
    - .playground/src/pages/home-act2.astro (gitignored)
    - .playground/src/data/{portfolio_images,resume,site_config,home_config}.json (gitignored)
    - .playground/check-no-ivory.sh (gitignored)
  modified: []

decisions:
  - "OQ-1 is closed as resolved-by-sketch rather than deferred: the design system is promoted to a full-width flagship row and the handoff's approved 2x2 is kept intact beneath it, which is the smallest change to a signed-off design that holds five projects without leaving a hole"
  - "check-no-ivory.sh excludes theme-charcoal.css by exact filename, because two of the seven ivory values are also charcoal light-mode tokens — and closes that exclusion with an assertion that those two values appear there only as those two declarations"
  - "The five project titles are asserted at build time rather than grepped from source, so titles can be read from resume.json and still not drift silently"
  - "Archived is rendered in a legend rather than pinned to a project: only Live and Maintained occur in the real data, and labelling a live project archived to fill a swatch would be inventing a fact"
  - "Accent colours are applied via the legacy `color` prop, not `tone=\"accent\"`, because the tone axis resolves to --amber-d which charcoal never redeclares"

metrics:
  duration: ~28 min
  completed: 2026-08-17
---

# Phase 0 Plan 09: Public Sketches, the Ivory Guard & OQ-1 Summary

Resolved Work and Photos onto charcoal dark as four running design-system sketches with
**zero framework JavaScript on all 12 static routes**, split the recolour from the
restructure so a review dislike is attributable to one change, closed **OQ-1 by sketching
it rather than deferring it**, and — because the sketches are the first thing in this
project to actually *compose* the design system on a charcoal page — surfaced **six new
design-system findings, one of which means the brand accent does not reach a single
declarative accent in the library.**

## What Was Built

| Task | Output | Commit |
|------|--------|--------|
| 1 | `Public.astro`, `PublicNav.tsx`, `index.astro` (Parts 1 + 4), `work-recolour.astro`, 4 JSON fixtures | *(no commit — gitignored)* |
| 2 | `work.astro`, `home-act2.astro`, contact-sheet registration | *(no commit — gitignored)* |
| 3 | `photos.astro`, `check-no-ivory.sh`, `00-PUBLIC-DESIGN-NOTES.md` | `f933e89` |

**Tasks 1 and 2 produced no commit by design.** Every file they create lives inside
`.playground/`, which plan 01 gitignored. That is the D-02 fence working as specified, not
a skipped step — `git status` was clean of playground paths after each. Their durable
output is the design notes committed by task 3, plus the screenshots plan 17 takes before
deletion. Same precedent as plan 01 task 2, plan 04 tasks 1-2 and plan 07 tasks 1-2.

## The Artefacts

| ID | Route | What it proves |
|----|-------|----------------|
| `X-work-recolour` | `/work-recolour` | The handoff's structure untouched, colour resolved — four projects, 2×2, the trailing strip. Carries resolutions 1, 2 and 3. |
| `X-work` | `/work` | The same tokens with D-44's two bands, D-45's badges and D-38's five projects. Every difference from the recolour is structural. Carries resolution 8. |
| `X-photos` | `/photos` | 39 real photographs, eight anchor filters, zero JS. Carries resolutions 5 and 6, and is G-9's evidence. |
| `X-home-act2` | `/home-act2` | OQ-1 has an answer. Five projects in the Act-2 grid at the handoff's stated 40×56 gaps. |
| `X-contact-sheet` | `/` | Parts 1 and 4, built alongside the first sketch. |

## The Measurements

**Zero framework JS — HOLDS across every public sketch.** `check-no-js.sh` PASSes on **12
static routes**, up from 7, with no widening of its exclusion list. Four new public routes,
one contact sheet, one React component (`PublicNav.tsx`) rendered without a hydration
directive — none of it emits a script tag. The DS-09 measurement stays readable because
nothing this plan added hydrates.

**All 39 photographs render.** `dist/photos/index.html` carries **39 `<img>` tags**, real
R2 URLs with a two-entry `srcset`, real `dimensions` for aspect-ratio CLS prevention, and
the real base64 LQIP from `urls.thumb` — no invented fixture anywhere.

**Copy matches `00-COPY/one-liners.md` character for character**, verified rather than
asserted: all five `- card:` payloads found verbatim in `dist/work/index.html` (160/196/194/189/191
characters) and all five `- one-liner:` payloads in `dist/home-act2/index.html`
(97/96/90/85/87 characters), after HTML-entity decoding. All five `- badge:` values render.

**The five pre-existing checks are undisturbed.** `check-theme-exhaustive.mjs`,
`check-font-names.mjs`, `check-contrast.mjs` and `check-css-size.mjs` all exit 0;
`check-bundle.mjs` still exits 1, which remains the recorded G-15 finding rather than
breakage. `theme-charcoal.css` was not modified — verified by SHA-256 after the one
negative control that touched it.

**Three negative controls on the new guard, all biting, all restoring byte-identically:**

| Control | Applied | Result |
|---------|---------|--------|
| Ivory leak | literal ivory muted grey appended to `photos.astro` | exit 1, names the file and line |
| Case blindness | the same value in lower case | exit 1 — the check is case-insensitive, as a browser is |
| Exclusion abuse | a second occurrence of a colliding value in the excluded theme file | exit 1, "Found 2 occurrence(s), of which 1 match that declaration" |

**A fourth negative control, on the five-project guard:** removing Cairn from the playground's
`resume.json` fails the build with *"X-home-act2: this sketch resolves OQ-1 for five projects
and "Cairn" (id "cairn") is missing from resume.json"*. Restore verified byte-identical.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `AppBar`'s nav needs a React module, because `.astro` cannot pass JSX as a prop**

- **Found during:** Task 1
- **Issue:** `AppBar` takes `logo`, `nav` and `actions` as `ReactNode` props. Astro markup in
  a prop position compiles to a `RenderTemplateResult`, which React cannot render, and the
  build dies with "Objects are not valid as a React child" — only the default slot is
  converted. `probe/static.astro` works around this by passing a plain **string** to `nav`,
  which is fine for a fixture and not fine here: the active route needs its own element with
  an underline and the theme toggle needs to be a circle rather than a word.
- **Fix:** `src/components/PublicNav.tsx`, a React module composing `AppBar`, rendered from
  `Public.astro` with no hydration directive. Being a `.tsx` file costs nothing; being a
  hydrated one would cost ~177 KB gzip. `check-no-js.sh` confirms it emits no script tag.
- **Files modified:** `.playground/src/components/PublicNav.tsx`
- **Commit:** none (gitignored)

**2. [Rule 2 - Missing critical functionality] the five-project count is asserted at build time**

- **Found during:** Task 2, checking the acceptance criteria
- **Issue:** the criterion asks that all five project titles appear in `work.astro` and
  `home-act2.astro`. Titles are read from `resume.json` rather than retyped — which is
  correct, and which means the literal strings are not in the source. Worse, it means the
  pages are **silent about what they expect**: `resume.json` dropping back to four would
  render a four-project grid that looks entirely intentional. That is exactly the regression
  D-38 exists to prevent, and it has already been made once — PROJECT.md and ROADMAP.md both
  said "four own projects" until the count was corrected.
- **Fix:** both pages name the five expected titles in an id→title map and throw on a missing
  or renamed project. This satisfies the criterion *and* makes the titles load-bearing rather
  than decorative, which a source grep never would.
- **Files modified:** `.playground/src/pages/work.astro`, `.playground/src/pages/home-act2.astro`
- **Commit:** none (gitignored)

**3. [Rule 1 - Bug] the first draft of that guard threw before its own message could print**

- **Found during:** Task 2, running the negative control
- **Issue:** written as *map with a non-null assertion, then verify*, the assertion throws
  first and the build dies on `TypeError: Cannot read properties of undefined (reading
  'title')` — naming neither the project nor the decision. The guard technically failed the
  build, so it "worked", while producing a message that would send the next reader into the
  Astro internals.
- **Fix:** the check runs **as** the lookup happens, not after it. A guard whose message does
  not survive its own failure is not a guard. Re-ran the control: it now prints the project,
  the id, the decision and the current contents of `resume.json`.
- **Files modified:** both pages above
- **Commit:** none (gitignored)

**4. [Rule 1 - Bug] my own prose tripped two acceptance greps, in five places**

- **Found during:** Tasks 1 and 3
- **Issue:** the recurring defect plans 01, 04 and 07 each hit once. Three instances: a
  comment in `PublicNav.tsx` naming the hydration directive it was warning against; a comment
  in `work-recolour.astro` quoting the two bracketed placeholder markers it was explaining had
  been deleted; and five comments across three files spelling ivory hexes while describing
  what they became. Greps cannot tell a rule from prose describing one.
- **Fix:** rewritten to name the **role** rather than the literal — "the ivory muted grey",
  "the two bracketed grey markers", "hydration directive". Each affected file now carries an
  explicit paragraph stating which grep depends on it, so the next author does not rediscover
  this by breaking it. `check-no-ivory.sh`'s own header says the same, and admits that the
  first draft of the sketches it guards violated it in five places.
- **Files modified:** `PublicNav.tsx`, `work-recolour.astro`, `photos.astro`
- **Commit:** none (gitignored)

### Corrections to the Plan's Own Content

**5. UI-SPEC's ivory guard command can never go green, and the reason is not a leak**

UI-SPEC specifies the guard as `grep -rE '#F4F1EB|…|#26231E' .playground/src` returning
nothing. Run literally it fails — on plan 04's theme file. **Two of the seven ivory values are
also legitimate charcoal LIGHT-mode token values**, both listed in UI-SPEC's own light-mode
table: the ivory muted grey `#8D8779` is charcoal's `--ink-5` (decorative only, never text),
and the ivory placeholder grey `#C4BDAD` is charcoal's `--rule-strong`. The ivory iteration and
charcoal light are both cream-family palettes, so a collision at two stops is unsurprising once
stated — but a guard that can never go green gets deleted rather than fixed.

Resolved by excluding `theme-charcoal.css` **by exact filename**, on the same terms
`check-no-js.sh` excludes its hydrating fixtures — one named file, never a glob, with the
reason written down. A glob over `styles/` would stop checking `manifest.css` and
`fonts-charcoal.css`, which are exactly where a stray ivory value would hide. The exclusion is
then **closed by a positive assertion** rather than trusted: those two values must appear in
that file only as those two declarations, once each. The third negative control proves the
exclusion cannot be used to smuggle ivory in.

**6. The `href=` acceptance count cannot be met by a mapped anchor list**

The criterion is `grep -c 'href=' photos.astro` ≥ 7, "one anchor per category". `grep -c`
counts *lines*, and a `.map()` over the categories puts every anchor on one line. Rather than
loosen the check or fake it, the eight filter anchors are **written out one per line** — which
is the better artefact anyway: PUB-04 prerenders one route per category, so the route set is
something a reviewer should be able to read straight off the page. The hand-written list is
then kept honest by a build-time assertion that it matches the category set present in the
data exactly, in both directions.

### Supply Chain

**No package was installed.** This plan composes components already present from plan 01 and
adds no dependency, no script and no fixture package. `package.json` and `package-lock.json`
are untouched. T-00-SC is not applicable and holds trivially.

## Observations Not Recorded as Findings

Following plans 01, 04 and 07: this phase measures against a fixed sixteen-row register, so
real gaps found outside those rows are flagged here and in `00-PUBLIC-DESIGN-NOTES.md` rather
than added as untriaged rows that would sit outside Phase 1's tier-pull contract. **Six of the
eight below are new, and the first is the most consequential thing this plan found.**

**1. The charcoal accent does not reach a single declarative accent in the design system.**
`base.css` resolves `data-tone="accent"` to `var(--amber-d)`. Charcoal declares `--ochre`,
`--ochre-d` and `--ochre-d-strong` as **new names** and never redeclares `--amber*`. So
`tone="accent"` on `Heading`/`Text`/`Eyebrow`, `Card variant="amber"`, `Divider accent="amber"`,
`Link`'s amber hover underline and `Timeline`'s dot all render the design system's **yellow**
`#fbbf24` on a charcoal page — roughly 11:1 against `#161616`, so no contrast check catches it,
and completely the wrong identity. UI-SPEC's ownership allowlist already anticipates this: it
says charcoal's `--ochre*` *replaces* `--amber*`. Plan 04 implemented the new names without the
replacement and nothing was asserting the difference, because plan 04's probe pages set colours
directly rather than through a component's tone axis. Every accent in these sketches is applied
via the legacy `color` prop for this reason. **Phase 1 must either alias `--amber*` onto the
ochre ramp inside the charcoal blocks, or repoint the components' semantic accent at a role
token.**

**2. Surface primitives cannot express a boundary on charcoal dark.** `Card` binds
`border-color` to `--rule` in both the `glass` and `subtle` surfaces and exposes no prop that
reaches it; `Chip`'s `default` tone fills with `--cream-3`. On dark, `--rule` is 1.43:1 against
the page and a `--cream-3` chip on a `--cream-2` card is ~1.05:1 — neither draws anything. This
is resolution 3 generalised beyond Work's cards, and the sketches carry one-line `!important`
overrides to `--wire`. Upstream fix: a boundary axis, or binding the dark-mode surface border
to `--wire`.

**3. `Badge`'s three neutral tones collapse on a raised card**, which is precisely what D-45
needs three of. `neutral` and `pending` both fill with `--cream-2` and `count` with `--cream-3`;
on charcoal dark those three surfaces sit within ~1.1:1. `X-work` renders the vocabulary twice,
once on the page and once on a card, so the collapse is visible rather than argued. Related:
`Badge` is **entirely inline-styled with no CSS class at all**, so it needs no manifest line —
but it is also unreachable by any cascade, the same shape as `Button`'s inline padding in G-2.

**4. `--surf-1/2/3` join the list of unmapped surface tokens.** `AppBar` fills from
`--surf-2`, which charcoal does not declare, so the public nav's background is the design
system's neutral translucent white rather than a charcoal surface. That extends plan 04's
observation 2 from five tokens to eight; the allowlist explicitly permits `--surf-*`.

**5. `Footer` has no ReactNode slot on either side.** Compact takes a **string** left and a
**link array** right, so the handoff's socials-left / italic-cross-link-right row cannot be
composed from it. The cross-link is promoted to its own right-aligned row, which arguably reads
better at 22px — but it is a layout change forced by a component API rather than chosen.

**6. `Heading`'s token size path binds line-height to the size.** `data-size="3xl"` and `"4xl"`
both carry `--lh-tight` 0.94, while UI-SPEC assigns `--lh-snug` 1.08 to page headers at 40-44px
and reserves 0.94 for the 60px Home name. Every 44px header in these sketches overrides it
inline. Size and line-height cannot be chosen independently through the declarative path.

**7. `Chip`'s dark-mode CSS rule is dead.** `.dark .ds-atom-chip` sets background, border-color
and colour — all three of which the component also writes **inline** via its tone style, so the
rule never applies. Harmless for charcoal (the inline values are token references that resolve
correctly), but it means the sheet contains a rule that has never done anything.

**8. `StatCard`'s generic `class="glass"`** (carried from plans 01, 04 and 07). Not touched by
this plan. Re-flagging only so it does not get lost between summaries.

## Known Stubs

None that block DSGN-03. Two deliberate scope boundaries, both labelled in the artefact itself:

- **Contact sheet Parts 2 and 3** are labelled placeholders naming plan 16 as the plan that
  fills them, and stating why they cannot be filled yet (no admin route has declared a `STATES`
  array). Part 1's admin section says the same and names plan 12 for the glob-driven rewrite.
  This is the delivery order the plan specifies, not an omission.
- **`X-home-act2`'s Act 1** is outlined with dashed placeholders and an explicit
  "OUT OF SCOPE, PUB-01 / PHASE 5" label. DSGN-03 covers Work and Photos; the sketch exists to
  resolve the five-into-four problem and nothing else, and restyling Act 1 would have annexed
  Home into a phase that does not own it.

## Threat Flags

None. No network endpoint, auth path, binding or trust-boundary schema was introduced. Every
public sketch is a static page with no user input, no session and no credential.

Two register entries are worth confirming positively rather than by silence. **T-00-21
holds:** the fixtures copied into `.playground/src/data/` are `data/*.json`, already-committed
public site content, and the photo URLs are the already-public `pub-*.r2.dev` origin; the
playground is gitignored, so even the copies never enter history. **T-00-22 holds and is the
substance of this plan:** three measured accessibility failures in the handoff are corrected by
name rather than carried — the hued icon's white ink at 3.97:1, ochre-as-small-text at 3.52:1
on ivory, and a ~1.4:1 border used as an interactive control's sole boundary against WCAG
1.4.11's 3:1 floor. **T-00-23 holds:** zero hydration directives across all seven public files,
asserted per file and gated by `check-no-js.sh` on 12 routes.

## Self-Check: PASSED

**Files verified present:**

- `.planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md` — FOUND (388 lines)
- `.planning/phases/00-design-ideation/00-09-SUMMARY.md` — FOUND
- All 12 playground artefacts listed in `key-files` — FOUND (gitignored, on disk only)

**Commit verified:** `f933e89` present in `git log`.

**Plan `<verification>` block, all four:**

- `npx astro build` exits 0 (15 pages); `check-no-js.sh` and `check-no-ivory.sh` both exit 0 — PASS
- Four public sketch routes emit HTML: `work-recolour`, `work`, `photos`, `home-act2` — PASS
- Zero `client:` directives across every public sketch and the public layout — PASS (7 files, 0 each)
- `00-PUBLIC-DESIGN-NOTES.md` records all nine resolutions and the OQ-1 decision — PASS
  (four exact H2 headings; nine `### N —` resolutions; `## OQ-1` states the decision taken and
  names Phase 5 as owner of the rest of Home)

**Task acceptance criteria:** 8/8 task 1, 10/10 task 2, 10/10 task 3.

**Playground left intact for downstream plans (10, 12-17):** `astro build` 15 pages exit 0;
`check-no-js.sh` PASS on 12 static routes; `check-no-ivory.sh`, `check-theme-exhaustive.mjs`,
`check-font-names.mjs`, `check-contrast.mjs` and `check-css-size.mjs` all exit 0;
`check-bundle.mjs` exits 1, which remains the recorded G-15 finding. D-02 fence holds — no
adapter, no wrangler, no vitest, no `src/pages/api`, no root `package.json`, and no package
was installed.

**Not touched, as instructed:** `STATE.md`, `ROADMAP.md`, `00-THEME-API.md`, `00-COPY/`,
`00-FINDINGS.md`, `.planning/config.json`, `../design-system/`.
