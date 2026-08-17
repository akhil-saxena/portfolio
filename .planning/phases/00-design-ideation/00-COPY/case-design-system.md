---
project: design-system
tier: long
status: first-pass
awaiting: akhil-edit
---

# Design System — case study (long form)

First-pass draft. Every factual claim below carries a `[source: <file>]` marker naming the
file it was read out of during this session, so a reviewer can audit provenance rather than
trust it. The current sources are `CHANGELOG.md`, `README.md`, `package.json` and `src/`.
The repo's own `.planning/` directory is deliberately **not** a source here: it is a
historical artefact whose product name, component count and theming mechanism have all
moved on, and this study is read by engineers who will open the repo. Any number that was
not read out of a file this session is a liability.

Opens consistently with the one-liner already drafted for this project — *"Accessible React
primitives with semantic tokens — 80 components, and this page is built on them."*
[source: `.planning/phases/00-design-ideation/00-COPY/one-liners.md`].

## Problem

A component library is easy to start and hard to keep honest. The parts that make one worth
using — an accessible name on every control, a focus indicator that actually clears the
contrast floor, an overlay that lands above the dialog that opened it — are precisely the
parts that fail silently. Nothing throws. The build stays green. The defect ships, and then
it sits there, because the only thing that would have caught it was somebody looking at the
right component, in the right theme, on the right day.

`@akhil-saxena/design-system` is a set of accessible React primitives driven by semantic
tokens: 80 components across 10 categories at version 1.11.4
[source: `../design-system/README.md`, `../design-system/package.json`]. The token layer is
deliberately small — one light scope and one dark scope, `:root` and `:root.dark, .dark`,
in a single 386-line sheet [source: `../design-system/src/tokens.css`]. Everything visual
resolves through it, which is what makes a one-token change land across every screen at
once, and equally what makes a single wrong token value a system-wide defect.

The library's real problem statement is therefore narrower than "build components". It is:
**make the invisible failures fail loudly.** The CHANGELOG is largely a record of that
problem being met, repeatedly, by turning a class of defect into a test. Three examples,
each measured rather than asserted: the focus ring was the brand `--amber` at **2.09:1** on
`--cream` against a required 3:1, so the system had no compliant focus indicator anywhere in
light mode; `--ink-4` was used as a text colour in ~28 places and measured **1.96:1** in dark
mode; and a wave of components was authored against `--font-body` / `--font-display` /
`--font-mono`, which the token layer never defined, so 28 font declarations were dropped by
the browser and every "monospace" data cell in the system rendered in Inter
[source: `../design-system/CHANGELOG.md`, 1.10.0].

None of those three produce an error. All three are visible in a screenshot, if you happen
to take the right one.

## Decisions

### 1. Semantic tone names in the public API, not the raw token ramp

`HeadingTone`, `TextTone` and `EyebrowTone` each exposed a *different subset of raw token
names* — `ink | ink-2 | ink-3 | amber` for one, the same plus `ink-4 | red | green` for
another, three values for the third. All three now share one vocabulary:
`primary | secondary | muted | accent | danger | success`
[source: `../design-system/CHANGELOG.md`, 1.10.0].

**The option not taken:** keep exposing the ramp directly, which was already working and
cost nothing to leave alone. **What it would have cost:** the internal ramp becomes public
API, so it can never be renamed; and because `ink-4` was an alias of `ink-3`, the API
carried two spellings for one colour indefinitely [source: `../design-system/CHANGELOG.md`].

### 2. Deprecate and alias — never remove

Every rename in the 1.10.0 hardening pass kept the old spelling working, marked
`@deprecated` and resolving to the new name at runtime; `Card`'s `tone` became `surface`
with `amber → tint`, `cream-2 → subtle`, `flat → outline`, and renderings were left
unchanged [source: `../design-system/CHANGELOG.md`, 1.10.0].

**The option not taken:** a clean breaking major that removes the old names outright.
**What it would have cost:** a coordinated upgrade across every consumer for a change that
alters no rendering — the release was an audit, not a redesign, and a breaking version
number would have described it wrongly [source: `../design-system/CHANGELOG.md`, 1.10.0,
which states explicitly that no component was removed and no published API was broken].

### 3. Contrast is a test, not a review step

`src/tokens.test.ts` computes WCAG ratios directly from the token sheet and asserts them:
muted text clears AA on every surface in both themes, and the focus indicator clears the
3:1 non-text floor. It also asserts that every token the dark theme overrides has a light
value, that every `var()` referenced anywhere in `src` is actually defined, that every
focus rule routes through `--focus`, and that no component uses a bare z-index
[source: `../design-system/src/tokens.test.ts`].

**The option not taken:** catch contrast regressions by looking at the components.
**What it would have cost:** exactly the `--ink-4` defect, which was *invisible in review by
construction* — light mode had `--ink-4` and `--ink-3` set to the identical value, so the
bug existed in only one theme and a reviewer working in light mode could never have seen it.
The fix aliased `--ink-4` to `--ink-3` and raised dark `--ink-3` to `#919191`, up from
3.44:1 [source: `../design-system/CHANGELOG.md`, 1.10.0].

### 4. Generate the per-component CSS split; do not maintain it

`primitives.css` is the whole sheet at roughly 165KB and remains the default. Alongside it,
`@akhil-saxena/design-system/css/<component>` plus a 4.7KB `css/base` lets a Button-only
consumer ship about 8KB instead of 165KB. The split is generated from `primitives.css` at
build time, and a test asserts it round-trips byte-for-byte
[source: `../design-system/CHANGELOG.md`, 1.10.0; `../design-system/README.md`].

