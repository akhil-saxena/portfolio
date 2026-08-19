---
status: open
phase: 00-design-ideation
purpose: Everything in Phase 0 that a machine cannot settle. Tick as you go; add rows freely.
owner: akhil
---

# Phase 0 — Human Verification Checklist

**How to use.** `cd .playground && npx astro dev`, then open the contact sheet at `/`.
Tick `[x]` as you verify. Anything you disagree with, write the verdict inline — a plan will
pick it up. Add items under **Your additions** and they get treated the same as the rest.

**What is already machine-verified — do not spend eyes here:** 44px touch floor on every
coarse class (browser-audited, de-duplication disabled), zero framework JS on 67 static routes,
no ivory token survives, 54 contrast ratios to 2dp, cascade order-independence (136 assertions
× 4 import orders × 2 modes), coverage matrix completeness (the build *fails* on a blank or
unhosted cell), and all five case studies inside the 500–700 band.

---

> **Doing a gate for the first time?** [`../../OPEN-GATES.md`](../../OPEN-GATES.md) is the
> step-by-step walkthrough for the three gates currently waiting on you — `access-off` (02-10),
> the three by-eye judgements (00-11) and the six review passes (00-17). It explains *why* each
> exists and what happens when you reply. **That doc is the procedure; this one is the record.**

## Where to look — the exact map

**Start the sketches:**
```bash
cd .playground && npx astro dev     # → http://localhost:4321/
```

**`/` is the contact sheet — your index.** Every artefact ID in this checklist (`S-` `E-` `T-`
`O-` `P-` `R-` `X-`) is linked from it, each with a one-liner saying what it *proves* (not
shows). If an item names an ID, find it there rather than guessing a URL. The coverage table
on the same page is item B1.

**Viewports.** Use the browser devtools device toolbar and set these exact sizes:

| Class | Set devtools to | Used for |
|---|---|---|
| Folded foldable | **344** × 748 | narrowest checks (C3, anything "at 344") |
| Phone | **390** × 844 | P- and R- artefacts |
| Foldable unfolded | **841 × 768** | the near-square case (canonical, NOT 673) |
| Tablet portrait | **768** × 1024 | |
| Tablet landscape | **1024** × 768 | density flip vs laptop at same width |
| Laptop | **1440** × 900 | A1–A3, all S-/E-/T-/O- artefacts |

**Modes.** Admin (`/admin/**`) is charcoal **light** — never judge it in dark. Public routes
(`/`, `/work*`, `/photos`, `/home`) are charcoal **dark**.

**No dev server? Use the committed record:** `screenshots/` in this directory holds all 88
PNGs, named `00-{class}-{id}-{state}-{mode}-{viewport}.png` — e.g.
`00-S-photos-populated-light-1440.png`. Item C6 is a spot-check of these; C7's pair is
`00-X-home-a-*` vs `00-X-home-b-*`.

**Direct routes for the big items:**

| Item | Exact place |
|---|---|
| A1 | `/work-recolour` at 1440 — the two headers render side by side, labelled |
| A2 | `/work` at 1440, scroll to the foot — the italic serif cross-link |
| A3 | `/work` at 1440 — the employment band, watch title vs metric alignment |
| B2 hardest case | `/admin/site` — the screen the legacy admin never had |
| B3 pair | `/admin/photos/empty/` vs `/admin/photos/filtered-empty/` |
| B4 treatments | `/admin/dirty/`, `/admin/error/`, `/admin/loading/` (dashboard hosts) |
| B5 | `/admin/conflict-diff/` |
| B6 | `/admin/phone/dashboard`, `/phone/text-edit`, `/phone/photo-reorder`, `/phone/publish` at 390 and 344 |
| C1 | `/work/design-system`, `/work/cairn`, `/work/hued`, `/work/momentum`, `/work/timeshift` |
| C3 | `/home` — scroll exactly one viewport; photos must be fully gone. Repeat at 344 and 841×768 |
| C4–C5 | `/admin/photos` — drag a tile, use the focal-point control, read the order-field caption |
| D2–D3 | edit `00-PHOTO-CONTENT.md` (39 `[AKHIL-ALT]` rows) |

