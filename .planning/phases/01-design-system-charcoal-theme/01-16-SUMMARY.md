---
phase: 01-design-system-charcoal-theme
plan: 16
subsystem: design-system
tags: [e9, f-15-1, f-15-2, f-15-3, f-15-6, ssr, dsportal, inline, closable, confirmdialog, tabs, cascade, axe-scope]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 15
    provides: the "fixing the thing the finding names can be a complete no-op" discipline (applied to `closable`, where suppressing only the visible button is the exact analogue of fixing only `onDragStart`), the three-way gate proof, and the comment-stripping idiom this plan needed in three separate places
  - phase: 01-design-system-charcoal-theme
    plan: 14
    provides: the per-sheet sibling-dependency declarations that `split-css.mjs` re-derives when a 76th sheet appears, and the "a gate must cover every component in files_modified" rule
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: "`tests/visual/computed.ts` probeComputed — the only instrument that can prove the confirm panel's rule WON rather than merely exists"
provides:
  - "$DS/src/_internals/DSPortal.tsx — `inline?: boolean`, an opt-in escape from the mount-effect null, so an overlay can server-render"
  - "$DS/src/overlays/Modal/index.tsx — `closable?: boolean`, suppressing the header Close button, the Escape handler AND the backdrop path together; Escape is swallowed, not leaked to the layer beneath"
  - "$DS/src/overlays/{Sheet,ConfirmDialog}/index.tsx — `inline` threaded through Sheet, ConfirmDialog and TypeToConfirm (three separate props: TypeToConfirm renders its OWN DSPortal)"
  - "$DS/src/primitives.css — a `DS atom: ConfirmDialog` banner section, so split-css.mjs emits dist/css/confirmdialog.css for the first time (75 sheets -> 76)"
  - "$DS/src/data-display/Tabs/index.tsx — every panel's children server-render; inactive panels hidden presentationally"
  - "$DS/tests/visual/confirm-panel.spec.ts — 4 Chromium cases reading the panel's computed background in all four brand x mode cells"
  - "two stories that render a dialog OPEN and inline — the first dialogs in this library that fall inside the element test:a11y scopes axe to"
affects: [01-18 Badge F-15-4, 01-20 charcoal baselines (count now TWELVE) + v2.0.0 changelog, 01-21 publish, Phase 06.1 density axis, Phase 5 admin re-auth dialog]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An overlay can server-render only by opting OUT of the portal. `inline` returns `<>{children}</>` with no mount gate — the gate exists because createPortal needs a real document, and in place there is nothing to portal to"
    - "A prop that suppresses a dismissal must suppress every dismissal. Three exits, three separate code sites, three separate test cases — and a fourth asserting the trap SWALLOWS Escape rather than letting it fall through to the layer below"
    - "A trap dialog registers in the dismiss stack and ignores the key. Declining to register leaves the topmost registered layer as the one BELOW the trap, so Escape closes a surface hidden behind the scrim and unreachable through the focus trap — measured, not reasoned"
    - "Inline styles beat class rules without !important, so a stylesheet fix must MOVE the declarations, not add a rule beside them. NC-4b proved the corollary: a differently-named inline object carrying `background: var(--panel)` contains no forbidden literal, passes a name-specific grep, and still paints over the new sheet"
    - "`color-mix(in srgb, var(--panel) 97%, transparent)` keeps a deliberate glass effect while making it brand- and mode-aware, and reproduces the old hardcoded rgba EXACTLY in the cell the old value was authored for — so zero existing baselines moved"
    - "`test:a11y` scans no DSPortal-portaled content, because test-runner.ts scopes checkA11y to `#storybook-root` and the portal target is document.body. Measured, four stories, with `insideStorybookRoot` read directly"
    - "A story decorator that hardcodes className=\"dark\" silently reverts charcoal to the design system's neutral dark tokens. 67 story files do it"

key-files:
  created:
    - ../design-system/tests/visual/confirm-panel.spec.ts
  modified:
    - ../design-system/src/_internals/DSPortal.tsx
    - ../design-system/src/_internals/DSPortal.test.tsx
    - ../design-system/src/overlays/Modal/index.tsx
    - ../design-system/src/overlays/Modal/Modal.test.tsx
    - ../design-system/src/overlays/Modal/Modal.stories.tsx
    - ../design-system/src/overlays/ConfirmDialog/index.tsx
    - ../design-system/src/overlays/ConfirmDialog/ConfirmDialog.test.tsx
    - ../design-system/src/overlays/ConfirmDialog/ConfirmDialog.stories.tsx
    - ../design-system/src/overlays/Sheet/index.tsx
    - ../design-system/src/data-display/Tabs/index.tsx
    - ../design-system/src/data-display/Tabs/Tabs.test.tsx
    - ../design-system/src/primitives.css
    - ../design-system/src/smoke.test.tsx

key-decisions:
  - "`inline` is the escape, not adopt-on-mount. The adopt variant relocates between two frames and would put a hydration mismatch in eight components"
  - "`closable={false}` REGISTERS in the dismiss stack and ignores Escape, rather than declining to register. NC-3 measured the alternative: Escape reached the outer Modal and the stack read 0 instead of 1"
  - "TypeToConfirm needed its OWN `inline` prop. It lives inside ConfirmDialog's FILE but renders its own `<DSPortal>` directly, so it inherits nothing — neither of the plan's two hypotheses"
  - "Sheet skips its dark-context re-detection when inline: the panel never left the consumer's DOM, so re-establishing `.dark` would nest one inside another AND read `document` on the client but not the server. Measured: exactly one `.dark` wrapper on both passes"
  - "The panel background is `color-mix(in srgb, var(--panel) 97%, transparent)`, NOT `--g-bg`. Charcoal does not redefine `--g-bg`, so the glass tokens would paint a white 55% glass on a cream page"
  - "Geometry (width 360, radius 14, padding 22, blur 14) stays literal. It carries no theme meaning and the control-geometry family is Phase 06.1's (protocol section 9)"
  - "box-shadow moves to `var(--shadow-3)` because that is the half of the hardcoded value charcoal's Rule C-5 actually fixes — measured as a hairline ring in charcoal dark"
  - "All FOUR tone washes tokenised, not just the danger one the finding names. Same table, same defect, same inline-style mechanism"
  - "`Lightbox` did NOT get `inline` — 01-07 owns it and a fail-closed image viewer is not a thing. Neither did Tooltip / Popover / HoverCard, whose whole behaviour is positioning against a trigger. All four asserted clean, comments stripped"
  - "No `@layer`, no density block, no touch-target change — protocol section 9"
  - "CHANGELOG.md NOT written — 01-20 owns it. This change is additive: NO `BREAKING CHANGE:` footer. Paste-ready wording below"

patterns-established:
  - "Pattern: a gate can be UNPASSABLE as well as unfailable. Task 2 gate 2 forbids the literal `255,255,255,.97` in ConfirmDialog's source while the same task's action requires the superseded PROJECT.md line — which quotes it — to be recorded there. It FAILED on the correct fix"
  - "Pattern: the token gate reads comments. `src/tokens.test.ts` scans src for the var-reference syntax and requires every name to exist in the base layer. A comment explaining that `--ochre` is charcoal-only failed it; the comment explaining THAT failure failed it a second time for the placeholder it used"
  - "Pattern: name-specific greps do not close a mechanism. `grep -qE 'panelStyle'` passed on an inline style object called something else. Repaired to match the JSX element's own `style={` attribute"

