---
phase: 01-design-system-charcoal-theme
plan: 11
subsystem: design-system
tags: [e15, e11, g-6, f-15-8, field, formvalidation, inlineedit, required, severity, specificity, source-order, xss]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: probeComputed — the brand x mode computed-style helper all three browser cases run on
  - phase: 01-design-system-charcoal-theme
    plan: 03
    provides: the contrast register whose bar the warning token had to clear rather than bypass
  - phase: 01-design-system-charcoal-theme
    plan: 09
    provides: the "state the specificity, decide whether a consumer may override" discipline both new CSS rules follow
  - phase: 01-design-system-charcoal-theme
    plan: 10
    provides: the lesson that a specified fix can regress while every specified grep stays green — which is what produced this plan's N1
provides:
  - "$DS/src/inputs/Field/index.tsx — `required` and `errorTone` on FieldProps; the error slot now DELEGATES to FieldError instead of hand-rolling a second span"
  - "$DS/src/patterns/FormValidation/index.tsx — FieldError `tone`/`id`/ReactNode message; FormErrorSummary accepts Array<string | {message, href?}> with a T-11-01 href allow-shape; the link composes Link"
  - "$DS/src/interaction/InlineEdit/index.tsx — optional `ariaLabel`, defaulting to the previous 'Click to edit'"
  - "$DS/tests/visual/field-contract.spec.ts — three Chromium computed-style cases (charcoal x light) for the three cascade claims jsdom cannot check"
  - "$DS/src/primitives.css — .ds-atom-field-required::after, .ds-atom-field-error[data-tone=warning] at (0,2,0), .ds-atom-field-error-icon::before, .ds-atom-form-error-summary a.ds-atom-link at (0,2,1)"
  - "$DS/src/index.ts — FormErrorSummaryEntry exported"
affects: [01-12, 01-16 E9 dialogs, 01-18, 01-20 charcoal baselines, Phase 06.1 density, Phase 4 admin field catalog]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A marker whose glyph lives in CSS `content` and whose element carries aria-hidden: generated content CANNOT be aria-hidden, so a bare `::after` on the label WOULD enter the accessible name. A real empty aria-hidden element with the glyph in CSS gets both restyleability and single announcement"
    - "`.ds-atom-field-error` is declared TWICE in primitives.css (Field section line 174, FormValidation section line 5355). Equal specificity, so source order gives the LATER copy every property — the Field-section block, including its measured --red-ink justification, is DEAD. Browser-measured: the rendered colour is var(--red) #b8463f"
    - "A tone/variant rule on a class that has duplicate base declarations must outrank by SPECIFICITY, not position: (0,2,0) beats both from any position, which N3/N4 proved as a pair"
    - "Link's `inline` variant (the DEFAULT) sets `color` as an INLINE style, so no stylesheet rule can retint it without !important. Only `default` and `quiet` are stylesheet-only and therefore composable"
    - "A `Link` inside another component needs (0,2,1) to beat Link's own (0,2,0) `[data-variant]` rule, which sits ~1070 lines lower in primitives.css and would otherwise win on both axes"
    - "React does NOT filter `javascript:` in href. An allow-shape on the FIRST character (/, #, .) plus an explicit `//` exclusion blocks protocol-relative and whitespace-smuggled payloads; anything rejected renders as plain text"

key-files:
  created:
    - ../design-system/tests/visual/field-contract.spec.ts
  modified:
    - ../design-system/src/inputs/Field/index.tsx
    - ../design-system/src/patterns/FormValidation/index.tsx
    - ../design-system/src/patterns/FormValidation/FormValidation.test.tsx
    - ../design-system/src/patterns/FormValidation/FormValidation.stories.tsx
    - ../design-system/src/interaction/InlineEdit/index.tsx
    - ../design-system/src/interaction/InlineEdit/InlineEdit.test.tsx
    - ../design-system/src/field-contract.test.tsx
    - ../design-system/src/primitives.css
    - ../design-system/src/index.ts

