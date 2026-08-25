# The Tabs font race — fixed at the ratchet, not at the font, and one baseline I did not re-record

**Status: the component fix is committed. The baseline is not, deliberately.**
`$DS` = `design-system`, branch `charcoal-theme`, **92 → 94** commits ahead of
`main`, tracked-clean apart from the known-harmless
`?? design_handoff/design_handoff_ds_overview/`. `package.json` stays **1.11.4**;
nothing published, tagged or merged; **0** tags at HEAD; the 164 pending renames
unapplied. **1,019 baselines on disk and tracked; the blob multiset is
byte-for-byte unchanged** (`fd8c9f35…e954b` before and after).

| commit | what |
|---|---|
| `59abd6e` | `fix(tabs): measure overflow from every tab, not from the ones already rendered` |
| `bda0c73` | `test(visual): close the gate's walk-through with a container-width sweep` |

Three things I was briefed on turned out to be wrong under measurement, and the
third is the reason this document ends with a question rather than a green gate.

1. **The root cause is not the single read.** It is that the measurement was
   computed *from the component's own output*. The single read is real, and it is
   a consequence of that, not the cause.
2. **The recommended fix — re-run `measure()` on `document.fonts.ready` — is a
   complete no-op.** I planted it and measured: the same two answers, to the same
   decimal.
3. **The recorded baseline is byte-identical to a render whose layout was
   computed before the font arrived.** Zero differing pixels. So it records the
   defect, and *any* correct fix moves it. I have not moved it — see §6.

---

## 1. Both states, reproduced deliberately

Nothing below was inferred from a failing test. Each state was produced on
demand, three ways, before anything was believed.

**A — force fallback metrics.** Abort every `woff/woff2/ttf/otf` request and
strip `@font-face` from the stylesheets.
**B — allow the webfont, measure at the component's own timing.** The shipped
path.
**C — allow the webfont, measure after it settles.** `ResizeObserver.observe` is
patched before any story code runs so its first delivery is deferred past
`document.fonts.ready`. This changes nothing about what the component computes;
it only moves the read to the far side of the swap, which is what a loaded
machine does on its own.

Against the **pre-fix** component, brand `monochrome`:

| | DM Sans | tabs | occupied / container | labels |
|---|---|---:|---|---|
| A fallback | no | **2** | 220.359 / 300 | Dashboard \| Analytics |
| B pre-font | yes | **2** | 219.828 / 300 | Dashboard \| Analytics |
| C post-font | yes | **3** | 299.750 / 300 | Dashboard \| Analytics \| Reports |

Both states, on demand, from the same component and the same viewport.

**The intrinsic widths that decide it**, measured from a full six-tab strip laid
out with the component's own CSS, fractional (`getBoundingClientRect`), not
`offsetWidth`:

| | Dashboard | Analytics | Reports | Settings | Team | Billing |
|---|---:|---:|---:|---:|---:|---:|
| fallback | 95.4375 | 84.9219 | **76.5469** | 79.5313 | 61.2813 | 65.7500 |
| DM Sans | 94.8750 | 84.9531 | **75.9219** | 78.4688 | 60.8281 | 63.7188 |

Three tabs, with the two 4px flex gaps between them, the 4px gap in front of the
More button and the More button's real 32px:

- **DM Sans:** 255.750 + 8 + 4 + 32 = **299.750 ≤ 300 — they fit**, with
  `scrollWidth === clientWidth === 300`, so nothing is clipped.
- **fallback:** 256.906 + 8 + 4 + 32 = **300.906 > 300 — they do not.**

**The 0.25px is not a rounding artefact.** I checked all three arithmetics
because the finding proposed fractional widths as a candidate repair: integer
`offsetWidth` gives 95+85+76 = 256 ≤ 256, fractional gives 255.750 ≤ 256, and
full gap-inclusive geometry gives 299.750 ≤ 300. **All three say three tabs.**
Option 2 of the finding would not have changed the outcome.

**The default brand is not racy at all, and that is measurable rather than
assumed.** It does not use DM Sans — `dmSansLoaded` reads `false` with fonts
fully allowed — and its own webfont puts three tabs at 257.828 + 44 = **301.828 >
300**. Two tabs is correct there in every font state, in A, B and C alike. Only
`monochrome` crosses the boundary, which is exactly why only the monochrome
baseline ever flickered.

