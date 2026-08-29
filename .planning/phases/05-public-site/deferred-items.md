# Phase 5 — deferred items

Out-of-scope discoveries, logged rather than fixed. Each names the plan that found it and the
plan that owns it.

---

## 1. `test/content/resume-structure.unit.test.ts` — 15 failing cases on `main`

- **Found by:** 05-04, during its full-suite verification run (2026-08-28).
- **Owner:** **05-02.**
- **Cause:** commit `d986836 feat(05-02): give projects a status and a one-liner, and land the
  copy Phase 0 reviewed` changed the key set of `data/projects.json`.
  `test/content/resume-structure.unit.test.ts` asserts that each project record *"carries the
  eight keys in the order they were authored in"* and *"is byte-identical to its previous home,
  key order included, except the OD-6 field"*. Five records × three assertions = 15 failures.
- **Measured:** `npx vitest run` → **1126 passed, 15 failed**, all 15 in that one file. Every
  other file in the suite is green.
- **Why 05-04 did not fix it:** no file in 05-04 is on any path reaching that suite. It reads
  `data/projects.json` and `data/resume.json`; 05-04 created `src/lib/exif-display.ts`,
  `test/public/exif-display.unit.test.ts` and `scripts/assert-exif-display-coverage.mjs` and
  modified nothing else. Editing another plan's content assertions mid-wave is exactly the
  cross-plan interference the shared-index rule exists to prevent.
- **What has to be decided, not just fixed:** the failing assertions are a *deliberate*
  losslessness proof from 03-05's migration — "byte-identical to its previous home". Adding a
  field is a legitimate change, so the assertion needs to be re-pointed at the new key set with
  the new field named as the exception, in the same shape the existing `except the OD-6 field`
  clause uses. Deleting the assertions would delete the proof.
- **Status: RED on `main` right now.** It must be resolved before the phase closes.

---

## `npm run check` has three pre-existing findings, none of them 05-05's

- **Found by:** 05-05, during Task 1's verification run (2026-08-28).
- **Owner:** unassigned — they predate this plan and belong to whoever owns those files.
- **Measured:** every one of these files is byte-identical to `HEAD` in 05-05's working tree
  (`git diff --quiet HEAD -- <file>` exits 0 for all three), so the findings exist on `main`
  independently of anything this plan did.

  ```
  scripts/lib/r2.mjs:469:9                      lint/style/useTemplate            FIXABLE
  scripts/assert-ds-import-contract.mjs:566:5   lint/correctness/noUnusedVariables FIXABLE
  test/pipeline/workflow-contract.unit.test.ts  lint/suspicious/noTemplateCurlyInString ×5
                                                (lines 672, 673, 674, 684, 685)
  ```

- **Why 05-05 did not fix them:** `npm run check` is not in `npm run build`, so none of these
  blocks the phase today — but 05-01's SUMMARY records `npm run check` at **exit 0**, which means
  all three arrived between 05-01 and wave 2. The five `noTemplateCurlyInString` findings are
  almost certainly intentional (a workflow-contract test asserting on literal `${{ }}` GitHub
  Actions expressions) and want a scoped biome ignore with a reason, not an autofix. The two
  FIXABLE ones are one `biome check --write` away.
- **Why not just run the autofix:** four plans shared this index during wave 2. `biome check
  --write` on files another plan is mid-edit is the 04-06 index-sweep failure with a different
  tool. 05-05 formatted only its own five files, by explicit path.

## Phase 4 fixture · the working-tree overlay makes `npm test` unreliable during any concurrent plan

**Found:** 2026-08-28, while 05-03 was mid-flight.

`test/pipeline/partial-failure.node.test.ts` overlays the **uncommitted working tree** onto its
sandbox — by design, so a plan's in-progress code is what gets exercised. Measured mid-run:

```
[partial-failure] sandbox overlay: data/resume.json, src/schemas/resume.ts, scripts/migrate-experience-metric.mjs
```