requirements-completed: [DS-01, DS-02]

# Metrics
duration: 78min
completed: 2026-08-19
---

# Phase 01 Plan 16: the portal escape, the fail-closed dialog, the panel in the cascade Summary

**Four overlays can now server-render, `Modal` can be genuinely fail-closed, `ConfirmDialog`'s panel
is painted by a stylesheet for the first time, and every tab panel's content exists in server HTML —
and the plan's own Task 2 gate could not pass on a correct fix, because it forbids a literal that the
same task's action requires the code to quote.**

## Performance

- **Duration:** 78 min
- **Started:** 2026-08-19 16:44 IST
- **Completed:** 2026-08-19 18:02 IST
- **Tasks:** 2 of 2
- **Files modified:** 14 (1 created) — 1,047 insertions, 42 deletions
- **Tests:** `npm test` 1,695 → **1,725** (+30); `test:a11y` 491 → **493**; new Playwright spec **4** cases
- **CSS sheets:** 75 → **76** (`dist/css/confirmdialog.css` is new)
- **Negative controls executed:** 8, every mutation restored from a `cp` backup and verified by `shasum -a 256`

## Task Commits

| # | Hash | Message |
|---|---|---|
| 1 (RED) | `9cb8fc4` | `test(overlays): add failing SSR-reachability and Modal closable probes` |
| 1 (GREEN) | `3f18ca1` | `feat(overlays): give DSPortal an in-place escape and Modal a real closable prop` |
| 2 | `e80b914` | `fix(overlays): SSR escape, Modal closable, ConfirmDialog panel tokens, Tabs panel children` |

`charcoal-theme` is **43** commits ahead of `main`, tracked-clean, `git stash list` empty.

---

## The SSR byte measurements

`renderToStaticMarkup`, identical fixture before and after, and **measured in both the `node` and
`jsdom` environments to prove the number is not an artefact of a fake `document`** — `DSPortal`'s gate
is a `useState`/`useEffect` pair, not a `typeof document` check, so the two agree exactly.

| overlay | Phase 0 baseline | before (this plan, re-measured) | after — default | after — `inline` |
|---|---|---|---|---|
| `Modal` | 0 B | **0 B** | **0 B** | **1,065 B** |
| `ConfirmDialog` | 0 B | **0 B** | **0 B** | **1,902 B** |
| `TypeToConfirm` | 0 B | **0 B** | **0 B** | **1,707 B** |
| `Sheet` | 0 B | **0 B** | **0 B** | **1,075 B** |
| **`Tabs`** | — | **1,202 B**, one panel's children | **1,255 B**, all three | n/a |

Phase 0's 0 B is reproduced exactly, a third time, in this repo and this session.

**A detail worth keeping:** `ConfirmDialog`'s inline figure fell from 2,122 B to **1,902 B** across
Task 2, and `TypeToConfirm`'s from 1,922 B to 1,707 B. That is the panel's `style` attribute — 220 and
215 bytes of duplicated declarations — leaving the server payload when the rule moved into the sheet.
Bringing the panel into the cascade made the server-rendered dialog **10% smaller**.

For `Tabs` the byte count is the weaker half of the measurement; the marker check is the real one:

```
before  markers={"a":true,"b":false,"c":false}
after   markers={"a":true,"b":true, "c":true}
```

### The non-portaled contrast pair — measured, and not what the plan says

The objective cites *"`AlertBanner` (634 B) and `FormErrorSummary` (156 B)"*. Measured here:
**698 B** and **134 B**. Neither figure is wrong so much as **not a constant** — both are functions of
the props passed, and mine differ from Phase 0's. The reproducible fact is the one that matters and it
holds: non-zero against the overlays' zero, which is what makes 0 B a **portal** property rather than a
general overlay one. The committed assertion is `> 0`, not a literal, for exactly this reason.

---

## Plan premises that turned out false

**Eight.** One of them made the plan's own gate unpassable.

### 1. Task 2's gate 2 FAILS on a correct fix — it forbids a literal the same task must write

```bash
if grep -q '255,255,255,.97' "$DS/src/overlays/ConfirmDialog/index.tsx"; then
  echo "FAIL: the hardcoded near-white glass background is still inline"; exit 1
fi
```

The plan's action says: *"record the supersession in this plan's SUMMARY **and in the component's
docstring**"*, and the decision being superseded is *"ConfirmDialog is always-light glass surface
**(rgba(255,255,255,.97))** — not token-driven internally"*. Recording it means quoting it. Measured on
the shipped tree:

```
>>> PLAN GATE VERDICT: FAIL — 'the hardcoded near-white glass background is still inline'
165:// surface (rgba(255,255,255,.97)) — not token-driven internally" (CONSTRAINT-010).
```

That is 01-15's *"the docstring that must quote the defect satisfies the gate that forbids it"* with
the sign flipped — **unpassable** rather than unfailable. Comment-stripped, the literal does not occur
in code at all. Repaired and proven three ways below.

### 2. `.ds-atom-confirm-panel` was ALREADY on both elements — the class was never the gap

The plan: *"Add `.ds-atom-confirm-panel` to the component and move the inline declarations into the
rule."* The class was on the `ConfirmDialog` panel (line 238) and the `TypeToConfirm` panel (line 379)
before this plan began. F-15-3's own wording is the accurate one — *"no `.ds-atom-confirm-panel` rule
anywhere under `dist/css/`"* — and it is the **rule** that was missing, because `split-css.mjs` derives
sheets from `primitives.css` banners and `ConfirmDialog` had no banner. The class had been sitting
there matching nothing.

This matters practically: a plan that read the instruction literally would have added a duplicate
class, added the rule, and left `style={panelStyle}` in place — which paints nothing new, because
inline styles beat class rules without `!important`. The **only** work that mattered was the deletion.

### 3. `TypeToConfirm` renders its OWN `DSPortal` — neither of the plan's two hypotheses

The plan asked which of two it turned out to be: *"If it renders through `ConfirmDialog`'s own portal
it inherits `inline` for free and needs no separate change."* It is the third case. `TypeToConfirm` is
implemented **inside** `src/overlays/ConfirmDialog/index.tsx` (confirmed: there is no
`src/overlays/TypeToConfirm/`), but it renders `<DSPortal>` **directly** at what was line 374 — it does
not wrap `ConfirmDialog` at all, and shares only the file, the panel class and the former
`panelStyle` object. So it needed its own `inline` prop, its own destructure default and its own
docstring. Three props were added, not two. No directory was created.

### 4. `--g-bg` / `--g-bd` are NOT on charcoal's may-redefine list — charcoal does not declare them

The plan: *"use the existing `--g-bg` / `--g-bd` glass tokens, **which are on charcoal's may-redefine
list**"*. Measured — `grep -cE '^\s*--g-bg\s*:' src/themes/charcoal.css` returns **0**, and the same for
`--g-bd`. They fall through to the base layer: `rgba(255,255,255,0.55)` light, `rgba(15,13,11,0.7)`
dark. Under charcoal **light** that is a white 55% glass on a `#F4F1EA` cream page — the wrong colour
family entirely — and under charcoal dark it is `rgb(15,13,11)`, not the `#1E1E1D` the plan expects.