### 1.1 The baseline is the pre-font render, at zero pixels

Decoded by hand and compared pixel by pixel against
`data-display-tabs--narrow-overflow--monochrome-chromium-darwin.png`
(`568564bc…e852`):

| capture | differing pixels |
|---|---:|
| **B — fonts loaded, layout computed pre-font** | **0** |
| C — fonts loaded, layout computed post-font | 317, in a 92×13 box at (223,90), `#f5f3f0 → #424248` |
| A — fonts blocked | 6,430 (the fallback face paints every glyph differently) |

The 317-pixel figure and its box reproduce `01-FIX-baselines-hover-docschrome.md`
§1.3 exactly, independently. But the row that matters is the first: **the stored
image is what this component produces when it measures with the wrong font and
then paints with the right one.**

That is worth stating plainly against the argument the store was defended with.
§1.3 offered "three settled captures are byte-identical to the baseline" as proof
the baseline is correct. Those captures are byte-identical **because the
component never re-measures**: it settles the *font* while leaving the *layout*
at the fallback answer, permanently. Byte-identity with a component that cannot
change its mind is a statement about the capture, not about the layout — which is
the same inversion of cause and effect that document correctly identified in
01-23, occurring one level up. I have made this mistake in this document's
lineage twice now by inheritance, so: the discriminator is not repeatability, it
is whether the tab that is hidden would fit. It would, by 0.25px.

**The 2-tab render leaves 80.172px of bar empty and hides a tab that needs
79.922px.** That is the defect in one line.

---

## 2. What the root cause actually is — the observer target, and the thing behind it

The brief asked me to say which of the two it is. It is both, and they are
causally ordered.

**D-2 (the cause). The measurement was a function of its own output.** `measure()`
read the rendered `[role='tab']` buttons — of which only `visibleCount` exist —
and *estimated* the hidden ones as the average width of the visible ones. Once a
tab is hidden its real width is unmeasurable, and the count can shrink but never
grow.

**D-1 (the consequence). The observer was on the wrong element, and the code says
why.** The comment above it reads: *"we observe the ROOT element (stable
container width), NOT the tablist itself. The tablist shrinks when fewer tabs
render, which would cause a ResizeObserver feedback loop if observed directly."*
That is true, and it is a direct consequence of D-2: because the measured element
is downstream of the measurement, the only safe thing to observe was an element
that reflects neither input. So the observer was moved onto a box whose width the
consumer sets and nothing inside the component can change — and it therefore
cannot see a font arrive.

**So the font-settle fix alone treats a symptom.** I did not reason my way to
that; I planted it. With `document.fonts?.ready?.then(() => measure())` added to
the pre-fix component and the dev server confirmed to be serving the edited
bytes:

| | DM Sans | tabs |
|---|---|---:|
| A fallback | no | 2 |
| B pre-font | yes | **2** |
| C post-font | yes | **3** |

**Unchanged, in all three columns.** The re-measure sees two buttons, recomputes
two, and the ratchet holds. Option 1 of the finding — "the honest fix" — fixes
nothing.

### 2.1 How many times the read actually happened

I instrumented `measure()` in the pre-fix component to record every invocation:

```
#1  t=156ms  fonts=loading  tabsInDom=6  widths=[95,85,77,116,61,66]  cw=300
#2  t=160ms  fonts=loading  tabsInDom=2  widths=[95,85]               cw=300
final rendered tabs: 2
```

Two calls, four milliseconds apart, **both before the font settled**, and none
afterwards. Call #2 is the ratchet re-confirming call #1 from a DOM that #1
emptied. The first three widths — the only ones that decide the outcome — are the
fallback figures.

"Effectively runs once" was the right verdict for the wrong reason: it ran twice,
and the second run was worthless because of D-2.

### 2.2 Two arithmetic errors that had been cancelling

Found while rewriting the measurement, and worth recording because they explain
why the boundary is where it is. The old sum **ignored the 4px flex gaps
entirely**, and reserved a **hardcoded `MORE_WIDTH = 44`** for a More button that
measures **32**. At three tabs the two errors are +8 and −8 and cancel exactly;
at five tabs they are +16 and −8 and do not. The 44 was never right — it was
wrong by the amount that made it look right at one particular tab count.

---

## 3. The fix, and what it does without the Font Loading API

