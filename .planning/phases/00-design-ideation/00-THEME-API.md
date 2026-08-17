---
phase: 0
slug: design-ideation
consumers: [phase-1, phase-06.1]
status: decided
---

# Charcoal Theme — Public API (DSGN-05)

## What this document is

The charcoal theme's public API, decided in writing: how it scopes, how it composes with
`:root.dark`, how fonts are delivered, what a brand theme may and may not redefine, how it is
packaged and versioned, and what tests Phase 1 inherits.

DSGN-05's wording is *"decided in writing"*, and RESEARCH's Architectural Responsibility Map
puts the written spec in the primary tier for token values and contrast, because numbers must
be reviewable as text before anyone implements them. This is Phase 1's direct input for
**DS-01 through DS-09**.

**It is deliberately self-contained.** Phase 0 measured everything below in a throwaway
`.playground/` harness that is deleted at phase exit. A Phase 1 implementer works in
`../design-system` with no access to that directory, so every number Phase 1 needs is written
inline here rather than referenced by a path into a deleted tree. Where the playground is
named at all, it is named as historical provenance — *where this number came from* — never as
a place to go and read one.

**Provenance rule.** Every claim below is a measurement taken in Phase 0 (plans 01, 04 and
07) or a decision recorded in `00-CONTEXT.md`. Where a Phase 0 measurement contradicts an
earlier document, **the measurement wins and the contradiction is stated out loud** rather
than quietly corrected — there are three such corrections in this file (PROJECT.md's contrast
table, D-30's variable-font premise, and research's split-CSS byte figures), and each is
called by name so a future reader does not re-import the error.

**Findings are cited by ID, never restated.** `00-FINDINGS.md` is the authority for the gap
register. If a gap's wording changes there, this document must not need editing.

---

## Cascade and scoping

### The decision (D-27)

Charcoal scopes with **explicit compound selectors**:

```css
:root[data-brand="charcoal"]      { /* light block */ }
:root[data-brand="charcoal"].dark { /* dark block  */ }
```

No scoped non-root form (`.charcoal` on a subtree) is required. D-07 established that this
site has no nesting case — there is never a charcoal region inside a non-charcoal page.

### The specificity arithmetic

| Selector | Specificity | Where it comes from |
|----------|-------------|---------------------|
| `:root` | **(0,1,0)** | `tokens.css` light block |
| `.dark` | **(0,1,0)** | `tokens.css` dark block — *second* selector in the list |
| `:root.dark` | **(0,2,0)** | `tokens.css` dark block — *first* selector in the list |
| `:root[data-brand="charcoal"]` | **(0,2,0)** | charcoal light |
| `:root[data-brand="charcoal"].dark` | **(0,3,0)** | charcoal dark |

`tokens.css` declares its dark block as the **selector list** `:root.dark, .dark { … }`, and
each selector in a list carries its own specificity independently. Two consequences:

1. Charcoal light at (0,2,0) beats the bare `.dark` at (0,1,0) **unconditionally**, and beats
   `:root` at (0,1,0) unconditionally.
2. Charcoal light **ties** `:root.dark` at (0,2,0). A tie is resolved by source order, which
   is the hazard the next section exists to remove.
3. Charcoal dark at (0,3,0) outranks `:root.dark`'s (0,2,0) **by arithmetic rather than by
   source order**. This is the property that makes D-27 work at all.

### Why compound selectors and not cascade layers, honestly

The reasoning is worth recording accurately, because Claude's first argument for this was
wrong and the record should say so.

The initial case leaned on **consumer-breakage risk**. That was overweighted: there are
exactly two consumers, the portfolio and Cairn, and both are Akhil's. Both candidate options
were upstream design-system changes, so the project's Core Value did not discriminate between
them either — neither was a workaround.

**The actual deciding factor is release attribution.** Phase 1 already carries the font split
(D-29/DS-04) and the contrast fixes (DS-02/DS-03), both of which change what every page looks
like. Adding a global cascade-layer migration to the same release means a visual regression
has three plausible causes and no clean bisect. Keeping the layers migration out of Phase 1
keeps a regression attributable.