Taking the plan's third option would have reproduced the finding in a new colour. The raised-surface
token the plan names first is the right one, and it is `--panel`: `var(--cream-2)` under charcoal, so
`#FBF9F4` light and `#1E1E1D` dark, exactly the values the plan predicted.

### 5. `--red-bg` exists, so the danger wash had a token — but no amber tint survives charcoal

The plan hedges: *"replace it with the existing red-tint token if one exists (`--red-bg` / `--red-l`),
and if none exists, **report it**."* For the danger tone one does: `--red-bg` is `#f4e0dd` light /
`#2e1a18` dark. Shipped.

**The report the plan asked for is about the warning tone.** Charcoal maps *every* amber tint token to
the solid accent:

```
--amber-l:    var(--ochre)   #b0722a
--amber-soft: var(--ochre)   #b0722a
--amber-warm: var(--ochre)   #b0722a
```

There is no amber **tint** in charcoal at all, so `bg: "var(--amber-soft)"` would paint a solid ochre
block behind `var(--amber-d)` ochre text. Rather than invent a value, the wash uses
`primitives.css`'s **own existing idiom for the same problem** — five `color-mix(in srgb, var(--amber)
N%, transparent)` washes already ship in the Calendar and RichText sections.

### 6. Nothing sets `aria-hidden` on a tab panel — `hidden` is the whole mechanism

The plan's behaviour: *"exactly one panel is `aria-hidden="false"` and reachable at a time."* No
`aria-hidden` attribute exists on `Tabs` panels, before or after. The `hidden` attribute does both
jobs the plan wants (accessibility tree **and** tab order), and an explicit `aria-hidden="false"`
beside it is redundant surface axe flags. Shipped as `hidden` only, and the test asserts the inactive
panels carry **no** `aria-hidden` — so a future "make it explicit" edit fails rather than passes.

### 7. `Tabs`' own comment already claimed the fix that was not there

`{/* Tab panels - all kept mounted; hidden attribute controls visibility */}` sat directly above
`{isActive ? t.content : null}`. The comment described the intended behaviour and the line below it
did the opposite. Anyone auditing by reading comments would have marked F-15-6 closed.

### 8. The plan's `<human-check>` requires a story its `files_modified` does not list

*"Then open the `closable={false}` Modal story"* — no such story existed, and
`Modal.stories.tsx` is not in `files_modified`. Same for the ConfirmDialog charcoal-dark check: every
ConfirmDialog story starts **closed** behind a button, so no visual baseline in this repository has
ever contained the panel, and the human check had nothing to open. Two stories added; see Deviations.

### Premises that held — checked, not assumed

| Premise | Verdict |
|---|---|
| `DSPortal` is 27 lines and the `mounted` gate is the whole of F-15-1 | **TRUE**, verbatim |
| The `mounted` gate is deliberate (createPortal needs a real `document`), so the fix is an escape not a removal | **TRUE** — kept intact on the default path |
| `Modal` renders `Button aria-label="Close"` unconditionally with no prop | **TRUE** — and its click path was **untested** before this plan; only Escape and the backdrop were |
| `useDismiss` is a stack, innermost last, with `__dismissStackSize()` exported | **TRUE** |
| A `closable` prop must not bypass the stack | **TRUE**, and the choice is load-bearing — see NC-3 |
| `ConfirmDialog` has no banner in `primitives.css`, hence no sheet | **TRUE** — 75 banners, none for it |
| `--red` is inherited by charcoal deliberately, so keep it | **TRUE** — charcoal declares `--red` in both blocks and the ink needed no change |
| `Lightbox` also uses `DSPortal` | **TRUE** — untouched, and asserted untouched |
| `slugify("ConfirmDialog")` yields `confirmdialog` | **TRUE** — `dist/css/confirmdialog.css` |
| `css:check` round trip still byte-exact with a 76th section | **TRUE** — `76 files, round-trip byte-exact` |
| Charcoal's Rule C-5 makes dark elevation a hairline | **TRUE**, measured: `rgb(62,62,57) 0px 0px 0px 1px, rgba(0,0,0,0.55) 0px 16px 40px` |
| Rendering all panels does not move `Tabs`' layout (hiding is `display:none`) | **TRUE** — 0 pixel mismatches across all 8 Tabs baselines |

---

## The brief's carry-forward, settled empirically

> *"the `test:a11y` scans no portaled content limitation is real for `DSPortal`-based overlays but I no
> longer trust my own statement of its scope."*

**It is real, and the mechanism is the axe scope selector — not the presence of `createPortal`.**
`.storybook/test-runner.ts` line 61:

```ts
await checkA11y(page, "#storybook-root", { … });
```

`DSPortal` mounts to `document.body`, which is a sibling of `#storybook-root`, not a descendant.
Measured directly in Chromium by reading `#storybook-root.contains(el)`:

| story | dialog present | inside `#storybook-root` |
|---|---|---|
| `overlays-confirmdialog--danger` (portaled) | yes | **false** — grandparent `BODY` |
| `overlays-modal--basic` (portaled) | yes | **false** |
| `overlays-sheet--default` (portaled) | yes | **false** |
| `overlays-confirmdialog--inline-panel` (**new**, `inline`) | yes | **true** |
| `overlays-modal--not-closable` (**new**, `inline`) | yes | **true** |

This is consistent with 01-15's finding rather than contradicting it: dnd-kit's live regions render as
plain inline markup **inside** the `DndContext` (`container ? createPortal(markup, container) : markup`,
and `container` is never set), so they were always inside the story root. It is the destination that
decides, and `document.body` is outside.

**Consequence for this plan's own threat register.** T-16-02's mitigation is *"`test:a11y` run on the
Modal stories"* — and before this plan, every Modal story was scanned **without its dialog in it**. A
green `test:a11y` was no evidence at all about a trap dialog. `inline` is what fixes that, and the two
new stories are the first dialogs in this library axe has ever seen. `test:a11y` is **493/493**, exit 0,
with `Modal.stories.tsx`, `ConfirmDialog.stories.tsx` and `Tabs.stories.tsx` all PASS.

---

## Gates repaired

Seven consecutive plans. **Two repairs, one in each direction**, plus one gate strengthened after a
negative control walked straight through it.

### Task 1 gate 2 — a whole-file word grep the plan's own docstrings satisfy

```bash
grep -q 'inline' "$DS/src/_internals/DSPortal.tsx" || FAIL
grep -q 'closable' "$DS/src/overlays/Modal/index.tsx" || FAIL
```

Both words are absent from the pre-plan files, so unlike 01-15's the gate does fail at the start. The
defect is on the other side: the plan's action **mandates** docstrings containing both words
(*"Document the tradeoff on the prop"*, *"Add the accessibility consequence to the docstring"*), so the
gate is satisfied by the documentation of a fix that has been deleted.

And the specific deletion that matters is the one the plan's own `key_links` calls the substance:
**suppress the visible button and restore the other two exits.**