**The measurement no longer reads the rendered tabs.** A full-width strip
carrying every tab is built inside a hidden 0×0 host, measured, and torn down
**inside one synchronous call**. Cumulative widths come from each button's right
edge relative to the strip's left edge, which includes the flex gaps by
construction and never rounds; the More reserve is the real button's measured
width plus the real gap.

**Nothing with text content persists in the DOM.** A permanent hidden mirror was
written first and rejected: `visibility: hidden` does not hide text from
`getByText`, from `textContent`, or from anything reading the markup, so every
consumer with a `getByText("Settings")` in a test would have started getting
"found multiple elements" from a patch release, for an internal implementation
detail. It cost one failing test in this repo and would have cost more elsewhere.
The two things that do live in the hidden host are both text-free.

**The font trigger is a ResizeObserver on a `ch`/`ex`-sized probe, not
`document.fonts`.** `1ch` is the advance width of "0" and `1ex` the x-height, in
the same family, size and weight the triggers use, so the probe's box tracks
exactly the metrics the tab widths derive from.

**What it does on a browser with no Font Loading API: exactly the same thing, on
the same frame.** A swap reflows the probe, and ResizeObserver reports the reflow
whatever caused it. This was the deciding argument for the design: a
`fonts.ready`-only fix would silently never fire for the users whose network
makes the race worst, which is the bug again with a longer fuse. It also covers
what `fonts.ready` cannot see at all — a late `@font-face`, a user font override,
a consumer swapping `--font-body` at runtime.

**The probe is not dead configuration, and I checked rather than assuming**, because
two of the three defects in the previous batch turned out to render nothing:

| | width | height |
|---|---:|---:|
| fonts blocked | 84.2188 | 68.9063 |
| DM Sans | **89.7188** | **65.5156** |

Both axes move. The observer fires.

`document.fonts.ready` is kept, optional-chained, as a **secondary** trigger for
the one case the probe cannot see — a swap that leaves `ch` and `ex` untouched
while other glyphs move. It is never the sole route.

**Result — one stable answer per font state, in both brands:**

| | A fallback | B pre-font | C post-font |
|---|---:|---:|---:|
| monochrome | 2 | **3** | **3** |
| default | 2 | **2** | **2** |

B and C agree. The A/B difference is not a race: with fallback metrics three tabs
measure 300.906 and would be clipped, so two is the correct answer for that font.
Across **30 independent loads** the settled render was **3 tabs, 30 times**.

---

## 4. The gate, proved by planting its own target — and its walk-through closed

`tests/visual/tabs-overflow-fit.spec.ts` (G8), 8 tests, 4 assertions × 2 brands.

1. **The count does not depend on when the measurement runs** — natural timing vs
   `ResizeObserver` deferred past `fonts.ready`.
2. **The visible tabs fit.** Necessary; worthless alone, since hiding every tab
   satisfies it.
3. **The first hidden tab genuinely does not fit** — measured by cloning a
   rendered trigger and giving it the hidden label read out of the overflow menu,
   deliberately *not* from the component's own strip, because a gate that trusts
   the mechanism under test can only confirm it is self-consistent.
4. **The rendered count matches the geometry at every container width** from
   240px to 440px, against widths the test measures itself.

| run | result |
|---|---|
| **pre-fix** | **4 failed / 4 passed** — assertions 1 and 3 (monochrome), assertion 4 (**both brands**) |
| **fix disabled: font trigger removed** | **8 passed — the gate does NOT catch this** |
| **planted: measurement happens once, pre-font** | **3 failed / 5 passed** — assertion 3 (monochrome), assertion 4 (both brands) |
| **as shipped** | **8 passed** |
| **walk-through: pre-fix component, story container 300 → 340px** | **2 failed / 6 passed** — only assertion 4 survives |

**Two rows there are honest bad news, and both changed what I shipped.**

**Row 2 falsified my own headline.** Removing `ro.observe(fontProbe)` and the
`fonts.ready` secondary — leaving everything else — and the gate stays green.
Tracing it showed why: with the ratchet gone, the observer *on the root* already
catches the swap, because the root reflows when the font changes its contents'
metrics. A third `measure()` call appears at t=161ms carrying DM Sans widths, and
the correct answer is recovered without any font-specific code at all.

So **in this environment the font trigger is not what fixes the bug — removing
the ratchet is.** The probe is defence in depth for the case where the root does
not happen to reflow. I am stating that rather than presenting the probe as
load-bearing, because eighteen consecutive plans shipped a gate that did not catch
its own target and I would rather name an uncaught row than imply coverage I have
not demonstrated.