key-decisions:
  - "Field's error slot now RENDERS FieldError rather than duplicating its span. Without this, `tone` would have had to be implemented twice in two files that agreed only by coincidence — which is the drift the finding is about. Required widening FieldError.message to ReactNode and adding an `id` prop; the default DOM is byte-identical."
  - "The required marker is a real empty `<span aria-hidden=\"true\">` with the glyph in CSS, NOT a `::after` on the label. Generated content cannot be aria-hidden and IS included in the accessible name in Chrome, so the label-pseudo approach would have made 'required' announce twice — the exact defect decision 2 of the plan forbids."
  - "The warning tone rule is (0,2,0), not (0,1,0). At its current position (0,1,0) would ALSO win on source order, so this is defensive rather than strictly required today — but N4 measured that at (0,1,0) the warning renders var(--red), identical to the error, which is precisely the E11 defect. Made position-independent deliberately."
  - "The summary link composes `Link` with `variant=\"default\"`, not the `inline` default: `inline` sets color as an INLINE style. Discovered because primitive-composition.test.ts already forbids a bare `<a href>` — an existing repo invariant the plan did not mention."
  - "The summary rule is `.ds-atom-form-error-summary a.ds-atom-link` (0,2,1). At the (0,1,1) first written, Link's (0,2,0) variant rule won on both specificity and source order and painted the link var(--ink-2) — grey, inside a red error box. Measured, not inferred: negative control N1."
  - "Did NOT change which `.ds-atom-field-error` declaration wins. var(--red) clears AA at 4.67:1 on charcoal-light --cream, so this is a dead-comment defect and not a contrast defect; changing the winner would move 15 controls' error colour immediately before 01-20 records baselines. Documented in place and raised as a finding."
  - "InlineEdit's edit-mode input takes the RAW ariaLabel, not the defaulted value. Defaulting it would name the input 'Click to edit', which is nonsense for a field already being edited; using the raw prop leaves the omitted case byte-identical while fixing the previously-unnamed input for adopters."
  - "Split the plan's single commit into two task-scoped commits plus one exports commit, so each subject is accurate about what it contains."

patterns-established:
  - "Cross-component delegation pinned structurally: field-contract.test.tsx reads the reference shape from a LIVE FieldError render, so mutating FieldError drags all fifteen controls with it. Proven by M1 (reference moved, controls followed -> loop green) and M2 (delegation broken -> loop red naming the control)."
  - "A negative-control PAIR for a specificity claim: N3 relocates the rule above both base declarations and must stay green (position independence); N4 lowers the specificity at that same position and must go red (specificity is what does the work). Either alone is ambiguous."

requirements-completed: [DS-02]

# Metrics
duration: 75m
completed: 2026-08-19
---

# Phase 1 Plan 11: Field Contract — required, severity, anchored summaries, InlineEdit names Summary

**All four findings closed additively — and the headline is that the plan's `<a href>` for G-6 violated an
existing repo invariant nobody had mentioned, and the CSS rule written to style it lost silently to the
`Link` primitive's own variant rule until a browser measured it grey.**

`FieldProps` gains `required` and `errorTone`; `FieldError` gains `tone`; `FormErrorSummary` accepts
anchored entries; `InlineEdit` accepts an accessible name. Every prop is additive with the previous
behaviour as its default, and the default DOM is unchanged in all four cases.

## Performance

- **Duration:** ~75 min wall clock, across one interruption (an environmental API death mid-plan; work survived, `fcd7fb3` was already committed)
- **Tasks:** 2 of 2, landed as **3 commits**
- **Files:** 1 created, 9 modified
- **Suite:** 116 files / **1590 → 1624 tests** (+34), all passing
- **Browser:** 3 new Chromium cases, charcoal × light
- **a11y:** 82 suites / **482 → 485 tests** (+3 stories), zero violations
- **Biome:** 350 files clean · **tsc** both projects · **css:check** 75 files byte-exact
- **Negative controls:** 6 run (M1, M2, M3, N1, N2, N3+N4), all restored SHA-identical