| Modal state | plan's gate | repaired gate |
|---|---|---|
| pre-plan (no `closable` at all) | FAIL | FAIL — *declares no inline prop in code (n=0)* |
| **shipped, but Escape and backdrop exits restored — button-only suppression, docstrings intact** | **PASS — cannot detect it** | FAIL — *closable appears at only 3 code sites (need >=5)* |
| shipped | PASS | PASS |

Repaired to count `closable`'s **code sites** in comment-stripped source — prop declaration,
destructure default, Escape ternary, backdrop conjunction, Close-button ternary — and to assert the
Escape and backdrop expressions individually:

```bash
n=$(printf '%s' "$m" | grep -oE '\bclosable\b' | wc -l | tr -d ' ')
[ "$n" -ge 5 ] || FAIL   # button-only suppression leaves exactly 3
printf '%s' "$m" | grep -qE 'closable \? onClose' || FAIL
printf '%s' "$m" | grep -qE 'closable && closeOnBackdropClick' || FAIL
```

**Also strengthened for coverage.** The plan's Lightbox exclusion check covers `Lightbox` only, while
its action excludes **four** components (*"do not add it to `Tooltip` / `Popover` / `HoverCard`"*). The
repaired gate loops over all four. (The plan's comment-stripping there is doing real work and was kept:
`Lightbox/index.tsx:133` contains the comment *"callers routinely pass an inline array"*, which would
make an unstripped `grep -qE '\binline\b'` report a spurious FAIL forever.)

### Task 2 gate 2 — unpassable, and then not strict enough

Repaired in two steps, because the first repair was insufficient and a negative control proved it.

**Step 1 — comment-strip the absence check** (premise 1 above). Three-way:

| ConfirmDialog state | plan's gate | repaired gate |
|---|---|---|
| pre-plan (inline object, hardcoded rgba) | FAIL | FAIL — *still in ConfirmDialog's CODE* |
| rule added to the sheet **and** `style={panelStyle}` restored verbatim | FAIL | FAIL |
| shipped | **FAIL — cannot pass** | **PASS** |

**Step 2 — match the JSX element's own `style={`, not an object name.** NC-4b kept an inline style but
tokenised it (`background: var(--panel)`, in an object called `inlinePanel`). It contains no forbidden
literal and still beats the class rule:

| gate / instrument | NC-4b verdict |
|---|---|
| plan's gate | FAIL, but for the **comment**, not the defect — zero signal |
| repaired gate, step 1 | **PASS — walked straight through** |
| repaired gate, step 2 | FAIL — *2 inline style attribute(s) still on the panel element* |
| `ConfirmDialog.test.tsx` `getAttribute("style")` is null | **FAIL** |
| `confirm-panel.spec.ts` computed alpha | **FAIL — expected 0.97, received 1** (3 of 4 cases) |

Which is protocol §7's *"a grep cannot prove a style applied"* demonstrated on my own gate. The gate is
now good enough to catch the shape, and it says in its own comment that the probe is the real
instrument.

### The other five gates were sound — each premise checked against the pre-plan tree

| Gate | Pre-plan | Verdict |
|---|---|---|
| T1 g1 `npx vitest run src/overlays src/smoke.test.tsx` | 14 failed | sound |
| T2 g1 `npx vitest run src/overlays/ConfirmDialog src/data-display/Tabs` | red | sound |
| T2 g2 first three clauses (`confirmdialog.css` exists / holds the rule) | sheet absent → FAIL | sound. Strengthened: also requires the emitted rule's background to be token-driven, and asserts the panel class on **both** components (found 2), because "the sheet exists" would pass with `TypeToConfirm` left inline |
| T2 g3 `npx playwright test tests/visual/storybook.spec.ts` | — | sound |
| T2 g4 the four sibling gates | — | sound |
| T2 g5 `npm run test:a11y` | — | sound as a command, **vacuous as a mitigation** until `inline` existed — see above |

---

## Negative controls run

**Eight.** Every mutation restored from a `cp` backup and verified byte-identical by `shasum -a 256`.
No `git checkout --`, no `git stash`, no `git reset`, no `git clean`, no `git worktree`.

| # | What was broken | Result |
|---|---|---|
| **NC-1** | `DSPortal`'s `inline` **default** flipped to `true` | **6 failed / 235 passed.** `expected <div data-testid="portaled"> to be null`, `expected 40 to be +0`. Restored `129b3929…` |
| **NC-2** | Modal suppresses **only** the Close button; Escape and backdrop exits restored, docstrings intact | **4 failed / 17 passed** — Escape, backdrop, backdrop-with-`closeOnBackdropClick`, and the swallow case. Restored `4a9cdcdc…` |
| **NC-3** | `useDismiss(open && closable, onClose)` — the plan's other option, decline to register | **2 failed** — `onOuterClose` *"been called 1 times"* and `expected +0 to be 1`. Restored `4a9cdcdc…` |
| **NC-4a** | Rule in the sheet, `style={panelStyle}` restored verbatim | **1 failed** — `panel carries no inline background`; repaired gate FAIL. Restored `2f2de8e5…` |
| **NC-4b** | Rule in the sheet, inline style **tokenised** and renamed | **1 failed** + **3 of 4 probe cases failed** (`expected 0.97, received 1`); repaired gate step 1 **PASSED**. Restored `2f2de8e5…` |
| **NC-5** | `Tabs` reverted to `{isActive ? t.content : null}` | **3 failed** — `expected '<div class="ds-atom-tabs"…' to contain 'BETA_MARKER'`. Restored `625b94a1…` |
| **NC-6** | `Tabs`' `hidden={!isActive}` removed | **4 failed** — the exposure cases only. Restored `625b94a1…` |
| **NC-7** | Pre-plan `ConfirmDialog` and `DSPortal`/`Modal` restored (the RED tree) | 14 failed across `src/overlays`, `src/smoke.test.tsx`, `src/_internals` |

### Which control proves the suite is not inert

The brief's point, and it applied here harder than in 01-15. **Seven** assertions in this plan pass in
RED by construction, because they assert that behaviour is *unchanged*:

- `inline={false}` is byte-identical to omitting it (twice — DSPortal and smoke)
- `closable` defaults to true: the Close button is present and closes
- `closable={false}` still unwinds the dismiss stack to zero
- the `0 B` half of each of the four smoke assertions
- the non-portaled contrast pair renders
- `portals children into document.body by default` (pre-existing)

The RED run is no evidence about any of them. Three controls carry the whole weight, and each is
attributable to exactly one defect:

**NC-1 is the decisive one for "the default is unchanged."** Flipping `inline = false` to
`inline = true` is a one-token defect that silently makes every overlay render in the consumer's DOM.
It failed six cases — and, critically, **`omitting inline is identical to inline={false}` still
PASSED**, because with the default flipped both branches render in place and the identity still holds.
So the identity assertions are *not* what protects the default; NC-1 identifies the three that are
(`portals children into document.body by default`, `honors a custom target element`, and the `0 B`
half). That distinction is only visible because the control was run.

**NC-3 is the decisive one for the dismiss-stack choice**, and it is the one whose failure is
attributable to exactly one decision. It changes nothing except *how* `closable` reaches `useDismiss`.
Every other assertion in the file stays green — the button is still suppressed, the backdrop is still
gated, Escape still does not close the trap. Two assertions fail, and they are precisely the two aimed
at the mechanism:

```
a closable={false} Modal SWALLOWS Escape rather than letting it reach the layer beneath
  → expected "vi.fn()" to not be called at all, but actually been called 1 times   (onOuterClose)
closable={false} still unwinds the dismiss stack to zero on unmount
  → expected +0 to be 1                                                            (mid-assertion)
```

The first is the substantive argument for the design, measured rather than reasoned: declining to
register leaves the layer *below* the trap as the topmost registered one, so Escape closes a surface
the user cannot see behind the scrim and cannot reach through the focus trap. The second is the
assertion that passed in RED and would have stayed silent forever — NC-3 is the only evidence it bites,
and it bites on the `toBe(1)` step, not the `toBe(0)` one.

**NC-4b is the decisive one for the cascade claim**, and the only control that defeated a repaired
gate. It is the subtlest available defect — a tokenised inline style — and it is exactly the shape of
E3, E5 and F-12-2. It could not pass by coincidence because the assertion that catches it is not
"a background exists" but "the element has **no** `style` attribute", plus a computed **alpha** of 0.97
that an opaque `var(--panel)` cannot produce.

**NC-5 and NC-6 partition cleanly**, which is what makes each attributable: NC-5 fails only the three
"render everything" cases and leaves every exposure case green; NC-6 fails only the four "expose one"
cases and leaves the render cases green. Neither can stand in for the other.

---

## The ConfirmDialog panel, measured in all four cells

`probeComputed` under `tests/visual/confirm-panel.spec.ts`, reading `getComputedStyle` in Chromium.
A grep proves nothing here — the class was already on the element and the style still did not apply.

| brand × mode | panel background | resolves to | box-shadow |
|---|---|---|---|
| default × light | `color(srgb 1 1 1 / 0.97)` | `#FFFFFF` @ .97 — **identical paint to the old hardcoded value** | `rgba(0,0,0,0.12) 0 12px 32px` |
| default × dark | `color(srgb 0.121569 0.121569 0.121569 / 0.97)` | `#1F1F1F` @ .97 | same |
| **charcoal × light** | `color(srgb 0.984314 0.976471 0.956863 / 0.97)` | **`#FBF9F4`** @ .97 | same |
| **charcoal × dark** | `color(srgb 0.117647 0.117647 0.113725 / 0.97)` | **`#1E1E1D`** @ .97 | **`rgb(62,62,57) 0 0 0 1px, rgba(0,0,0,0.55) 0 16px 40px`** |

Both charcoal values are exactly what the plan predicted. The charcoal-dark shadow is Rule C-5's
hairline ring, which the old hardcoded `0 16px 48px rgba(0,0,0,.18)` did not have and which is
invisible against `#161616`.

The danger tone's wash, also measured, in the two brands:

| cell | chip background | `--red-bg` | chip ink |
|---|---|---|---|
| default × light | `rgb(244, 224, 221)` | `#f4e0dd` | `rgb(184, 70, 63)` |
| charcoal × dark | `rgb(46, 26, 24)` | `#2e1a18` | `rgb(240, 164, 160)` |

The two cells **disagree**, which is the entire difference between a token and a literal — the
hardcoded `rgba(239,68,68,.1)` painted the same wash in every brand and every mode. Neither value
matches `239,68,68`, asserted.

One caveat for whoever writes a probe next: Chromium reports a `color-mix()` result as
`color(srgb …)`, not `rgba(…)`. The paint is identical; the computed **string** is not. Anything
matching `getComputedStyle` output against `rgba(255, 255, 255, 0.97)` will now miss.

### The supersession, recorded in three places

The sibling's `.planning/PROJECT.md` still says *"ConfirmDialog is always-light glass surface
(rgba(255,255,255,.97)) — not token-driven internally"* (CONSTRAINT-010). Per protocol §6 that file was
**not edited**. The counter-record lives where the next reader will actually be:

1. `src/overlays/ConfirmDialog/index.tsx`, where the `panelStyle` object used to be — a comment that
   names the constraint, quotes it, and says why a second brand invalidates it.
2. The `DS atom: ConfirmDialog` banner in `primitives.css`, which therefore ships inside
   `dist/css/confirmdialog.css` and reaches consumers.
3. `ConfirmDialog.test.tsx`, as an executable assertion (`records the superseded always-light-glass
   decision in the source`) — so deleting the note fails the build.

A fourth place, worth noting because it was asserting the superseded decision as intent: the
`ConfirmDialog` Storybook **meta description** said *"Always-light glass surface
(rgba(255,255,255,.97)) regardless of dark mode"*, and the `DarkMode` story was **named**
`"Dark Mode (panel stays light)"`. Both rewritten. The story's export name is unchanged, so its story
id and its baseline filename are unchanged.

---

## Verification

| Plan verification item | Result |
|---|---|
| `npx vitest run src/overlays src/data-display/Tabs src/smoke.test.tsx` passes all fourteen behaviours | **PASS** — all 14 have named cases, plus 6 added under Rule 2 |
| SSR byte assertions in **both** directions | **PASS** — `0 B` default and `> 0 B` inline for all four, each also asserting the body content is present so bytes cannot be an empty wrapper |
| `dist/css/confirmdialog.css` exists and contains `.ds-atom-confirm-panel` | **PASS** — 3,430 B, new sheet, `76 files, round-trip byte-exact` |
| The panel's charcoal-dark background confirmed by `probeComputed` | **PASS** — `#1E1E1D` @ .97, and asserted `< 128` so it cannot be the old near-white |
| `__dismissStackSize()` returns to zero after a `closable={false}` Modal unmounts | **PASS** — and asserted to be **1** while open, which is what distinguishes register-and-ignore from decline-to-register (NC-3) |
| `npm run test:a11y` clean on ConfirmDialog, Modal and Tabs stories | **PASS** — **493/493**, 82 suites, exit 0. And for the first time the Modal and ConfirmDialog runs actually contain a dialog |
| Visual baselines reviewed, not blanket-updated | **PASS** — 489 captured, **0 pixel mismatches**, 12 missing-baseline errors only. No existing baseline moved |
| All four sibling gates pass | **PASS** — `npm test` **1725/1725** in 116 files; `npm run check` clean (354 files); `npm run typecheck` clean (both projects); `npm run css:check` **76 files**, byte-exact |
| `npm run build` green and the fix survives into `dist/` | **PASS** — exit 0; `npm test` re-run after the build with **0 skipped suites**, so `packaging.test.ts` genuinely ran against the fresh `dist/` |

### Two things the gates caught that the test runner could not

1. **`npm run typecheck` caught a type error on a fully green vitest run.** My smoke fixture passed
   `{ fieldId: "e", message: "Required" }` to `FormErrorSummary`, whose entry type is
   `string | { message: string; href?: string }`. Vitest was green — the extra key is ignored at
   runtime — and `tsc` reported `TS2353`. Same shape as 01-15's Playwright-green/typecheck-red, one
   runner over.
2. **`src/tokens.test.ts` reads comments, and failed twice on the same comment.** It scans `src` for
   the var-reference syntax and requires every name to be declared in the base token layer. A comment
   explaining that the amber tints collapse to `--ochre` wrote the reference syntax and failed for
   `--ochre` (charcoal-only). The reworded comment *explaining that failure* used a placeholder — and
   failed for that placeholder. Both fixed by writing token names bare. Protocol §7's "comments are
   matched too" in a gate the protocol does not list.