**The option not taken:** hand-authored per-component stylesheets, or shipping only the
whole sheet. **What it would have cost:** hand-authoring gives two sources of truth that
drift silently, and the drift surfaces as a component that looks right for whoever imports
the whole sheet and wrong for whoever imports the granular one. Shipping only the whole
sheet costs every consumer 165KB regardless of what they render
[source: `../design-system/CHANGELOG.md`].

### 5. Screenshot baselines are a change detector, not a correctness oracle

Release 1.11.3 opens by stating the problem plainly: every check was passing while two
components rendered visibly wrong, because screenshot baselines only prove nothing
*changed*, and both defects were recorded into the baseline when it was first taken — so
they compared clean for as long as they existed. Two rendered-output audits were added
instead: `control-chrome.spec.ts` fails any control rendering with browser default form
chrome, and `polish-audit.spec.ts` sweeps every story for zero-size interactive elements,
sub-24px targets, and text the same colour as its background. They found three more defects
than had been reported [source: `../design-system/CHANGELOG.md`, 1.11.3].

**The option not taken:** trust the existing visual-regression suite, which was green.
**What it would have cost:** the defects it was already hiding — a CommandPalette rendering
with the browser's default button chrome, a `Link as="button"` that looked like a different
control depending on which element it rendered, and a FileInput dropzone in 13px Arial, the
one component in the system entirely off the type scale
[source: `../design-system/CHANGELOG.md`, 1.11.3].

### 6. Report the overclaim rather than quietly closing the gap

Release 1.11.0 said validation had been added to "every form control". Release 1.11.1 is
titled *"Completing the validation work 1.11.0 overclaimed"* and states that six controls
got it and seven did not, names all seven, ships them, and widens
`field-contract.test.tsx` from eight controls to fifteen so the claim is enforced instead of
asserted [source: `../design-system/CHANGELOG.md`, 1.11.0 and 1.11.1].

**The option not taken:** fix the seven controls silently in a patch release.
**What it would have cost:** nothing visible, and the specific thing this library is for —
a changelog an engineer can trust when the code is too large to read
[source: `../design-system/CHANGELOG.md`, 1.11.1].

## Outcome

What the repository proves is that the work was done and that it is enforced: 115 test files
across `src/` and `tests/`, axe-core running over every story with violations taken from 105
to 27, and a typecheck widened to cover the 179 test and story files the original config
excluded — which surfaced 104 type errors across 36 files, all fixed
[source: `../design-system/CHANGELOG.md`, 1.10.0; file count measured in
`../design-system/src` and `../design-system/tests`].

What it cannot prove is whether any of that mattered to anyone. There is exactly one
documented second consumer, and it is documented as a *plan* rather than a result:
`CAIRN-CONSOLIDATION.md` sets the direction as Cairn → design system, records the colour
tokens merged additively in v1.5.0 with no existing token clobbered, and leaves three
value-collisions (`--ink`, `--green`, `--red`) explicitly undecided
[source: `../design-system/CAIRN-CONSOLIDATION.md`].

<!-- Searched for evidence of adoption and outcome: npm download counts (not in git), a
     consumers list (only CAIRN-CONSOLIDATION.md, which is a plan rather than a record),
     and any retrospective or usage note. None exists in the repository. -->

> [NEEDS AKHIL] The library has been in real use across <n> projects since <month>, and the
> parts that earned their keep were <x> and <y>. The component reached for most often is
> <component>; the one that has never been used in anger is <component>. The hardening pass
> was triggered by <trigger>, and the thing it changed about how the work is done since is
> <change>. If a single number belongs in this section it is <metric>, and it has to come
> from Akhil rather than from the repository, because the repository records what was built
> and never whether it helped.

The one outcome that needs no interview is the page you are reading. This site is built out
of the library, so the case study and its strongest available evidence are the same artefact:
if a control on this page has a visible focus ring, an accessible name and a theme that holds
in both modes, that is the library doing it and not a bespoke stylesheet written for one
page. That is also the honest limit of the claim — it demonstrates that the library works,
not that anyone else has found it useful.

## Assets

Per D-41 this study carries a hero plus two inline screenshots. Sources available today are
the live Storybook at `design-system-ed1.pages.dev` [source: `../design-system/README.md`]
and this site itself.

- **Hero — this site, rendered.** A wide capture of a real page from this portfolio. It is
  the one image that makes the study's closing claim checkable rather than rhetorical.
- **Inline 1 — the same component in both themes, side by side.** Decision 3 is a claim
  about a defect that existed *in only one theme*; a paired light/dark capture shows in one
  glance why reviewing in a single mode could never have caught it, which is a paragraph of
  prose otherwise.
- **Inline 2 — the Storybook a11y panel on a story, reporting zero warnings.** Decision 6 is
  about enforcement rather than intention, and a screenshot of the check passing is more
  convincing than the sentence claiming it does.

Per D-42 these take the simple R2 asset path: uploaded straight to R2 under `assets/` on the
same custom domain as the photos, with dimensions captured at upload so there is no layout
shift. They explicitly do **not** go through the photo pipeline, which composites a watermark
and extracts EXIF — neither of which belongs on a screenshot, and both of which would make a
UI capture look like a photograph that had been processed for the gallery.

The hero is not a mockup. It is a screenshot of this site, the library's one public consumer
a reader can open in another tab, which is why this study closes where it does: the page you
are on is the artefact.