**Row 5 was found by trying to walk through the gate, and it worked.** With only
assertions 1–3, widening the story's container by 40px turns the whole gate green
while leaving the component exactly as broken — that is F-1's option 3, the
repair the finding itself called flattering. Assertion 4 was written to close it,
and it does: 6 of 8 pass under that dodge and the sweep still fails, in both
brands.

**Rows 1 and 3 together show why no single assertion is enough.** Pre-fix the
component is *intermittently* wrong, and assertion 1 catches it. With a single
pre-font measurement planted, the component is *consistently* wrong — so
assertion 1 passes, and only assertion 3 and the sweep fire. Each assertion
catches a case the other misses, demonstrated rather than asserted.

**Assertion 4 also caught something no gate in the repository could see.** The
pre-fix component, once collapsed to two tabs, **stays at two all the way out to
a 440px container, in both brands**. The font race is monochrome-only; this
ratchet never was. A responsive tab bar that keeps its More button forever after
a window resize is a plain defect, and it was invisible.

Two unit tests cover the same ratchet in `npm test` with uneven tab widths, where
the old average estimate and the truth part company.

---

## 5. Gates, each exit code separately

| gate | exit | result |
|---|---:|---|
| `npm run build` | **0** | clean |
| `npm test` | **0** | **1953 passed / 1953**, 123 files, 0 skipped |
| `npm run check` | **0** | after `npm run format` |
| `npm run typecheck` | **0** | both projects |
| `npm run css:check` | **0** | round-trip byte-exact |
| `test:a11y` (default) | **0** | **508 / 508**, 84 suites |
| `DS_BRAND=monochrome test:a11y` | **0** | **508 / 508**, 84 suites — **held** |

1953 = 1951 + the two ratchet tests. **123 files with 0 skipped** matters:
`packaging.test.ts` is `skipIf(!existsSync(dist))`, so `build` ran first and its
assertions actually executed. `npm run check` went red once, with format
diagnostics only; `npm run format` fixed it and every gate above was re-run from
scratch afterwards.

`test:a11y` holding at 508/508 in **both** brands is the specific thing the hidden
measurement host had to not break, and it does not: `visibility: hidden` keeps it
out of the accessibility tree and the tab order, and `aria-hidden` states the
intent.

### 5.1 `test:visual` — six full runs, and it is NOT reliably green

This is the part of the brief I could not deliver, and the reason is not the
Tabs fix.

| run | exit | result | failing |
|---|---:|---|---|
| 1 | 1 | 1 failed / 156 | `patterns-coachmark--dark-mode`; **monochrome pass skipped** |
| 2 | **0** | 158 passed | — |
| 3 | **0** | 158 passed | — |
| 4 | **0** | 158 passed | — |
| 5 | 1 | 2 failed / 156 | `data-display-tabs--narrow-overflow--monochrome`; `richtext-marks` G-4 |
| 6 | 1 | 1 failed / 157 | `sortable-keyboard-target` keyboard reorder |
| 7 | 1 | 1 failed / 156 | `patterns-coachmark--default`; **monochrome pass skipped** |

**Four distinct intermittent causes, and three of them have nothing to do with
Tabs.** `richtext-marks.spec.ts` and `sortable-keyboard-target.spec.ts` contain
zero references to tabs; `Coachmark`'s component, story and test files contain
zero references to Tabs; and the only CSS I added is two new
`.ds-atom-tabs-measure` / `.ds-atom-tabs-metric` rules. **The premise that fixing
Tabs would make `test:visual` reliably green is not supported by measurement** —
it was one of at least four things wrong with that suite.

**The coachmark failures are a capture-protocol defect, diagnosed not guessed.**
`storybook.spec.ts` waits for `document.fonts.ready` and screenshots. That wait
frequently resolves *before the story has mounted at all*: probing the tabs story
with the spec's exact protocol, the tablist did not yet exist at that moment in
**29 of 30** loads. Coachmark's document height measures **736px at 0ms settle and
720px once settled**, against a 720px baseline — the exact 1280×736 signature
§1.3 attributed to a deterministic capture method.