05-03 had `src/schemas/resume.ts` requiring `metric` while `data/resume.json`'s migration was still
running, so the sandbox's content gate refused and **3 of 10 cases went red on a tree that is
otherwise green**. Cases 1, 6b and 7; `npm run build` stayed at exit 0 throughout.

**Not a defect in the fixture** — overlaying the working tree is the right behaviour, and it is what
lets a plan test its own uncommitted code. But it means **`npm test` is not a reliable signal while
any plan is mid-edit**, and a wave-mate reading it can conclude the tree is broken when it is not.

This is the same shape as B4b, which serialised 05-02 and 05-03 because both add a required schema
field and the content gate validates all five data files on every build. The overlay extends that
interference to any plan running the full suite.

**For the orchestrator:** verify a wave only after its plans have committed, or scope the check to
the plan's own files. **For a plan:** if `partial-failure` goes red and the overlay line names files
you do not own, it is a wave-mate mid-edit, not your regression — say so rather than chasing it.

---

## 05-07's findings — five items, each with the plan that should own it

**Found by:** 05-07 (the gallery and the filter routes), 2026-08-29.

### 1. ~~🔴~~ ✅ **RESOLVED 2026-08-29** — R-6 at 344px on every public route (the AppBar's theme toggle overhung by 14px)

> **Fixed upstream in `@akhil-saxena/design-system@2.0.0-beta.2`, consumed at commit `2015b4d`.**
> Re-measured on the built artefact at all six device classes and both pointers:
> `document.documentElement.scrollWidth === window.innerWidth` on **all six routes at 344**, so the
> overflow is **0**. `test/audit/six-class.spec.ts` now asserts `toBe(0)` with the class-1 special
> case deleted, and `05-AUDIT.md` §1 carries the before/after.
>
> **The owner line below was wrong, and that is worth keeping.** This item named the shell —
> `public-shell.css` / `PublicNav.tsx` — as owner and the AppBar row's padding as the fix. Neither
> was reachable: `AppBar` rendered its two layout gaps as **inline styles on unnamed internal
> `<div>`s**, which no consumer stylesheet can beat without `!important`. The real fix was
> `.ds-atom-appbar-lead` / `.ds-atom-appbar-nav` getting real classes plus a
> `@media (max-width: 380px)` rule, and it could only be made in the library. Filed as **D-21**;
> the full record is in `05-DS-FINDINGS.md`.
>
> **Nothing below is deleted.** The measurement is what made the finding filable, and an item that
> erases its evidence when it closes cannot be audited. Everything from here down was true of
> `2.0.0-beta.1`.

#### The original entry, as filed