**What the rework changed since you last looked:** the re-review brief appended by plan 00-25
at the end of `00-PUBLIC-DESIGN-NOTES.md` walks it in review order.

**Recording verdicts.** Edit THIS file — tick boxes, write verdicts inline, add rows under
*Your additions*. It's committed, so your marks persist in git and downstream plans read them.
Evidence for every §E claim is in the plan SUMMARYs beside this file (file:line where cited).

---

## A. The three judgements 00-11 is blocked on

These were deferred once already because the artefacts changed underneath them. They are now
final, so these verdicts stick.

- [ ] **A1 · 44px vs 52px page header.** Open `/work-recolour` at 1440×900 with the two headers
      side by side. Playfair has a larger x-height and heavier stems than the handoff's
      Newsreader at the same pixel size, so this is judgement, not arithmetic. **Which is right?**
      → verdict: _______
- [ ] **A2 · The 22px italic serif cross-link.** Foot of `/work`, rendered in `--ochre-d-strong`
      (`#6B4417` light / `#D4A66D` dark). Too heavy for a 22px italic serif? The stated
      alternative is 24px reverted to `--ochre-d`, which resolves the WCAG large-text ambiguity
      by arithmetic instead of judgement. **Pick one.**
      → verdict: _______
- [ ] **A3 · The 1080px Brevo band cap.** On `/work`, does the employment band read as one row
      per line, or as a serif title and a mono metric floating apart?
      → verdict: _______

## B. The six review passes (admin — complete and won't change)

- [ ] **B1 · Coverage table.** Any `n/a` reason unconvincing? (Blank cells are impossible — the
      build enforces it.)
- [ ] **B2 · Screens populated.** Does each screen's IA match its entity? Look hardest at
      `/admin/site` — the legacy admin had **no editor at all** for it, which is how the D-25
      category drift went unnoticed.
- [ ] **B3 · Empty states.** Compare `E-photos` against `E-category-filtered`. An empty dataset
      vs an empty *filter result*. If those read alike, an operator concludes the filter is broken.
- [ ] **B4 · Treatments.** Are the three error treatments genuinely distinct — inline draft
      warning, publish block, network/401? Is `dirty` legible in all three places D-13 requires?
- [ ] **B5 · Overlays.** `/admin/conflict-diff/` — can you resolve one file without abandoning
      an unrelated edit? Largest admin surface, zero design-system coverage.
- [ ] **B6 · Phone + refusals.** Do `R-crop-picker` and `R-case-study-authoring` read as
      **honest rather than broken**? No test can answer this one.

## C. The rework — new since you last looked

- [ ] **C1 · Case studies at 500–700 words.** `/work/design-system`, `/work/cairn`,
      `/work/hued`, `/work/momentum`, `/work/timeshift`. One route each now, not a stacked
      scroll. Is the length right, or still too long?
- [ ] **C2 · Cairn's decision set.** You asked for multi-tenancy restored; the contrast decision
      was cut to keep three. Does the set still read as one argument?
- [ ] **C3 · Home two-state landing.** `/home`. Photos fills the view with a scroll prompt; one
      viewport of scroll should clear it **completely**. Check at a narrow width too.
- [ ] **C4 · `/admin/photos` live positioning.** Drag a photo in the real masonry. Does it land
      where you expect on the public page? Does the focal-point control do what you wanted?
- [ ] **C5 · Which ordering field a drag writes** is stated on screen (D-22). Is it clear enough
      that you'd trust a reorder had saved?

## D. Decisions only you can make

- [ ] **D1 · Italic axis.** Option A ships no drawn Playfair italic, so the 22px display subtitle
      and the serif cross-links render as browser-synthesised oblique — visible on an editorial
      serif. Adding it costs 4 rules and moves a recorded acceptance baseline from 8 to 12.
      → decision: _______
- [ ] **D2 · One real alt text.** All 39 rows in `00-PHOTO-CONTENT.md` are `[AKHIL-ALT]`; zero
      were invented on purpose. **One sentence from you about one photo** anchors the other 38.
      → e.g. `abstract-intothemist`: _______