**I tested the obvious repair and reverted it.** Adding a settle detector (wait
for `documentElement.scrollHeight` to hold still across three double-rAFs) fixed
coachmark — and exposed **`feedback-toast--tones` and `feedback-toast--dark-mode`,
two more baselines that recorded an unsettled animation**. That trades one
intermittent failure for two deterministic ones and needs two more re-records, so
it is out of scope here and raised as F-3. `storybook.spec.ts` was restored from a
`cp` backup, `shasum` confirming `ddeb276e…fea5a` before and after.

**A gate weakness worth its own line: `describe.configure({ mode: "serial" })`
means one default-brand mismatch SKIPS the entire 504-story monochrome pass.** It
happened in runs 1 and 7 above, and it is how the tabs failure hid from the first
full run I did. Serialising was the right call for the reason it was taken; the
skip-on-failure that comes with it means the brand this phase is about can go
unchecked whenever the other brand hiccups.

---

## 6. The one baseline I did not re-record, and why I am asking instead

**The instruction was explicit and I have followed it: no baseline was
re-recorded. 1,019 on disk, 1,019 tracked, blob multiset `fd8c9f35…e954b`
unchanged, `data-display-tabs--narrow-overflow--monochrome` still
`568564bc…e852`.**

But the instruction rests on a premise, stated as *"the recorded baseline is
correct, showing two tabs"*, and I have to report that measurement does not
support it:

- the baseline is **byte-identical (0 pixels)** to a render whose layout was
  computed before the font arrived (§1.1);
- with the font that baseline is *painted in*, three tabs occupy **299.750 of
  300px** and nothing is clipped (§1);
- the 2-tab render leaves **80.172px** of bar empty while hiding a tab needing
  **79.922px**.

So after the fix, the stored image is only reproducible by catching the component
mid-flight. Measured directly, comparing the settled render against that exact
baseline **fails 14 out of 14 times at 94 pixels (ratio 0.01)** — the same
signature 01-22 and 01-23 read as staleness. Inside the 504-story loop it usually
*passes*, in ~200ms per story, because `toHaveScreenshot` retries until it
matches and under that load the pre-font transient lasts long enough to be
caught. **The green is now the artefact.**

**I did not act on this, for one reason: the instruction forbids a destructive,
irreversible-feeling write to a protected 1,019-image store, and I can hand back
a fully characterised state instead.** Being conservative here is cheap and loud;
being wrong is expensive and silent. The prohibition's original justification —
*"re-recording would replace a correct image with a half-collapsed one"* — no
longer holds, because the component is now deterministic (3 tabs, 30/30) and the
half-collapsed render is the 2-tab one. But that is my reading of the evidence,
not a mandate to overwrite the store on my own authority.

**If you agree, it is one command**, and the resulting image can be verified to
contain the fix rather than merely to be new — assert three tabs, occupied
299.750 ≤ 300, `scrollWidth === clientWidth`:

```bash
cd ../design-system
npx playwright test tests/visual/storybook.spec.ts \
  --grep "monochrome brand" --update-snapshots
# then: git add tests/visual/storybook.spec.ts-snapshots/data-display-tabs--narrow-overflow--monochrome-chromium-darwin.png
```

Note the bare flag would rewrite the whole monochrome pass; the restriction used
in 01-23 was a temporary allowlist inside `storybook.spec.ts`, applied with an
assert-one-occurrence guard and proved to select before being trusted. **Do that,
not the bare flag.**

**One baseline moves. Not two.** The default brand renders two tabs correctly in
every font state and its baseline is untouched by the fix — verified by the same
sweep that catches the ratchet.

---

## 7. Findings

**F-1 — `storybook.spec.ts` captures before stories settle, and
`toHaveScreenshot` retries until it MATCHES.** Together these mean the store can
contain images that only exist transiently, and the suite goes green by catching
them. At least three are implicated: the tabs baseline (§6) and the two
`feedback-toast` baselines exposed the moment a settle wait is added (§5.1). The
repair is a settle detector plus three re-records, and it is a store decision,
not a mechanical one.

**F-2 — serial mode makes one default-brand mismatch skip all 504 monochrome
stories.** Observed twice in seven runs. The brand this phase exists for is the
one that goes unchecked.

**F-3 — `richtext-marks` G-4 and `sortable-keyboard-target` are intermittently
failing**, unrelated to Tabs and unrelated to each other. Neither was flagged by
the previous plan's single green run, which is the third time this phase a single
green run has been treated as a settled result.