- **Owner:** the shell (05-06's `public-shell.css` / `PublicNav.tsx`), confirmed by **05-15**'s
  six-class audit.
- **Measured** in real Chromium (Playwright, `hasTouch: true`, `isMobile: true`) against the built
  site, `document.documentElement.scrollWidth` vs `clientWidth`:

  ```
  /                @344 → 358 vs 344   (9 overflowing elements)
  /photos/         @344 → 358 vs 344   (12, of which 9 are the same chain)
  /photos/street/  @344 → 358 vs 344
  /resume/         @344 → 358 vs 344   (9 — the identical chain)
  every route      @390 → 390 vs 390   clean
  ```

  The overflowing chain is identical on all four routes and bottoms out at
  `<button class="ds-atom-iconbtn">` — the theme toggle — with `left 326.2 right 358.2` inside a
  344px viewport. It is **not** the gallery: `/` and `/resume` are not 05-07's and show the same
  geometry with the same numbers.
- **Why 05-07 did not fix it:** the fix is in the AppBar row's padding or in the bar's own content
  budget, both of which live in another plan's file, in a wave where three plans share the index.
  05-06's summary records the bar measured clean at 344 against its probe route; something between
  that probe and the real routes changed the bar's content width, and finding out which is the
  shell owner's job, not the gallery's.
- **Note for whoever takes it:** `@390` is clean, so this is class 1 only — but class 1 is a folded
  cover screen and R-6 is the requirement 05-15 audits.

### 2. `scripts/assert-single-schema-source.mjs` — two false positives, both measured

- **Owner:** whoever owns that gate (03-06 / 05-01 lineage).
- **(a) It refuses an anti-vacuity guard on a rendering concern.**
  `if (categories.length === 0) { throw }` in `getStaticPaths` was refused as
  `[HAND-ROLLED-VALIDATOR]`, because `categories` is one of its twelve `CONTENT_FIELDS` and a throw
  follows within three lines. `SiteConfigSchema` already refuses an empty category list, so the
  guard is not a rival validator — it guards the thing Astro silently accepts, which no schema can
  see. Worked around by guarding the derived `paths` array instead, which is the more precise claim
  in any case.
- **(b) It matches inside comments.** The paragraph written to EXPLAIN (a) was then refused for
  quoting the offending condition. This is the project's recurring comment-match class — the same
  one that bit `Seo.astro` against `gate:sinks` in 05-06 — and the fix is the same one
  `assert-no-raw-html-sinks.mjs` already needs: strip comments before matching, with the stripper
  carrying its own canaries (05-05 wrote one).

### 3. `scripts/assert-gutter-ladder.mjs` is blind to an INLINED stylesheet

- **Owner:** 05-06 (the gate) / 05-14 (the wiring it now sits in).
- **Measured:** Astro's `build.inlineStylesheets` defaults to `'auto'`, which inlines a stylesheet
  under ~4 kB into a `<style>` element rather than emitting a file. `src/styles/photos.css` ships
  **inline**, and `dist/client/` holds exactly ONE `.css` file. The gate walks `dist/client` for
  `*.css` and would not see a ladder that landed inline.
- **Not urgent, and it fails closed:** `public-shell.css` is bundled with the design system's 126 kB
  sheet, so the `--pub-gutter` rungs are in a file today. If that ever changes the gate hits its
  "not one `--pub-gutter` declaration" refusal and exits 1 — the right direction, but the message
  would name the wrong cause. `test/public/photos-routes.node.test.ts` reads both sources and its
  header records why.

### 4. §13.2's empty-category state cannot be reached by a Phase 7 category addition

- **Owner:** whoever revises `05-UI-SPEC.md` §13.2, and Phase 7.
- §13.2 says the state "is unreachable today" but "a Phase 7 category addition creates it in one
  click". **It does not.** `src/schemas/content-set.ts` **RI-2** refuses a declared category that no
  photograph uses, in `astro:config:done` — so it fires on `astro build`, `astro check` AND
  `astro sync`. A new category **fails the build** until its first photograph is filed.
- Consequence for anyone writing a control: **the plan's own Task 2 control cannot run as written
  either.** Deleting a category record from a copy of `site_config.json` leaves its photographs
  orphaned and **RI-1** refuses before a page is rendered; the manifest copy has to lose those
  records in the same edit (and `gate:origin` then refuses the manifest for being shorter than 39,
  which is that gate working correctly). 05-07 ran it that way and it is written up in its summary.

### 5. Astro drops the whitespace between two adjacent expressions in a component's children

- **Owner:** informational, for **05-08 … 05-12** — anyone rendering text into a design-system
  component from `.astro`.
- **Measured:** `<Eyebrow>{count} {noun}</Eyebrow>` ships as `14photographs`. A literal text node
  after a single expression is unaffected — `{total} photographs — all of them` is correct — so it
  is specifically the space BETWEEN two expressions that does not survive the slot crossing.
- It renders as a page that looks almost right, on every affected route, with a green build. Compose
  the string in frontmatter. 05-07 does, and asserts the exact string over HTTP.

### 6. `<script type="module">` is the wrong predicate for "does this route hydrate" under Astro 7

- **Owner:** **05-14**, and whoever revises `05-UI-SPEC.md` §5.2 and §5.3.
- **Measured** on the build that landed the island (05-12): a hydrated `/photos` document carries
  **zero** `<script type="module">`. Astro 7 emits `<astro-island component-url="…" component-export="…"
  renderer-url="…">` plus **three** classic `<script>` blocks — the shell's theme block and two
  bootstrap blocks, the second of which reaches the chunk through a dynamic `import()`.
- So §5.3's assertion 1 ("zero `<script type="module" src=`" on a static route) is **vacuously true
  everywhere**, and its assertion 3 ("exactly one island entry" on a gallery route, spelled the same
  way) is **red against a correct build**. 05-12's own plan carried both spellings in its `<verify>`
  blocks and both were replaced; `test/public/lightbox.node.test.ts` and the rewritten block in
  `test/public/photos-routes.node.test.ts` assert on `<astro-island>` instead.
- **§5.2 needs the same repair.** Its rule is "a public route may carry at most one
  `<script is:inline>` … and it is the theme script". A gallery route now carries three `<script>`
  blocks; two are Astro's own hydration runtime, not authored ones. The rule has to distinguish
  authored `is:inline` blocks from the island bootstrap or it refuses the one route it permits to
  hydrate. Measured bytes: theme block 1,452 B, bootstrap blocks 316 B and 4,380 B.
- 05-08 flagged the hole this closes: *"Not closed by anything today: a dynamic `import()` inside a
  classic script."*

### 7. `astro check`'s Result line reports "0 warnings" while printing six

- **Owner:** informational, for anyone reading a build log in this repository.
- **Measured** by 05-12: `npm run build` prints six `warning ts(…)` diagnostics and then
  `Result (132 files): 0 errors / 0 warnings / 7 hints`. The printed diagnostics are real; the count
  is not. 05-07 and 05-08 both recorded "0 warnings" from that line while the same six were on
  screen.
- One of the six is **pre-existing and worth someone's attention**:
  `src/components/public/PhotoGrid.astro:57 - warning ts(6196): 'Props' is declared but never used`,
  on a component whose props are destructured three lines below the interface. 05-12 verified it is
  **not** its own by restoring the file from `HEAD` and re-running `astro check` — the warning is
  present on 05-07's committed version too. Left alone; it is out of 05-12's scope.

### 8. The pipeline sandboxes red on ANY uncommitted `data/` edit, and it is not the editor's bug

- **Owner:** whoever owns `test/pipeline/partial-failure.node.test.ts` (and its two siblings that
  build the same sandbox). **Not fixed here** — it is outside the four decisions this pass applied.
- **Measured**, twice, on 2026-08-29 while rewording one bullet in `data/resume.json`:

  ```
  uncommitted data/resume.json   npm test  ->  1 failed | 1492 passed (1493)
    FAIL  partial-failure.node.test.ts > case 1: a throw in step 2 changes nothing anywhere
    AssertionError: expected 'M data/resume.json' to be ''
  the same edit, committed    npm test  ->  1493 passed (1493)
  ```

- **The mechanism is a collision between two deliberate designs, and both are right on their own.**
  `overlayWorkingTree` copies every file `git status` reports as modified into the sandbox — by
  design, and with three separate refusals guarding against it silently copying nothing, because a
  sandbox that quietly tests `HEAD` instead of the working tree is how a planted defect goes green.
  Case 1 then asserts `git status --porcelain -- data` is EMPTY inside that sandbox, as the way to
  say "a throw in step 2 changed nothing". The overlay has already made `data/` dirty before the
  pipeline runs, so the assertion is reading the *author's* uncommitted edit and reporting it as the
  pipeline's write.
- **It is a false RED, never a false green**, which is the safe direction — but it is the second
  fixture behaviour in this suite (after the `node_modules/.vite` race, §18 of `05-AUDIT.md`) whose
  failure has nothing to do with the code under test, and both teach a re-run.
- **The fix, for whoever owns it:** record `git status --porcelain -- data` immediately after the
  overlay and compare the pipeline's effect against THAT baseline, rather than against the empty
  string. One line, and it makes the assertion say what it means — "the pipeline changed nothing",
  not "nothing in `data/` was ever uncommitted". The overlay itself must not be narrowed: copying
  working-tree modifications in is the property the sandbox exists for.