- [ ] **D3 · The remaining 38 alt texts.** Content work, not a code task. Alt is the only
- [ ] **D4 · `alt={title}` is still live on the PUBLIC Home page** — `home.astro:154`, the 6 peek
      photos, plus 3 admin island call sites. Recorded as **D-24-1**. Same defect as the one just
      fixed on `/photos`; wants the same treatment in Phase 5.
      description a screen reader ever gets on a zero-JS gallery.

## C6-C8 · From the screenshot capture

- [ ] **C6 · Spot-check the 88 committed PNGs** in `screenshots/` — exact match to the
      contract arithmetic (29+12+18+12+12+3+1+1). All 88 verified unique by sha256; smallest
      13 KB, largest 6.6 MB, none blank. Zero admin artefacts in dark.
- [ ] **C7 · `X-home`'s two states.** 12 files, 6 classes x 2. At 1440 they are 629,727 B and
      93,329 B — genuinely different. State B opens exactly on "The work" heading, confirming
      the 131px chrome arithmetic empirically. Worth one look.
- [ ] **C8 · Approve the playground deletion (00-17 task 3) — NOT YET RUN.** It stays parked
      until you approve. See the blocker note below before you do.

> **Blocker resolved, one text fix left.** 00-17 task 3 asserts "the four measurement scripts
> still exist under `.planning/phases/00-design-ideation/`". They were **never committed** —
> zero git history, playground-only — and the criterion would have *appeared to pass* against
> three unrelated copy scripts. All ten are now rescued and committed under
> `scripts/playground-measurements/`. **00-17's criterion text still names the wrong location
> and should be pointed at the new path before task 3 runs.**

## E. Design-system handover (sibling repo — Phase 1 fixes these)

Not verification; a queue. Tick when handed over or filed.

- [ ] **E1 ·** `--amber*` never redeclared under charcoal → `tone="accent"`, `Card variant="amber"`,
      `Divider accent="amber"`, `Link` hover, `Timeline` dot all render `#fbbf24`. **~11:1 on
      dark, so no contrast test catches it.**
- [ ] **E2 ·** `AppShell.collapsed` is an **output, not an input** — `cloneElement` overwrites any
      consumer value; `--ds-sidebar-w` is inline, so UI-SPEC's 208px target is unreachable.
- [ ] **E3 ·** `Card` inlines `display: block` → a consumer's `display: flex` never applies.
- [ ] **E4 ·** `Chip` **clobbers** a consumer `className` where `Card` **concatenates** —
      inconsistent API; an interactive chip loses its focus ring.
- [ ] **E5 ·** A page cannot recolour a `Text` — it inlines its variant colour; only `tone` works.
- [ ] **E6 ·** No control uses `--wire` (3.44:1) despite it existing for exactly the boundary job;
      a charcoal-light `TextInput` has a **1.000:1 fill delta** against the page.
- [ ] **E7 ·** `DataGrid` pins `density="comfortable"` at (0,3,0); its selection cell has no
      removal prop, so compact's 32px row is unreachable.
- [ ] **E8 ·** `Sortable` has **no accessibility passthrough** — announces raw slugs, never a
      title, never a position. Fix is *expose* an announcer, not pass one.
- [ ] **E9 ·** `Modal` / `ConfirmDialog` / `Sheet` **server-render to 0 B**; `Modal` also renders
      an unremovable Close button, so it cannot express a fail-closed re-auth.
- [ ] **E10 ·** `RichText`: `toolbar={null}` **does not suppress the toolbar**
      (`??` falls through only on null/undefined); ⌘K never bound though `autolink` is hardcoded;
      it downloads a **six-language grammar set (12,718 B gzip)** to edit a prose bullet.
- [x] **E11 ·** `FieldError` has no severity → D-18's two severities render identically.
      **CLOSED by 01-11** — warning tone is `--amber-d` → `--ochre-d` → `#8c591f`, browser-measured
      **5.32:1** on charcoal light (clears AA).
- [ ] **E12 ·** No `FocalPointPicker` (G-1) — now load-bearing for all 39 photos, hand-built cost
      measured at **269 non-comment lines**.