### `<human-check>` — outstanding

The plan's human check is genuinely human-only and was **not performed**; no browser was driven by
hand. What exists in its place is stronger than usual and is not a substitute for the visual judgement
being asked for:

- **The charcoal-dark panel:** the computed background is measured at `#1E1E1D` @ .97 with the Rule C-5
  hairline ring, in the real cell, by `confirm-panel.spec.ts`. What is **not** verified is whether it
  *looks* like a charcoal surface with a hairline edge rather than a hole.
- **The `closable={false}` Modal:** all three exits are asserted dead in jsdom, and Escape is asserted
  swallowed rather than leaked. What is **not** verified is that the dialog *visibly contains its own
  way out* — the story ships a "Sign out" and a "Sign in again" button in the footer precisely so that
  it does, and that judgement is the human's.

Open `overlays-confirmdialog--inline-panel` with Brand = charcoal, Theme = dark, and
`overlays-modal--not-closable`. **01-15's VoiceOver check on the Sortable announcer is also still
outstanding.**

---

## Storybook baselines 01-20 must record — the measured list is now **TWELVE**

01-15 measured ten. This plan adds two, measured by running the suite rather than counted from
SUMMARYs (`captured 489`, up from 487):

| Story id | Owed by | Introduced in |
|---|---|---|
| `overlays-lightbox--responsive-gallery` | 01-11 (flagged), story from 01-07 | `c198985` |
| `patterns-formvalidation--field-required-marker` | 01-11 | `e24f865` |
| `patterns-formvalidation--field-error-severity` | 01-11 | `e24f865` |
| `patterns-formvalidation--anchored-error-summary` | 01-11 | `e24f865` |
| `layout-appbar--anchor-navigation` | 01-12 | `82a61f9`…`ae3d50c` |
| `layout-footer--compact-with-links` | 01-12 | `ae3d50c` |
| `layout-appshell--with-banner` | 01-13 | `3f69b6d` |
| `layout-appshell--with-banner-and-footer` | 01-13 | `3f69b6d` |
| `data-display-datagrid--compact-unselectable` | 01-14 | `4230b9a` |
| `interaction-sortable--announced-reorder` | 01-15 | `b416fbd` |
| **`overlays-confirmdialog--inline-panel`** | **01-16** | `e80b914` |
| **`overlays-modal--not-closable`** | **01-16** | `e80b914` |

Both of mine render a dialog **open and inline**, which is the point: they are the only two stories in
this library whose baseline contains a dialog panel at all, and the only two axe can scan. They are
cheap and stable — no animation (the suite freezes it anyway), no clock, no network.

**No existing baseline moved — measured:**

```
visual baselines: captured 489, skipped 4 time-dependent
12 x  "A snapshot doesn't exist at …, writing actual."
 0 x  pixel-mismatch failures
```

Zero comparison failures across all 489, **including all 8 Tabs baselines** (rendering three panels'
children instead of one changes no pixels, because `hidden` is `display: none`), **all 6 ConfirmDialog
baselines** and **all 9 Modal/Sheet baselines**. Two reasons the ConfirmDialog change moved nothing:
`color-mix(in srgb, var(--panel) 97%, transparent)` reproduces `rgba(255,255,255,.97)` byte-for-byte in
the default brand's light cell, and every pre-existing ConfirmDialog story renders **closed** anyway.

**The run wrote the 12 missing PNGs** (Playwright writes on first miss and fails once). All 12 were
removed **by explicit path**, each checked against `git ls-files --error-unmatch` first so a tracked
file could not be deleted by mistake. **No `git clean`.** The snapshot directory is `diff`-clean against
its pre-run inventory — **488 files before, 500 during, 488 after, identical file lists**.

---

## CHANGELOG wording for 01-20

Not written here: `01-20-PLAN.md` owns `CHANGELOG.md` and this plan's `files_modified` does not list it.

**This change is additive — there is no `BREAKING CHANGE:` footer on any of the three commits**, and
the four that already exist for v2.0.0 are unaffected. Two changes are *behavioural* without being
API-breaking and both are called out below, because a consumer could notice them:

```markdown
- **Overlays can server-render: `inline` on `Modal`, `Sheet`, `ConfirmDialog` and
  `TypeToConfirm`.** All four mount through `DSPortal`, which returns `null` until a
  mount effect runs — so `react-dom/server` produced **0 bytes** for every dialog in
  the library. No dialog existed for a crawler or a reader without JavaScript.

  ```tsx
  <Modal open inline onClose={close} title="Your session expired">…</Modal>
  ```

  Opt-in, and the default is byte-identical to before: omitting it still portals to
  `document.body` and still server-renders nothing. Reach for it only when the
  overlay's content has to be in the initial HTML — an inline overlay lives in your
  DOM and becomes subject to ancestor `overflow`, `transform` and `z-index`, which is
  exactly the coupling `document.body` was chosen to avoid. An ancestor `transform`
  makes the backdrop's `position: fixed` resolve against that ancestor instead of the
  viewport.

- **`Modal` accepts `closable`.** `closable={false}` suppresses **all three** exits
  together — the header Close button, the Escape key and the backdrop click — and
  overrides `closeOnBackdropClick`. It exists for the one dialog whose purpose is that
  you may not dismiss it: a fail-closed re-auth or an expired session.

  Escape is *swallowed*, not passed through. The layer still takes the top of the
  dismiss stack and ignores the key, so a press cannot close whatever surface is open
  beneath it — a surface the user can neither see behind the scrim nor reach through
  the focus trap.

  **It makes the dialog a keyboard trap by design, so you must put the way out inside
  it.** An undismissable dialog with no action in it is an accessibility failure, not a
  security feature. See `Modal.stories.tsx` → "Not closable (fail-closed re-auth)".

- **`ConfirmDialog`'s panel is now token-driven, and follows the brand and the colour
  mode.** It was an always-light hardcoded `rgba(255,255,255,.97)` applied as an inline
  style, with no rule in any stylesheet, so no theme could reach it. The panel is now
  painted by `.ds-atom-confirm-panel`, shipped as the new
  `@akhil-saxena/design-system/css/confirmdialog`, at 97% of `--panel` plus the same
  14px blur — which reproduces the old colour exactly in the default brand's light
  mode and gives you a real surface everywhere else. All four tone washes resolve
  through tokens too.

  **Two things to know.** In **dark** mode the panel is now dark; if you relied on it
  staying light, that was the bug. And because the split is by component and
  `ConfirmDialog` reuses `Modal`'s backdrop rule, import **both** sheets:

  ```ts
  import "@akhil-saxena/design-system/css/confirmdialog";
  import "@akhil-saxena/design-system/css/modal";
  ```

- **`Tabs` server-renders every panel's content.** Inactive panels used to render as an
  empty `<div role="tabpanel" hidden>` — the element without the children — so in
  server-rendered HTML no tab panel but the first existed. Every panel's children now
  render and the inactive ones are hidden with the `hidden` attribute, which keeps them
  out of the accessibility tree and the tab order exactly as the WAI-ARIA tabs pattern
  requires.

  **The cost is real and deliberate:** every panel's subtree now mounts on load, so a
  heavy component behind tab 3 pays its mount cost immediately. No lazy/eager prop was
  added. If a panel is expensive, gate it inside your own component.
```