### Cascade layers happen — as their own release (D-28)

`@layer` is **not cancelled, it is sequenced.** It ships as its own design-system release
*after* Phase 1, verified independently against the existing Playwright snapshots, and it
carries the `data-density` axis (D-32) with it — density is the fourth cascade axis
(brand × mode × density) and supplies the concrete justification the layers release otherwise
lacked.

**Owner: Phase 06.1 — "Design System — Cascade Layers & Density Axis"**, tracked as **DS-10**
(layer order) and **DS-11** (density axis). `00-FINDINGS.md` gap **G-2** is tiered
`blocks-Phase-06.1` and belongs to that phase, not to Phase 1.

**The deferral is now backed by measurement, not by preference.** Plan 07's cascade probe ran
the entire matrix — 17 tokens × 4 constructed import orders × 2 colour modes, under both
`inlineStylesheets` settings — with **no cascade layers and no `!important` anywhere**, and
every assertion was green. Compound selectors plus the exhaustiveness invariant are
*sufficient* today. D-28 is therefore a measured "not needed yet" rather than an unexamined
postponement.

---

## The exhaustiveness invariant

This is the load-bearing rule of the whole theme. D-27's arithmetic is correct and is **not
sufficient on its own**.

### The rule, stated so a test can check it

> **`:root[data-brand="charcoal"].dark` MUST declare every custom property that
> `:root[data-brand="charcoal"]` declares.** Same count, same names. No exceptions —
> including tokens whose value is identical in both modes, and tokens that are pure `var()`
> aliases.

### The measurement that makes it load-bearing rather than stylistic

A charcoal token declared in the light block and **not restated** in the dark block resolves
at (0,2,0) in dark mode — which **ties** `:root.dark`, also (0,2,0). The winner is then
decided by whichever stylesheet the bundler emitted last. Measured across deliberately
constructed import orders, one omission produces **two different wrong answers**:

| Emitted order | What happens in dark mode |
|---------------|---------------------------|
| charcoal **after** tokens | charcoal's **light** value applies in dark mode |
| charcoal **before** tokens | `:root.dark` wins the tie and **charcoal is dropped entirely** |

Plan 07 reproduced exactly this on demand as a negative control: deleting the single `--wire`
declaration from the charcoal dark block made two of four probe variants render the charcoal
**light** wire `#878173` in dark mode, and the other two fall through to the design system's
neutral `rgba(255,255,255,0.22)` → `#ffffff38`. Restoring the line returned the file to a
byte-identical SHA-256 and the probe to exit 0.

### Why light mode never breaks — and why that is the dangerous part

`:root[data-brand="charcoal"]` at (0,2,0) beats `:root` at (0,1,0) unconditionally, so the
**light** mode of a non-exhaustive theme is always correct. The bug is invisible in the mode a
developer is most likely to be looking at while authoring tokens, and it only appears in dark
mode, only for the tokens that happen to be missing, and only in one of the two possible
bundler orderings. **That is exactly how this class of bug ships unnoticed.**

### The consequence

With the invariant held, every charcoal token resolves at (0,3,0) in dark mode and there is no
tie left to lose. The cascade becomes **order-independent by construction** — with:

- **no dependence on `@layer`** (deferred to Phase 06.1, D-28), and
- **no dependence on the D-33 manifest's import order.**

### The evidence that it holds

Plan 04 authored the theme exhaustively — **37 of 37 properties restated**, in both
directions — and plan 07 probed it:

> **17 tokens × 4 constructed import orders × 2 colour modes = 8 cells, 136 assertions green
> per run**, run twice (`INLINE_CSS=auto` and `INLINE_CSS=never`) for **272 green assertions**.
> Every cell identical, and every value equal to what the charcoal stylesheet declares for
> that mode.

The two anchor tokens: `--cream` resolves **`#161616`** dark / **`#f4f1ea`** light in all four
orders, and `--ochre-d-strong` resolves **`#d4a66d`** / **`#6b4417`**.