- [x] **E13 ·** `AppBar` exposes no height property; `AppBar`/`Footer` paint their own geometry
      below the 44px floor (D-16-1).
      **CLOSED by 01-12** — `--ds-appbar-h: 47px` on `.ds-atom-appbar` driving `min-height`, and
      two `@media (pointer: coarse)` blocks lifting 16–22.5px targets to 44px. Fine-pointer
      rendering byte-identical, so **the desktop design did not move a pixel**.
- [x] **E14 ·** README claims **80 components**; the catalog says **79**, `src/` has **81** dirs.
      The README matches neither.
      **CLOSED by 01-12** — all three reconciled on **79**, with `Field` and `IconButton` named in
      an `EXCLUDED_FROM_CATALOG` list with written reasons, asserted in CI. Adding a component
      without cataloguing it now fails by name.
- [x] **E15 ·** `FieldProps` has no `required` flag — requiredness lives in the label string, so
      every screen invents its own marker.
      **CLOSED by 01-11** — asterisk from a real empty `aria-hidden` span, *not* a label `::after`:
      CSS-generated content cannot be aria-hidden and Chrome does include it in the accessible
      name, so the obvious implementation would have double-announced "required".

- [ ] **E16 ·** `.ds-atom-field-error` is **declared twice in `primitives.css` and the first block is
      dead** (browser-proven by 01-11). Left alone deliberately: `--red` clears AA at 4.67:1, and
      changing it would move 15 control baselines immediately before the 01-20 capture. Worth a
      look when you review the DS, not a bug on the site.
- [ ] **E17 ·** A **warning-tone `Field` still sets `aria-invalid="true"`** — `useField` never sees
      the tone, so a warning announces as an error. Not closed by 01-11; needs the tone threaded
      into the hook.

- [ ] **E18 ·** The AppBar is **not** a constant height — it measures 47 / 51 / 53 / 61px across the
      viewport classes and **wraps to 63px at 344px wide**. Phase 0 recorded it as constant at all
      six classes; that was wrong. `--ds-appbar-h` is therefore a documented *floor*
      (`min-height`), not an exact height. Making it exact needs a definite row height, which is
      Phase 06.1's density axis.
- [ ] **E19 ·** Footer links had **already silently regressed to 16px** — worse than the 22.5px
      Phase 0 measured — because a commit on `main` (2026-08-15) added `.ds-atom-link { padding: 0 }`
      lower in the file than `.ds-atom-footer-link`'s own `padding: 5px 0`, so the footer rule has
      been **dead on `main` for the `<a>` form**. Fixed in 01-12. Worth knowing that the DS can
      regress geometry with every test green.

## F. Known-open, already recorded — do NOT re-report

- **D-15-1** dashboard `.adm-group-link` 23px at every coarse class *(closed by 00-24 — confirm)*
- **D-16-1** `AppBar`/`Footer` under 44px on every public route; brand link is **20px at 344**,
  not the 40px originally recorded
- `/photos/` fails the 44px floor at five coarse classes (wordmark 20px, `.ph-xlink` 30px,
  footer links 22.5px) — design-system-owned
- Cairn residue: `ghost_flagged` survives in `timeline_events.kind`; `lint-scoped.sh` still
  exempts the deleted `src/server/scheduled.ts` — **a standing hole in the multi-tenancy guard
  your restored decision now claims in public copy**
- Four case-study images still need capturing from live store listings (TimeShift hero + inline,
  Momentum inline); only hued is covered from its committed `publishing/` dir

## G. Environment traps found here (carry into later phases)

- `npx tsc --noEmit` in the playground runs **`tsc@2.0.4`, a squatted deprecated package** —
  TypeScript is not a dependency. Use `astro build` as the compile gate.
- macOS **BSD sed**: `sed -i '' '0,/re/s//X/'` is a **silent no-op that exits 0**.
- `grep -c` counts **lines**, not matches; a wrapped phrase is invisible to a line-anchored grep.
- **A grep cannot prove a style applied.** Three defects shipped a rule matching nothing while
  the source read correctly — probe `getComputedStyle`.
- Astro scopes a page's CSS with **that page's** cid; rules aimed at another component's DOM
  match nothing.
- Worktrees spawn from `origin/main`, so an unpushed branch gives every agent a stale base.

## Your additions

- [ ]
- [ ]
- [ ]