---

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **67 story files hardcode a scoped `className="dark"` decorator, and under charcoal every one of
   them measures the wrong colours. This is the most important thing in this section, and it lands on
   01-20.** `tokens.css` declares its dark block as `:root.dark, .dark` — a bare class selector — so a
   scoped `.dark` wrapper **re-declares all ~50 neutral dark tokens for its subtree**. `charcoal.css`
   declares only `:root[data-brand="charcoal"]` and `:root[data-brand="charcoal"].dark`, which are
   root-scoped and therefore *below* that wrapper in specificity terms of applicability. Anything
   inside such a wrapper resolves the design system's neutrals instead of charcoal's.

   `.storybook/preview.tsx` already knows: its decorator sets `className={isCharcoal ? undefined :
   "dark"}` and its comment records the measurement (`--cream` resolved to `#181818` instead of
   charcoal's `#161616`). But it can only guard **its own** wrapper — it cannot guard 67 per-story
   decorators, one of which is on every `--dark-mode` story in the library.

   **I hit this myself, and the probe caught it.** The first draft of `InlinePanel` copied the existing
   `DarkMode` decorator, and `confirm-panel.spec.ts` read `31,31,31` where charcoal declares
   `30,30,29` — base-dark `--cream-2: #1f1f1f` instead of charcoal's `#1e1e1d`. A screenshot baseline
   would have recorded that silently and compared clean forever, which is the failure
   `control-chrome.spec.ts`'s docstring already records once in this repository.

   **What 01-20 should do:** do not capture a charcoal-dark baseline of any story whose decorator
   hardcodes `className="dark"` without first removing the class from that decorator, or the baseline
   pins the wrong brand. `grep -rl 'className="dark"' src | grep stories` is the list.

2. **`split-css.mjs`'s derived sibling-sheet graph cannot see a reused CSS class.** 01-14 derived each
   sheet's dependencies from the component **import** graph, which is right for `DataGrid → Pagination
   → IconButton`. `ConfirmDialog` renders `.ds-atom-modal-backdrop` but does not import `Modal`, so
   `confirmdialog.css` correctly lists `button`, `field`, `formvalidation`, `kbd`, `link`, `textinput`
   — and **not `modal`**. `import ".../css/confirmdialog"` alone yields a dialog with an unstyled
   backdrop: F-13-3 one level sideways. Recorded in the banner (which ships in the sheet) rather than
   silently. Fixing it properly means deriving edges from class references as well as imports.

3. **`test:a11y` scans no `DSPortal`-portaled content, so every dialog story in the library was being
   scanned without its dialog.** Measured above. Not restructured — changing `checkA11y`'s scope to
   the whole page would attribute Storybook's own chrome to the component, which is why it is scoped.
   The practical fix is what this plan did by accident: an `inline` story per overlay. There are eight
   `DSPortal` consumers and now two such stories.

4. **`Modal` and `ConfirmDialog` do not use `isDarkContext()`, while `Sheet`, `BottomSheet`,
   `HoverCard` and `Popover` do.** So a portaled Modal or ConfirmDialog raised from inside a *scoped*
   dark container renders light. Real dark mode (`<html class="dark">`) is unaffected, which is why
   this is not in scope and why the panel fix verifies correctly. But it means
   `overlays-confirmdialog--dark-mode`'s panel does still render light at light globals — for the
   portal reason, not the hardcoded one — and its name now says so. Adding `isDarkContext()` to both
   would be a behaviour change to two components no finding names.

5. **`Modal`'s Close button click path had no test before this plan.** Ten Modal cases existed, covering
   Escape and the backdrop; the header button — the one thing F-15-2 is about — was never clicked. It is
   now the control case for the whole `closable` group. Worth a look at the other seven overlays' Close
   buttons.

6. **`ConfirmDialog`'s `handleBackdropClick` is an empty function whose body is a comment.**
   `if (e.target !== e.currentTarget) return;` followed by
   `// closeOnBackdropClick=false for all ConfirmDialog tones`. Same in `TypeToConfirm`. It exists only
   to hang a `biome-ignore` on, and the `onClick` could be dropped along with the suppression. Not
   touched — out of scope and harmless — but it is dead code that reads as logic.

7. **Every pre-existing overlay story starts closed, so no visual baseline in this repository has ever
   contained a dialog panel.** That is why F-15-3 — a near-white card on a charcoal page — could not
   have been caught by the 487-baseline suite. This plan's two stories are the first; the other six
   `DSPortal` consumers still have none.

8. **`--red-l` does not exist.** The plan names *"`--red-bg` / `--red-l` … in the allowlist's variant
   list"*. `--red-bg` is real in both modes; there is no `--red-l` in `tokens.css` at all (`--amber-l`
   is, which is probably the source of the pairing). Harmless here because `--red-bg` was the right
   choice, but a plan that reached for `--red-l` would have shipped an undefined token — which
   `src/tokens.test.ts` would have caught, so the gate is doing its job.

9. **`.mjs` files are still outside the pre-commit hook's `lint-staged` glob** — carried forward from
   01-14 finding #2 and 01-15 finding #8, unchanged and still unowned. Not hit by this plan (nothing
   here is `.mjs`; `split-css.mjs` was read, not edited), and recorded so the count of plans that have
   observed it keeps rising.

---

## Deviations from plan

### Auto-fixed / decided without asking

1. **[Rule 1 — plan gate unpassable] Task 2 gate 2 fails on a correct fix.** Repaired to strip
   comments before the absence check, then proven to FAIL pre-plan, FAIL with the inline object
   restored, and PASS on shipped.
2. **[Rule 1 — plan gate undetectable] Task 1 gate 2 passes with only the Close button suppressed.**
   Repaired to count `closable`'s code sites (≥5) and assert the Escape and backdrop expressions
   individually. Proven three ways; NC-2 is the behavioural half.
3. **[Rule 1 — my own gate insufficient] The repaired Task 2 gate let NC-4b through.** Strengthened
   from a `panelStyle` name match to matching any `style={` on the panel element.
4. **[Rule 1 — plan premise wrong] `--g-bg` / `--g-bd` are not redefined by charcoal.** Used the
   raised-surface token as `color-mix(in srgb, var(--panel) 97%, transparent)` instead, which also
   makes the default brand's light cell byte-identical to before.
5. **[Rule 1 — plan premise wrong] `TypeToConfirm` renders its own `DSPortal`.** It got its own
   `inline` prop; three props added, not two. No `TypeToConfirm` directory created.
6. **[Rule 1 — plan premise wrong] The `.ds-atom-confirm-panel` class already existed.** The work was
   deleting the inline object, not adding a class.
7. **[Rule 1 — a shipped test pinned the defect] `ConfirmDialog.test.tsx` asserted
   `panel.style.background` matched `rgba(255,255,255,.97)`,** with the guard comment *"panel must use
   an explicit rgba value — NOT a theme token"*. That is CONSTRAINT-010 in executable form. Replaced
   with its inverse plus three new cases, and the replacement's reasoning is in the test.
8. **[Rule 1 — my own test self-invalidating] The new "rule exists in the sheet" case failed on the
   supersession comment**, which must quote the literal it forbids. Fixed by stripping comments inside
   the test — the same idiom the shell gates use.