The second assertion — *every value equals the declared value*, not merely *all four variants
agree* — is the one that matters. Cross-variant agreement alone would also pass if
`data-brand` were misspelled on all four pages, or if the theme sheet stopped being imported
at all: everything would agree on the design system's neutral values and the probe would go
green while measuring nothing.

**This is where research measured a failure and Phase 0 measures a pass, and the difference is
the invariant, not luck.** Research probed a deliberately non-exhaustive prototype and watched
`--cream` break in *both* orderings. Plan 04 also recorded that this stack's **default**
emitted order is the hazardous one — Astro links the design system's `:root.dark, .dark` chunk
*before* the charcoal chunk — so the probe passes against a live hazard, not a benign
configuration.

### Two independent reasons the invariant is the right mechanism

1. **Bundler order is not stable in principle.** Astro sorts imported styles by accumulated
   import index and module-graph depth; swapping two adjacent `import` statements flips the
   emitted order every time.
2. **An import sorter can flip a cascade tie.** Plan 07 found that an island's CSS is **not**
   privileged into a late position by being an island — its cascade position is decided by
   where the *component's* `import` statement sits in the page. Moving one `import` line above
   another flipped the emitted order (measured both ways). **A lint autofix or an import
   sorter can therefore silently change which stylesheet wins a tie**, and exhaustiveness is
   the only thing that makes the result insensitive to a reformat.

---

## Token contract

This section **is** Phase 1's DS-01/DS-02/DS-03 implementation target. It is complete enough
to work from with no other artefact.

### The method rule — read this before the tables

> **Contrast is measured against all three surfaces of a mode — page, card (paper) and panel —
> never against the page alone.**

This is D-47's method rule and it is not a stylistic preference. Every ratio in PROJECT.md's
contrast table was page-only, and that is precisely why both of its errors survived there
undetected (see *PROJECT.md is wrong in two places*, below).

Every ratio in the two tables below was computed by plan 04's contrast check, which **ports**
the design system's own `srgb` / `luminance` / `contrast` / `resolve` helpers out of
`tokens.test.ts` rather than hand-rolling a second WCAG formula. **54 ratios, and all 54
reproduce UI-SPEC's tables to two decimal places.**

The bars: **AA = ≥ 4.5:1** for body text · **≥ 3:1** for non-text (WCAG SC 1.4.11) ·
**AAA = ≥ 7:1** where the targeted-AAA policy applies (D-46).

**Targeted AAA is ADOPTED, not contingent** (D-46). Two narrow changes: `--ink-3` / `--ink-4`
move to AAA in both modes, unconditionally, because muted text is the single largest
legibility risk in the admin (zebra rows, disabled fields, help text) and darkening it costs
nothing stylistically; and a **new** `--ochre-d-strong` covers small accent labels only.
`--ochre-d` is **unchanged** and continues to feed `--focus`. Everything else stays at AA.
Full AAA was considered and rejected: at 7:1 against a near-white `#F4F1EA` page, no hue in
the orange/amber family stays recognisably ochre, and losing the accent costs the identity the
whole rebuild is organised around.

### `:root[data-brand="charcoal"]` — LIGHT block, specificity (0,2,0)

Surfaces: page `#F4F1EA` · paper `#FBF9F4` · panel `#EDE9E0`.