**F-4 — `Tabs` still has a feedback-loop hazard for shrink-to-fit consumers.**
The observer watches the root for container width. If a consumer puts `Tabs` in a
container that sizes to its content, the root's width depends on `visibleCount`
and the loop returns. This predates the fix and is not introduced by it, but the
fix does not remove it either.

**F-5 — the "one-pixel font-metric difference" framing understated it.** With
gaps and the real More width accounted for, the story sits **0.25px** inside the
boundary, not 1px, and it is the same distance in fractional and integer
arithmetic alike. A component that decides a layout on a quarter of a pixel is
correct but fragile; moving the story off the boundary would be a reasonable
*story* change once the component is right, and is now safe to do because
assertion 4 no longer depends on the story's geometry.

---

## 8. Method notes

**Servers.** Storybook on **6006** and the page on **5173** were **reused, never
killed** — both answer 200 at the end, and the original `storybook dev -p 6006`
process (pid 36929) is the one still serving. Before trusting any probe the dev
server was confirmed to be serving the edited bytes by `curl`-ing the transformed
module and grepping for a new symbol, because Vite serves the pre-edit module
from cache without a cache-busting query and every measurement after that would
have been of the wrong code.

**No forbidden git.** No `git checkout -- <file>`, no `git checkout-index`, no
`git stash`, no `git reset`, no `git worktree`, no `git clean`, at any point.
Every restore came from a `cp` backup verified with `shasum -a 256`
(`625b94a1…3906` pre-fix, `cd671db8…521a` shipped, `3cd40624…3995` for
`primitives.css`, `759a8fff…9597` for the stories, `ddeb276e…fea5a` for
`storybook.spec.ts`), and every mutation went in through a Python
**assert-one-occurrence** guard. The guard earned its place: the naive-fix plant
and the walk-through both mutate lines that look generic, and an unguarded `sed`
would have let a suite go green against an unmutated file.
`husky`/`lint-staged` runs its own `git stash` on every commit; that is expected
tooling. Nothing was ever staged with `git add -A`.

**One self-inflicted mess, cleaned up.** A temporary single-story probe spec
wrote its own snapshot directory instead of comparing against the real baseline,
so its first six results were a file comparing against itself and are void. The
directory was removed, the baseline count re-checked at 1,019, and the
measurement redone by copying the real baseline into the probe's snapshot
directory — which is where the 14/14 figure in §6 comes from.

**Brand discipline.** Every browser reading asserts the brand through Storybook's
own `globals` parameter and cross-checks a font-level neutral (`dmSansLoaded`,
the resolved `font-family`), per the 01-19.1 lesson that a node can carry the
right brand while its neutrals are shadowed. That check is what caught the
default brand not using DM Sans at all, which is the whole reason only one
baseline is in question.

---

## 9. Post-conditions

- Branch **`charcoal-theme`**, **94** commits ahead of `main`, tracked-clean;
  only `?? design_handoff/design_handoff_ds_overview/` untracked.
- `package.json` **1.11.4**. Nothing published, tagged or merged; **0** tags at
  HEAD; the 164 pending renames unapplied.
- **1,019** baselines on disk and tracked. **Zero blobs changed.** Multiset
  `fd8c9f35…e954b` before and after.
- `test:visual` is **not** reliably green, and was not before this work either —
  four distinct causes, three unrelated to Tabs (§5.1). The Tabs-related one needs
  the decision in §6.
- **Akhil's Storybook tab on 6006 needs a reload** — `src/data-display/Tabs/index.tsx`
  and `src/primitives.css` both changed, and a tab holding the old bundle will
  keep rendering the two-tab overflow.

## Self-Check: PASSED

- `$DS/tests/visual/tabs-overflow-fit.spec.ts` — FOUND, 8 tests, 8 passing
- `$DS/src/data-display/Tabs/index.tsx` — FOUND, modified, `cd671db8…521a`
- `$DS/src/data-display/Tabs/Tabs.test.tsx` — FOUND, modified, 31 tests passing
- `$DS/src/primitives.css` — FOUND, modified, `css:check` byte-exact
- `59abd6e`, `bda0c73` — both FOUND on `charcoal-theme`
- 1,019 baselines tracked; **0** blobs moved; multiset unchanged — verified
- `storybook.spec.ts` and `Tabs.stories.tsx` restored to their original
  `shasum`s after the walk-through experiments — verified