9. **[Rule 1 — bug in my own comment, twice] `src/tokens.test.ts` scans comments for token
   references.** Writing the var-reference syntax for `--ochre` (charcoal-only) failed it; the comment
   explaining that failure failed it again for its placeholder. Token names are now written bare.
10. **[Rule 1 — bug in my own test] `new URL("./DSPortal.tsx", import.meta.url)` throws under jsdom**
    (`ERR_INVALID_URL_SCHEME`). Switched to `join(__dirname, …)`, which is what 01-15 used.
11. **[Rule 1 — bug in my own fixture] `FormErrorSummary` takes `{ message, href? }`, not
    `{ fieldId, message }`.** Vitest was green; `tsc` was not.
12. **[Rule 2 — missing critical functionality] `Sheet` skips `isDarkContext()` when inline.** The
    panel never left the consumer's DOM, so re-establishing `.dark` would nest one inside another and
    would read `document` on the client but not the server. Measured: exactly one `.dark` wrapper on
    both passes, even with `<html class="dark">`.
13. **[Rule 2] Escape is swallowed, not leaked.** The plan offered "skip registration **or** register
    and no-op" and asked for a deliberate choice. Registering is the only correct one and NC-3 is the
    measurement: skipping lets Escape close the layer beneath the trap.
14. **[Rule 2] `closable` overrides `closeOnBackdropClick`,** with its own test. The two props can
    disagree, and a fail-closed dialog one default away from dismissable is not fail-closed.
15. **[Rule 2] All four tone washes tokenised, not only the danger one.** Same table, same inline-style
    mechanism, same finding family. The warning tone's gap is reported (finding: no amber tint survives
    charcoal).
16. **[Rule 2] Two stories added, both required by the plan's own `<verification>` section** even
    though `files_modified` omits the story files. The `<human-check>` asks the reader to open a
    `closable={false}` Modal story and a charcoal-dark ConfirmDialog panel; neither existed, and every
    ConfirmDialog story renders closed. Both new stories use `inline`, which is what makes them the
    first dialogs axe scans. **They add 2 baselines to 01-20's debt (10 → 12), stated explicitly.**
17. **[Rule 2] The ConfirmDialog Storybook meta description and the `DarkMode` story name asserted the
    superseded decision as intent.** Both rewritten; the export name is unchanged so no baseline
    filename moves.
18. **[Rule 2] `DSPortal.test.tsx` and `Tabs.test.tsx` were extended** though `files_modified` lists
    neither. The escape hatch's own contract and the client-side half of the panel-exposure contract
    belong beside their components; putting them in `smoke.test.tsx` would have hidden them.
19. **[Rule 2] Degenerate values checked rather than assumed** (the brief's point 4). `inline={false}`
    is asserted byte-identical to omitting the prop, on the server **and** the client, and
    `inline` + `target` is asserted to ignore `target`. Neither throws; neither is a third behaviour.
20. **[Rule 2] The `0 B` assertions each also assert the body content is present with `inline`.**
    Bytes alone could be an empty wrapper.
21. **[Rule 2] The Task 1 gate covers all four deliberately-excluded consumers,** not just `Lightbox`.
22. **[Rule 2] SSR measured in both `node` and `jsdom`** to establish that the byte counts are not an
    artefact of jsdom's `document`. Identical in both, so the committed jsdom-environment test is a
    faithful measurement.
23. **Task boundaries kept.** RED / GREEN / Task 2. Three commits.

### Deferred (explicitly, with reasoning)

- **`@layer` (D-28), the `data-density` axis (D-32 / G-2), and the `F-15-7` control-geometry floors** —
  protocol §9, Phase 06.1. The panel's `width: 360px`, `border-radius: 14px`, `padding: 22px` and
  `blur(14px)` were moved into the rule **verbatim** rather than tokenised, for exactly this reason:
  they carry no theme meaning and changing them would be an unmeasured visual change no finding asked
  for.
- **`Badge` emitting no class (F-15-4)** — 01-18's, as the plan says.
- **dnd-kit's live regions absent from SSR (G-13)** — dnd-kit's code, not this library's.
- **`Lightbox` gets no `closable` and no `inline`** — 01-07 owns it and a fail-closed image viewer is
  not a thing. Recorded as the plan asked, and asserted by gate.
- **A lazy/eager prop on `Tabs`** — a new API decision no finding asked for. The mount cost is
  documented in the component and in the changelog wording instead.
- **`isDarkContext()` on `Modal` / `ConfirmDialog`** — finding 4.
- **`CHANGELOG.md`** — 01-20's. Wording above; **no `BREAKING CHANGE:` footer**.
- **VoiceOver / NVDA on the Sortable announcer** — 01-15's outstanding human check, still outstanding.

### Rule 4 (architectural) — none raised

Nothing required a structural change. `DSPortal`'s default path, `useDismiss`'s stack, `useFocusTrap`,
`useScrollLock`, `Tabs`' ResizeObserver overflow algorithm and roving-tabindex model, and
`ConfirmDialog`'s form-submit confirm path are all byte-identical to their pre-plan form. The edits are
one branch in `DSPortal`, one attribute and one ternary each in four overlays, one deletion in
`ConfirmDialog`, one conditional removed in `Tabs`, and one new CSS section.

---

## Self-Check: PASSED

```
FOUND: src/_internals/DSPortal.tsx                     FOUND: 9cb8fc4
FOUND: src/_internals/DSPortal.test.tsx                FOUND: 3f18ca1
FOUND: src/overlays/Modal/index.tsx                    FOUND: e80b914
FOUND: src/overlays/Modal/Modal.test.tsx
FOUND: src/overlays/Modal/Modal.stories.tsx
FOUND: src/overlays/ConfirmDialog/index.tsx
FOUND: src/overlays/ConfirmDialog/ConfirmDialog.test.tsx
FOUND: src/overlays/ConfirmDialog/ConfirmDialog.stories.tsx
FOUND: src/overlays/Sheet/index.tsx
FOUND: src/data-display/Tabs/index.tsx
FOUND: src/data-display/Tabs/Tabs.test.tsx
FOUND: src/primitives.css
FOUND: src/smoke.test.tsx
FOUND: tests/visual/confirm-panel.spec.ts
FOUND: dist/css/confirmdialog.css  (3430 B, .ds-atom-confirm-panel + .dark override)
ABSENT (correctly): src/tmp-*.test.tsx, tests/visual/tmp-*.spec.ts
ABSENT (correctly): src/overlays/TypeToConfirm/  — never created
tests/visual/storybook.spec.ts-snapshots: 488 files, diff-clean against pre-run inventory
restored files match the shipped snapshot:
  DSPortal.tsx 129b3929…  Modal/index.tsx 4a9cdcdc…
  ConfirmDialog/index.tsx 2f2de8e5…  Tabs/index.tsx 625b94a1…
gates: npm test 1725/1725 · npm run check clean (354) · npm run typecheck clean · css:check 76 byte-exact
test:a11y 493/493 exit 0 · visual 489 captured, 0 mismatches · repaired gate-t1 exit 0 · repaired gate-t2 exit 0
$DS working tree: tracked-clean; git stash list: empty; charcoal-theme +43
```