| Token | Value | vs page | vs paper | vs panel |
|-------|-------|--------:|---------:|---------:|
| `--ink` | `#1A1815` | 15.71 ✅ | 16.84 ✅ | 14.62 ✅ |
| `--ink-2` | `#44403A` | 9.12 ✅ | 9.78 ✅ | 8.50 ✅ |
| **`--ink-3`** *(AAA)* | **`#4F4C42`** | **7.61 ✅ AAA** | **8.16 ✅ AAA** | **7.09 ✅ AAA** |
| `--ink-4` | alias → `var(--ink-3)` | 7.61 | 8.16 | 7.09 |
| `--ink-5` *(decorative only)* | `#8D8779` | 3.17 | 3.40 | 2.95 |
| `--ink-inverse` *(on filled accent)* | `#161616` | — | — | — |
| `--cream` *(page)* | `#F4F1EA` | — | — | — |
| `--page-bg` | alias → `var(--cream)` | — | — | — |
| `--cream-2` *(paper / raised)* | `#FBF9F4` | — | — | — |
| `--paper` | alias → `var(--cream-2)` | — | — | — |
| `--cream-3` *(panel / inset)* | `#EDE9E0` | — | — | — |
| `--panel2` | alias → `var(--cream-3)` | — | — | — |
| `--ochre` **(fill only)** | `#B0722A` | 3.52 ❌ as text | — | — |
| **`--ochre-d`** *(accent text + focus)* | **`#8C591F`** | **5.22 ✅ AA** | 5.60 ✅ AA | **4.86 ✅ AA** |
| **`--ochre-d-strong`** *(AAA — small accent labels only)* | **`#6B4417`** | **7.55 ✅ AAA** | **8.10 ✅ AAA** | **7.03 ✅ AAA** |
| `--wire` *(control border, 3:1 bar)* | **`#878173`** | 3.44 ✅ | 3.68 ✅ | **3.20 ✅** |
| `--rule` *(decorative hairline)* | `#D5CFC2` | 1.38 (decor) | 1.47 | 1.28 |
| `--rule-strong` | `#C4BDAD` | 1.66 (decor) | — | — |
| `--rule-s` | alias → `var(--rule-strong)` | — | — | — |
| `--focus` *(3:1 non-text bar)* | `var(--ochre-d)` — **not** `-strong` | 5.22 | 5.60 | 4.86 |
| `--shadow-1` / `--shadow-2` / `--shadow-3` | the design system's black-alpha values, **restated verbatim** | — | — | — |

### `:root[data-brand="charcoal"].dark` — DARK block, specificity (0,3,0)

Surfaces: page `#161616` · paper `#1E1E1D` · panel `#242423`.

| Token | Value | vs page | vs paper | vs panel |
|-------|-------|--------:|---------:|---------:|
| `--ink` | `#EAE7E0` | 14.65 ✅ | 13.51 ✅ | 12.58 ✅ |
| `--ink-2` | `#C9C5BC` | 10.51 ✅ | 9.69 ✅ | 9.02 ✅ |
| **`--ink-3`** *(AAA)* | **`#B1AEA8`** | **8.18 ✅ AAA** | **7.54 ✅ AAA** | **7.02 ✅ AAA** |
| `--ink-4` | alias → `var(--ink-3)` | 8.18 | 7.54 | 7.02 |
| `--ink-5` *(decorative only)* | `#6E6E66` | 3.52 | 3.25 | 3.02 |
| `--ink-inverse` *(on filled accent)* | `#161616` | — | — | — |
| `--cream` *(page)* | `#161616` | — | — | — |
| `--page-bg` | alias → `var(--cream)` | — | — | — |
| `--cream-2` *(paper / raised)* | `#1E1E1D` | — | — | — |
| `--paper` | alias → `var(--cream-2)` | — | — | — |
| `--cream-3` *(panel / inset)* | `#242423` | — | — | — |
| `--panel2` | alias → `var(--cream-3)` | — | — | — |
| `--ochre` **(fill only)** | `#B0722A` | 4.56 ✅ page | **4.20 ❌** | **3.91 ❌** |
| **`--ochre-d`** *(accent text + focus)* | **`#C6883A`** | **6.02 ✅ AA** | 5.55 ✅ AA | 5.17 ✅ AA |
| **`--ochre-d-strong`** *(AAA — small accent labels only)* | **`#D4A66D`** | **8.16 ✅ AAA** | **7.53 ✅ AAA** | **7.01 ✅ AAA** |
| `--wire` *(control border, 3:1 bar)* | **`#727268`** | 3.72 ✅ | 3.43 ✅ | **3.20 ✅** |
| `--rule` *(decorative hairline)* | `#33332F` | 1.43 (decor) | 1.32 | 1.22 |
| `--rule-strong` | `#3E3E39` | 1.68 (decor) | — | — |
| `--rule-s` | alias → `var(--rule-strong)` | — | — | — |
| `--focus` *(3:1 non-text bar)* | `var(--ochre-d)` — **not** `-strong` | 6.02 | 5.55 | 5.17 |
| `--shadow-1` / `--shadow-2` / `--shadow-3` | see **Rule C-5** — surface + hairline, not black alpha | — | — | — |

