---
project: design-system
status: first-pass
awaiting: akhil-edit
badge: Live
---

# Design System

<!-- R-1 compression. Cuts and sources: 00-COMPRESSION-NOTE.md. -->

## Problem

A component library is easy to start and hard to keep honest. The parts that make one worth
using — an accessible name on every control, a focus ring that clears the contrast floor —
fail silently. Nothing throws, the build stays green, and the defect ships.

`@akhil-saxena/design-system` is accessible React primitives on semantic tokens: ten
categories at version 1.11.4, resolving through one 386-line sheet with a single light and
dark scope [source: `../design-system/package.json`, `../design-system/src/tokens.css`]. One
token change lands everywhere at once; one wrong value is a system-wide defect. The focus ring
was `--amber` at **2.09:1** against a required 3:1, and `--ink-4` was a text colour in ~28
places at **1.96:1** in dark [source: `../design-system/src/tokens.test.ts`]. So the problem
is narrower than "build components": **make the invisible failures fail loudly**.

## Decisions

### 1. Contrast is a test, not a review step

`tokens.test.ts` computes WCAG ratios from the token sheet and asserts them — muted text
clears AA on every surface in both themes, the focus indicator clears the 3:1 floor
[source: `../design-system/src/tokens.test.ts`].

**The option not taken:** review components for contrast.
**What it would have cost:** the `--ink-4` defect, invisible in review *by construction* —
light mode set `--ink-4` and `--ink-3` to the identical value, so the bug existed in one theme
only [source: `../design-system/CHANGELOG.md`, 1.10.0].

### 2. Screenshot baselines detect change, not correctness

Every check passed while two components rendered visibly wrong: baselines prove only that
nothing *changed*, and both defects sat in the baseline from the day it was taken. Two
rendered-output audits replaced that assumption and found three defects more than reported
[source: `../design-system/CHANGELOG.md`, 1.11.3].

**The option not taken:** trust the visual-regression suite, which was green.
**What it would have cost:** the defect it was already hiding — a FileInput dropzone in 13px
Arial, the one component off the type scale.

### 3. Report the overclaim rather than quietly closing it

1.11.0 said validation had been added to "every form control". 1.11.1 is *titled* "Completing
the validation work 1.11.0 overclaimed", ships the seven controls that never got it, and
widens `field-contract.test.tsx` from eight controls to fifteen
[source: `../design-system/CHANGELOG.md`, 1.11.1;
`../design-system/src/field-contract.test.tsx`, counted].

**The option not taken:** fix the seven silently in a patch.
**What it would have cost:** nothing visible, and the one thing this library is for — a
changelog an engineer can trust when the code is too large to read.

## Outcome

The repository proves the work was done and is enforced: 118 test files [counted this
session], axe-core over every story, violations taken from 105 to 27
[source: `../design-system/CHANGELOG.md`, 1.10.0]. What it cannot prove is whether that
mattered — the one documented second consumer is documented as a *plan*, not a result
[source: `../design-system/CAIRN-CONSOLIDATION.md`].

<!-- Searched and empty: npm download counts (not in git), a consumers list (only
CAIRN-CONSOLIDATION.md, a plan rather than a record), any retrospective or usage note. -->

> [NEEDS AKHIL] The library has been in real use across <n> projects since <month>. The parts
> that earned their keep were <x> and <y>; the one never used in anger is <component>. The
> hardening pass was triggered by <trigger>. The number that belongs here is <metric>, and
> only Akhil has it — the repository records what was built, never whether it helped.

The outcome needing no interview is the page you are reading. This site is built out of the
library, so the study and its evidence are the same artefact — the focus ring under your
cursor is the one decision 1 asserts. That is also the limit: it shows the library works, not
that anyone adopted it.

## Assets

Per D-41, a hero plus two inline shots: a real page from this site; one component in both
themes, since decision 1 is a one-theme defect; and the Storybook a11y panel at zero warnings,
since decision 3 is about enforcement, not intention. Per D-42 all three go straight to R2
under `assets/`, sized at upload so nothing shifts — not through the photo pipeline, which
watermarks and reads EXIF.