## Commits

| Hash | Subject |
|---|---|
| `fcd7fb3` | `feat(forms): add Field required marker and FieldError severity` |
| `e24f865` | `feat(forms): anchor FormErrorSummary entries and name InlineEdit triggers` |
| `ad4127a` | `build(exports): export FormErrorSummaryEntry from the package index` |

---

## The four findings

### E15 — the required marker

`required?: boolean` renders exactly one marker. The three decisions the plan asked to be made
deliberately:

1. **Form.** An asterisk, via `content: "*"` in `primitives.css` at `.ds-atom-field-required::after`
   (0,1,1) — low enough that a consumer's identical selector ties and wins on source order, which is
   the intent for a glyph a locale may need to change.
2. **Single announcement.** The marker is a **real empty `<span aria-hidden="true">`**, not a
   `::after` on the label. This is the one place the obvious implementation is wrong:
   **CSS-generated content cannot be `aria-hidden`, and Chrome DOES include it in the label's
   accessible name.** A `.ds-atom-field-label[data-required]::after` would therefore have announced
   "required" twice — the exact defect the decision forbids. A real element carrying `aria-hidden`
   removes itself *and its generated content* from the tree, so the glyph is restyleable AND silent.
3. **`group`.** The marker renders inside the `<legend>`, for the reason `group` exists at all.

`required` does **not** set the native attribute — `Field` wraps arbitrary children and does not own
the control. The docstring says so explicitly, so `Field` cannot appear to enforce validation it
cannot see.

### E11 — FieldError severity

`tone?: "error" | "warning"`, defaulting to `"error"`.

| | role | colour | non-colour |
|---|---|---|---|
| `error` (default) | `alert` — interrupts | `var(--red)`, rendered | none (unchanged) |
| `warning` | `status` — waits | `var(--amber-d)` | `⚠` glyph, `aria-hidden`, from CSS |

**The warning tone's colour token and its measured ratio:** `var(--amber-d)`, which under charcoal
light aliases `--ochre-d` → `#8c591f`. Measured in Chromium, charcoal × light:

```
[01-11] charcoal light warning text rgb(140, 89, 31) on rgb(245, 243, 240) = 5.32:1
```

**5.32:1 — clears AA for normal text (4.5:1).** Asserted by token identity (`--amber-d` resolved from
the live cascade, and `--amber-d === --ochre-d` verified in-cell), not against a hex this plan
hardcodes. An existing token was reused, so 01-03's contrast register is not bypassed. For reference,
offline on `--cream` it is 5.22:1 and on `--panel` 5.60:1; the 5.32:1 figure is the story's actual
painted ancestor and is the authoritative one.

The glyph is `content: "\26A0\FE0E"` — escaped so the file stays ASCII, and **`\FE0E` is
VARIATION SELECTOR-15**, which forces text presentation. Without it the glyph renders as a colour
emoji on Apple platforms and the `--amber-d` colour stops applying to it.

### G-6 — anchored summary entries

`errors: Array<string | { message: string; href?: string }>` — widened, not replaced, so every
existing call site compiles. The anchor renders **inside the `<li>` that names the failure**, with the
message as its text; nothing renders outside the `<ul>`; the container keeps `role="alert"`, and the
asymmetry with `FieldError`'s warning tone is commented so the two do not get "made consistent" later.
The index key and its `biome-ignore` survive on purpose — `href ?? message` collides whenever two
fields fail with the same message.

**The `href` allow-shape adopted for T-11-01:** an entry becomes an anchor only when its href's
**first character** is `/`, `#` or `.`, **and** it does not start with `//`. Everything else renders as
plain text — the failure is still named, it just is not clickable.

| Rejected | Why |
|---|---|
| `javascript:alert(1)`, `JaVaScRiPt:…` | React does not filter `href`; this would execute on click |
| `data:text/html,…`, `vbscript:…` | same class |
| `//evil.example.com` | passes a naive leading-slash test but is protocol-relative and leaves the app |
| `https://evil.example.com` | off-origin; the prop is for in-app deep links, which is all D-18 needs |
| `" /leading-space"` | the test is on the first character, so whitespace smuggling fails |