**The binding constraint in both modes is the panel** (`--cream-3`) — the surface a page-only
measurement never sees. The tightest measured values in the whole set:

| Tier | Tokens | Tightest measured |
|------|--------|-------------------|
| **7:1 AAA** | `--ink-3`, `--ink-4`, `--ochre-d-strong` | **7.01** — dark `--ochre-d-strong` on panel |
| **4.5:1 AA** | `--ink`, `--ink-2`, `--ochre-d` | **4.86** — light `--ochre-d` on panel |
| **3:1 SC 1.4.11** | `--wire`, `--focus` | **3.20** — `--wire` on panel, both modes |

**Destructive is inherited, not redefined.** `#B8463F` (the design system's `--red`) serves
destructive actions in both modes and is not part of the charcoal contract.

### Typography tokens (theme-owned — see *Ownership boundary*)

| Token | Value | Role |
|-------|-------|------|
| `--font-serif` | `"Playfair Display Variable", "Playfair Display", Georgia, serif` | Display, headings, editorial italics, project names |
| `--serif` / `--font-display` / `--display` | aliases resolving through `--font-serif` | same |
| `--font-body` | `"DM Sans Variable", "DM Sans", system-ui, sans-serif` | All UI text, body copy, form labels and values |
| `--font` | alias → `var(--font-body)` | same |
| `--font-mono` | `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace` | Eyebrows, metadata, counters, status labels, metrics |
| `--mono` | alias → `var(--font-mono)` | same |
| `--weight-regular` | `400` | Body copy, Playfair display ≥ 40px, mono metadata |
| `--weight-medium` | `500` | Nav links, form labels, mono eyebrows and metrics |
| `--weight-semibold` | `600` | DS component internals (buttons, tabs). **Not used in authored copy.** |
| `--weight-bold` | `700` | Playfair below 40px, project names, logo, card titles |
| `--weight-extrabold` | **alias → 700** | Retired for charcoal |
| `--weight-black` | **alias → 700** | Retired for charcoal |

800 and 900 have no place in an editorial serif identity and both families would synthesise or
clamp them, so they alias to 700. **They are still declared** — retiring by omission is
exactly the failure the exhaustiveness invariant exists to catch. `--weight-semibold` cannot
be retired because DS primitives reference it internally and DM Sans Variable renders it
correctly.

### The 37

`check-theme-exhaustive.mjs` measured **37 properties declared in the light block and 37
restated in the dark block**, in both directions. The enumeration above — 23 colour
properties plus 14 typography properties — sums to 37 and is reconstructed from UI-SPEC's
tables plus plan 04's recorded alias decisions. **The count is measured; the mapping of names
onto it is a reconstruction**, so Phase 1 should treat any discrepancy as a bug in this list
rather than in the count.

Aliases are declared as `var()` references rather than duplicated literals — the design
system's own pattern — and **the invariant binds an alias exactly as it binds a value.**

`check-font-names.mjs` separately resolved **16 type tokens** through their `var()` aliases;
its negative control is instructive and is recorded under *Font delivery*.

### Six colour rules that fall out of the measurements

**Rule C-1 — `--ochre` is a fill; `--ochre-d` is text.**
PROJECT.md records the dark palette as "clean" because `#B0722A` measures 4.56:1 on `#161616`.
That is true **on the page only**. On a raised card (`#1E1E1D`) it is **4.20**:1 and on an
inset panel (`#242423`) **3.91**:1 — both fail AA. Work's project cards, the case-study
screenshots and the entire admin sit on raised surfaces, so *"dark mode is already clean"*
does not survive contact with elevation.
→ **All ochre *text* uses `--ochre-d` or `--ochre-d-strong` in both modes. `--ochre` is
reserved for filled surfaces and decorative strokes.**
This is asserted **directionally** by plan 04's contrast check — the check requires
`#B0722A` to *fail* on 2 of 3 dark surfaces — so quietly darkening `--ochre` to make a lint
pass now breaks the build.

**Rule C-2 — filled-accent ink flips between the two ochres.**

| Fill | Ink `#161616` | Ink `#F4F1EA` |
|------|---------------|---------------|
| `--ochre` `#B0722A` (both modes) | **4.56 ✅** | 3.52 ❌ |
| light `--ochre-d` `#8C591F` | 3.07 ❌ | **5.22 ✅** |
| dark `--ochre-d` `#C6883A` | **6.02 ✅** | — |

So `--ink-inverse` is `#161616` for `--ochre` fills in **both** modes, and the light-mode
`--ochre-d` fill is the one surface that needs cream ink. **The handoff is wrong here in both
themes** — it specifies the hued icon as `#B0722A` with a white `h` (3.97:1) and Work's icon
squares as `color: #FFF`.

**Rule C-3 — `--wire` and `--rule` are different tokens with different jobs.**
The handoff gives one border colour per theme (`#D5CFC2` light / `#33332F` dark), both around
1.3–1.4:1. Fine for a decorative hairline, **illegal as the sole boundary of an interactive
control** (SC 1.4.11 needs 3:1) — and the admin is nothing but interactive controls in light
mode. The rule:

> **If the border is the only thing telling you where a control starts, it is `--wire`.**
> If a fill or a heading already does that job, it is `--rule`.

`--wire` clears 3:1 on all three surfaces of its mode in both modes (tightest: **3.20** on the
panel).

**Rule C-4 — muted text goes to AAA, and PROJECT.md's proposed value clears neither bar.**
PROJECT.md proposes `~#6E6A5E`. Measured: **4.79** on the page ✅ AA, **5.14** on paper ✅ AA,
**4.46** on an inset panel ❌ — it fails AA outright on precisely the surface where admin table
zebra, disabled fields and the pending dashboard put muted text, and it is far from AAA
anywhere. An AA-only fix would have been `#6A6659` (5.09 / 5.46 / 4.74).
→ **Targeted AAA supersedes it:** `--ink-3` / `--ink-4` is `#4F4C42` light (7.61 / 8.16 /
**7.09**) and `#B1AEA8` dark (8.18 / 7.54 / **7.02**), clearing 7:1 on the deepest surface of
each mode. PROJECT.md's tilde was doing real work; this is the resolved value.
**The gate is proven to bite:** substituting `#6E6A5E` back in for light `--ink-3` fails 6
assertions at 4.79 / 5.14 / **4.46**.

**Rule C-5 — dark elevation is surface plus hairline, never shadow.**
The design system's `--shadow-1/2/3` are black-alpha (`rgba(0,0,0,.05–.12)`) and are invisible
on `#161616`. `--shadow-*` is a **geometry accent**, which D-31 puts on the *theme* side of the
line, so this is a charcoal-owned fix and not a design-system gap. Charcoal's dark block
restates:

```css
--shadow-1: none;
--shadow-2: 0 0 0 1px var(--rule);
--shadow-3: 0 0 0 1px var(--rule-strong), 0 16px 40px rgba(0, 0, 0, 0.55);
```

`--shadow-3` keeps a real drop shadow because modals and the Lightbox sit over a `--scrim`,
where a black shadow *does* read. Everything below overlay level expresses elevation as
`--cream-2` / `--cream-3` plus a hairline.

**The light block restates the three shadows too**, with the design system's values verbatim
(correct on a cream page). One-directional exhaustiveness would have satisfied *this* theme's
invariant while violating the design system's own `tokens.test.ts` assertion — and a dark-only
property is the exact `--rule-strong` regression that test's comment records. Charcoal is
exhaustive in **both** directions from day one.

**Rule C-6 — the governing rule for the two accent text tokens.**
Two accent tokens with adjacent names will erode into each other within one phase unless the
boundary is a rule rather than a preference. It is:

> **`--ochre-d-strong` is for accent TEXT at or below `--text-xl` (22px) that must clear 7:1.
> `--ochre-d` is for everything else the accent touches.**

| Applies to | Token | Why |
|------------|-------|-----|
| 11px mono Brevo metrics | **`--ochre-d-strong`** | Small text, AAA target |
| 9.5px badge / pill labels | **`--ochre-d-strong`** | Smallest accent text on the site |
| 22px italic serif cross-link | **`--ochre-d-strong`** | See the ambiguous case below |
| 44–60px display period | `--ochre-d` | Already clears AAA-large (4.5:1) at 4.86–6.02 |
| Card hover border | `--ochre-d` | Non-text; SC 1.4.11 governs at 3:1 |
| Focus ring (`--focus`) | `--ochre-d` | Non-text; SC 1.4.11 governs at 3:1 |
| Any filled surface | `--ochre` | Fills are not text; Rule C-2 governs the ink |

**Three prohibitions, so the token cannot drift:**

1. **`--ochre-d-strong` is never a fill.** It is a text colour only. A filled surface uses
   `--ochre` and takes its ink from Rule C-2.
2. **`--ochre-d-strong` is never the focus ring.** `--focus` stays bound to `--ochre-d`.
   Darkening the ring buys nothing — SC 1.4.11 is a 3:1 non-text criterion — and would make
   the indicator muddier against `--wire`.
3. **`--ochre-d-strong` is never display type.** Above 22px the accent is `--ochre-d`; the
   darker value at 44px reads as brown rather than ochre and loses the identity.

**The ambiguous case, called honestly.** WCAG's "large text" threshold is 24px (or 18.66px
bold). The 22px italic serif cross-link sits just below it, so a strict reading requires 7:1
and `--ochre-d` reaches only 5.22 light / 6.02 dark. **Ruling: the cross-link uses
`--ochre-d-strong`** — and this is a judgement, not arithmetic. The arithmetic only says
22 < 24. The judgement is that a 2px shortfall is not worth defending when the alternative
token already exists, costs nothing, and the element is a navigational link — the one class of
accent text where a reader who cannot resolve it loses a route rather than a decoration. If
review finds `#6B4417` too heavy for a 22px italic serif, the fallback is to raise the link to
24px and revert it to `--ochre-d`, resolving the ambiguity by arithmetic instead.

**`--ochre-d-strong` is a new token name, so the invariant binds it from day one** — it is
declared in both blocks. The change is **additive**: no existing token changes its name or its
role, and `--focus` is untouched.

### PROJECT.md is wrong in two places and must not be trusted

Stated plainly here so a Phase 1 reader who opens PROJECT.md's contrast table does not
re-import the error (D-47):

1. *"The dark palette is clean"* is **false**. `--ochre` `#B0722A` is 4.56:1 on the page but
   **4.20**:1 on a card and **3.91**:1 on a panel — it fails AA wherever elevation exists.
2. The proposed `~#6E6A5E` light muted fix is **insufficient** — **4.46**:1 on an inset panel.
   Superseded by `#4F4C42`.

**Both errors have the same root cause: every ratio in PROJECT.md was measured against the
page alone.** That is why the method rule at the top of this section is a rule and not a
suggestion.

### Five design-system surface tokens have no charcoal mapping

Recorded here because it is squarely a *what a brand theme may and may not redefine* question
and it is easy to miss.

UI-SPEC's three-surface model names `--cream` / `--cream-2` / `--cream-3` and aliases
`--page-bg` / `--paper` / `--panel2` onto them. The design system **also** ships `--panel`,
`--bg`, `--pg`, `--paper-warm` and `--paper-deep`, which charcoal leaves at their neutral
values. **A component reaching for `--panel` therefore renders `#1c1c1c` in charcoal dark
instead of `#1E1E1D`.**