Accepted: `/resume`, `#alt-text`, `./photos`, `../home`.

### F-15-8 — InlineEdit's accessible name

**Only ONE of the two components carried the hardcoded string.** `src/interaction/InlineEdit/` had
`aria-label="Click to edit"` with no prop. **`src/inputs/InlineEditField/` already had it right** — a
**required** `ariaLabel: string`. So the new prop is named `ariaLabel` to match the sibling rather than
inventing a second spelling, and it is optional with the old string as its default, because seven
existing tests in that file and every existing consumer select on it.

Additionally: **InlineEdit's edit-mode input had no accessible name at all** — `sharedProps` never set
one. It now takes the **raw** prop, so omitting `ariaLabel` leaves that case byte-identical while
adopters get both states named. `InlineEdit`'s 25px height was not touched (F-15-7 / G-2, Phase 06.1);
a test asserts it, as a scope guard for T-11-06.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The plan's `<a href>` violates an existing repo invariant**
- **Found during:** Task 2, on the full suite (NOT on the plan's own gates, which all passed)
- **Issue:** `src/primitive-composition.test.ts` asserts *"no component renders a raw `<a>` for
  navigation — the Link primitive owns anchor styling, the focus ring and its variants."* The plan
  specifies a bare `<a href>` and never mentions the invariant. `npm test` failed with
  `compose <Link> instead of a bare <a href>: expected [ 'patterns/FormValidation/index.tsx' ]`.
- **Fix:** compose `Link`. This is also the project's own core value — the design system wins over the
  bespoke thing.
- **Consequence:** picking the variant mattered. `Link`'s default variant is `inline`, which sets
  `color: var(--amber-d)` **as an inline style** — unbeatable from a stylesheet without `!important`,
  so the link would have rendered amber inside a red summary box. `default` and `quiet` are the only
  stylesheet-only variants; `default` was chosen.
- **Commit:** `e24f865`

**2. [Rule 1 — Bug] The CSS rule written for that link lost silently to `Link`'s own rule**
- **Found during:** Task 2, by negative control N1 in a real browser
- **Issue:** `.ds-atom-form-error-summary a` is (0,1,1). `Link`'s `.ds-atom-link[data-variant="default"]`
  is **(0,2,0) and declared ~1,070 lines lower** in `primitives.css`, so it wins on **both** axes and
  paints the link `var(--ink-2)` — measured `rgb(68, 64, 58)`, grey, inside a red error box. Every unit
  test passed in that state and a grep for the rule passed too. **This is 01-10's failure mode exactly.**
- **Fix:** `.ds-atom-form-error-summary a.ds-atom-link` at (0,2,1), which beats (0,2,0) regardless of
  position.
- **Commit:** `e24f865`

**3. [Rule 2 — Missing] `FormErrorSummaryEntry` was not exported from the package index**
- **Issue:** a consumer could pass an anchored entry but could not annotate the array holding it, which
  is exactly what D-18's publish surfaces have to build. `FieldProps` and `InlineEditProps` were already
  exported, so `required`, `errorTone` and `ariaLabel` were already reachable.
- **Commit:** `ad4127a`

**4. [Rule 2 — Missing] Browser verification the plan did not specify**
- **Issue:** the plan's gates are unit tests plus greps. All three of this plan's cascade claims are
  **unverifiable** that way — jsdom implements no CSS specificity and no pseudo-element content, and the
  Field unit test's `textContent === ""` assertion proves the *absence of a JSX literal* while being
  silent on whether anything is visible.
- **Fix:** added `tests/visual/field-contract.spec.ts`, three Chromium cases reusing 01-02's
  `probeComputed`. This is what caught deviation 2.

### Plan defects found

**A. Task 1's second `<automated>` block cannot run as written.** It reads:

```
grep -q 'role="alert"' "$f" || { … }; -q 'required' "$DS/src/inputs/Field/index.tsx" || { … }
```

The third clause is **missing the word `grep`**. As written `-q` is executed as a command; because the
clauses are `;`-separated the block's exit status comes from the last statement (`echo`), so **the gate
would have reported OK even with no `required` flag at all.** Run corrected here — both roles present,
`required` present.

**B. The plan's Task 2 anchor gate is satisfied by the wrong thing.** It greps the slice after `<ul>`
for `/<a\b|href=/`. After composing `Link` there is no `<a` in the source at all; it passes on
`href={href}`. It is green and correct here, but it cannot distinguish an anchor on the item from an
`href` anywhere below the `<ul>` token.

### Deliberate non-changes

- **Did not change which `.ds-atom-field-error` declaration wins** (see findings below).
- **Did not touch `InlineEditField`** — it already had a required `ariaLabel`.
- **Did not touch `InlineEdit`'s geometry** — F-15-7 / G-2, Phase 06.1.
- **Did not record the missing `overlays-lightbox--responsive-gallery` baseline** (01-20 owns it). No
  stray PNGs were written; this plan's spec takes no screenshots, and the tracked-clean gate is intact.

---

## Verification

### Negative controls — 6 run, all restored SHA-identical

Restores were done by `cp` from a scratch backup, never `git checkout --`.

| # | Mutation | Expected | Result |
|---|---|---|---|
| **M1** | `FieldError` gains a `MUTANT` class, `Field` still delegates | shape-pin RED (mutation landed), **15-control loop GREEN** | Confirmed. The reference moved and **all fifteen controls moved with it** — this is what proves the delegation is real |
| **M2** | `MUTANT` kept, `Field`'s delegation broken back to a hand-rolled span | loop RED, naming the control | `TextInput does not route its message through FieldError` — fails for the stated reason |
| **M3** | `inAppHref` allow-shape removed | 7 `refuses` RED, **4 `accepts` GREEN** | Confirmed with the built-in positive case: the battery is not inert |
| **N1** | summary rule (0,2,1) → (0,1,1) | G-6 browser case RED, link painted `--ink-2` | `Expected: not "rgb(68, 64, 58)"`. E15/E11 stayed green — targeted, not a blanket break |
| **N2** | required marker `content: "*"` → `""` | E15 browser case RED | `the ::after glyph did not apply` / `Received: """"` |
| **N3+N4** | **pair.** N3: relocate the tone rule ABOVE both base declarations, keep (0,2,0). N4: lower it to (0,1,0) at that same position | N3 GREEN (position irrelevant), N4 RED | N3 green with the rule at line 166 vs bases at 174 and 5355. N4 red: warning renders `rgb(184, 70, 63)` = `var(--red)`, **identical to the error tone** — the E11 defect itself |

**Why N3 and N4 are a pair.** N3 alone is ambiguous: green could mean "specificity works" or "nothing
changed". N4 lowers only the specificity, at the same position, and goes red. Together they establish
that the (0,2,0) — not the position — is what makes the tone rule win. This also validated the comment
written in the CSS, per 01-10's lesson that a control's *stated reason* can be false even when it
goes red.

### RED-phase accounting

Four of the Task 1 tests passed during RED. Each was checked rather than assumed:

- **Two are invariance guards** ("no marker when `required` is absent", "the default tone is
  unchanged") — green before *and* after, by design; they exist to catch an additive change that is
  not additive.
- **Two passed FOR THE WRONG REASON.** The 15-control routing assertions were green because all
  fifteen already emitted the same tag/class/role as `FieldError` *by coincidence*, routing through
  `Field`'s hand-rolled span. Nominal, not structural. M1/M2 were run specifically to settle it.

Three of the Task 2 InlineEdit tests likewise passed in RED: the default fallback, the untouched
edit-mode input, and the T-11-06 geometry scope guard. All three are guards.

### Gates

| Gate | Result |
|---|---|
| `npm test` | **1624 passed** / 116 files, exit 0 |
| `npm run check` | 350 files, no fixes |
| `npm run typecheck` | both projects, exit 0 |
| `npm run css:check` | 75 files, round-trip byte-exact |
| `npm run test:a11y` | **485 passed** / 82 suites, zero violations, exit 0 |
| `tests/visual/field-contract.spec.ts` | 3 passed (Chromium, charcoal × light) |

`test:a11y` is cited here legitimately: `Field`, `FieldError`, `FormErrorSummary` and `InlineEdit` all
render **inline**, not through `DSPortal`, so they are inside the `#storybook-root` scope `checkA11y`
actually examines. The portal caveat does not apply to any of them.

**Two of my own gates leaked, both the same way.** `( … npm run typecheck | tail -8 ) && echo PASS`
and the same shape around `npm test` reported PASS over a real failure, because the pipe made `tail`
the exit status — §7a's "never pipe a test runner's exit code away", encountered twice. Both were
re-run with the exit code captured directly; the `npm test` leak was hiding the `primitive-composition`
failure that became deviation 1.

---

## Findings raised (not fixed)

**1. `.ds-atom-field-error` is declared twice in `primitives.css`, and the first block is dead.**
Line 174 (Field section) and line 5355 (FormValidation section), both (0,1,0). Source order gives the
**later** copy every property. So the Field-section block's `color: var(--red-ink)` — carried by a
comment that explains *"the ink variant clears AA on the lighter surfaces in the ramp"* — never
renders; `font-size: var(--text-xs)` and `font-family: var(--font-body)` are overridden too.
**Browser-measured, not inferred:** N4 read `rgb(184, 70, 63)` = `#b8463f` = `var(--red)`.
Not fixed because `var(--red)` measures **4.67:1** on charcoal-light `--cream` and so clears AA — this
is a dead-comment defect, not a contrast defect, and changing which copy wins would move fifteen
controls' error colour immediately before 01-20 records baselines. Documented in place with a
`MEASURED` comment and a warning not to add a tone rule at (0,1,0).

**2. A warning-tone `Field` still sets `aria-invalid="true"` on its control.** `useField` computes
`invalid: Boolean(error) || Boolean(errorMessage)` and never sees `errorTone`, so a LENIENT warning
marks the field invalid to assistive technology even though `role="status"` correctly declines to
interrupt. Threading the tone into `useField` would touch every control's call site, which is wider
than this plan.

**3. The objective's `className` claim is wrong, and the correct number matters.** `Field` is described
as *"the one component that concatenates `className` via an array-join idiom rather than the template
idiom the other 69 use"*. Measured: **18** components use `.filter(Boolean).join(" ")` and **46** use
the template idiom. `Field` is one of eighteen, not an outlier — among them `FormValidation`,
`InlineEdit`, `InlineEditField`, `StatCard`, `Textarea`, `Popover`, `Sheet` and `BottomSheet`. A future
plan that sets out to "normalise the one outlier" will find eighteen.

**4. Three new stories have no visual baseline.** `patterns-formvalidation--field-required-marker`,
`--field-error-severity` and `--anchored-error-summary`. 01-20 owns recording them, alongside the
pre-existing `overlays-lightbox--responsive-gallery` gap. `storybook.spec.ts` will now report four
missing baselines rather than one; none of the four is a regression.

**5. `FieldError` in edit-mode `InlineEdit`/`InlineEditField` has no tone available.** Both pass
`message` only, so a save failure is always `role="alert"`. Correct today — a failed save should
interrupt — but noted because the two components now sit next to a severity axis they do not use.

## Self-Check: PASSED

All 10 claimed files exist; all 3 claimed commits (`fcd7fb3`, `e24f865`, `ad4127a`) resolve in
`git log --all`. `../design-system` is on `charcoal-theme`, 25 commits ahead of `main`, tracked-clean
apart from the permitted untracked `design_handoff/design_handoff_ds_overview/`.