Declaring them was out of plan 04's scope — no measured ratios exist for them, and this
phase's rule is measured-not-asserted — but the ownership allowlist below **explicitly
permits** `--panel*`, `--bg` and `--pg`. **Phase 1 must either map all five or state that they
are retired.** Leaving them unmapped is the one outcome that is not a decision.

---

## Ownership boundary

D-31 warns that this boundary "erodes one token at a time." The enforceable form is a **name
allowlist checked by a test**, not a paragraph.

| Charcoal **MAY** redefine | Charcoal **MUST NOT** redefine |
|---|---|
| `--ink*`, `--cream*`, `--paper*`, `--panel*`, `--page-bg`, `--bg`, `--pg` | `--space-*` |
| `--rule*`, `--wire`, `--track`, `--fill-*`, `--scrim*`, `--g-bg`, `--g-bd` | `--text-*` |
| `--ochre*` (the charcoal accent, replacing `--amber*`), `--blue`, `--purple`, `--green`, `--red` and their `-d` / `-d-strong` / `-l` / `-ink` / `-vivid` / `-bg` variants | `--lh-*`, `--ls-*` |
| `--ds-illust-*`, `--surf-*` | `--ds-sidebar-w`, `--ds-snackbar-offset` |
| `--font*`, `--display`, `--mono`, `--serif`, `--weight-*` | `--z-*`, `--dur-*`, `--ease-*` |
| `--radius-*`, `--shadow-*` (geometry accents) | any sizing or spacing scale |
| `--focus`, `--focus-ring*`, `--error-ring` (derived from the accent) | — |

### The one non-obvious line, stated out loud

D-31 explicitly asks for precision, so:

> **`--text-*` is sizing and is therefore design-system owned. `--font-*` and `--weight-*` are
> identity and are therefore theme-owned.**
>
> **Sizes express how big the system is; stacks and weights express who you are.**

This is defensible but it is not self-evident — a type *scale* and a type *stack* both look
like "typography" from a distance — which is exactly why it is written as a rule here rather
than left to be re-derived per token.

### The consequence: a brand files a missing step upstream, never locally

**A brand needing a step the scale lacks files it upstream as a new step available to every
brand, never as a theme-local override.**

This is why the 52px hole is **G-11** and not a charcoal token. The Work and Photos page
headers call for 52px; the shared scale steps at **44** (`--text-4xl`) and 60 (`--text-5xl`),
so 52 falls in an 8px gap — the only one of fifteen handoff sizes landing further than ±2px
from an existing step. Filed as G-11, tiered `should-fix-in-Phase-1`, and until it lands the
Phase 0 sketches render those two headers at **44**px with a reference screenshot at 52px
beside them, so Phase 1 inherits evidence rather than an assertion.

**The boundary held in practice, not only on paper.** Plan 04's charcoal stylesheet declares
**zero** `--text-*` properties — and zero `--space-*`, `--lh-*`, `--ls-*`, `--z-*`, `--dur-*`
and `--ease-*` — asserted by grep in that plan's acceptance criteria. The same ruling applies
to the Brevo eyebrow's `letter-spacing: 0.18em` against `--ls-wide`'s 0.1em: if review finds
that delta visible, the answer is an upstream `--ls-widest` step, not a local override.

### D-32's corollary: the admin's density comes from upstream too

Because brand themes cannot own spacing, **the admin's denser layout must come from a
design-system-level `data-density` axis and never from portfolio CSS under an `.admin`
selector.** Overriding spacing tokens in app CSS to make the admin compact would be exactly
the workaround the project's Core Value forbids — a gap the design system exposed, papered
over locally instead of filed upstream.

Density is therefore a fourth cascade axis (**brand × mode × density**), it ships with the
cascade-layers release (D-28), and it belongs to **Phase 06.1** as **DS-11**, with
`00-FINDINGS.md` **G-2** as its evidence. Phase 0's only job here was to prove the shape — and
what it proved is that DS-11 as originally written cannot deliver a compact admin, because
`Button`'s padding is an inline style object that beats every CSS rule at every specificity
and is unreachable by any cascade-based density axis whatsoever.
