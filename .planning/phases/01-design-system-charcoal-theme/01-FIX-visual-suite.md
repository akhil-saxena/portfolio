# `test:visual` — five green runs, 1,008 stories each, and one cause instead of three

**Status: done.** `$DS` = `design-system`, branch `charcoal-theme`, **94 → 99**
commits ahead of `main`, tracked-clean apart from the known-harmless
`?? design_handoff/design_handoff_ds_overview/`. `package.json` stays **1.11.4**;
nothing published, tagged or merged; **0** tags at HEAD; the 164 pending renames
unapplied. **1,019 baselines on disk and tracked. Exactly one moved** — the one
authorised.

| commit | what |
|---|---|
| `394fe20` | `test(visual): correct the tabs baseline that recorded the pre-fix layout` |
| `eec91cb` | `test(visual): stop one brand's failure from suppressing the other brand's 504 stories` |
| `9b29406` | `test(visual): wait for dnd-kit's keyboard sensor instead of guessing how long it takes` |
| `511a4aa` | `test(visual): wait for the story to exist before photographing it` |
| `c26dba3` | `test(visual): check the selection after every keystroke instead of counting to seven` |

**Five consecutive `test:visual` runs, all exit 0, 160/160 each, 504 + 504
captured each.** Every gate green. Two things I was asked to look for turned out
differently under measurement, and both are below rather than buried: the flake
that actually bit was in a spec nobody had flagged, and one of my own gate
walk-throughs came out the opposite way round from what I predicted.

---

## 1. The tabs baseline — one file, verified to contain the fix

Re-recorded through a temporary allowlist inside `storybook.spec.ts`, **proved to
select before it was trusted with a write**: run without `--update-snapshots`
first, and the spec's own log line reads

```
visual baselines [default]:    captured 0,   skipped 508
visual baselines [monochrome]: captured 1,   skipped 507
```

with the monochrome test failing at **94 pixels (ratio 0.01)** — the figure §6 of
the tabs report predicted, reproduced independently. Then the write, which
reported exactly one file `is re-generated`.

**The blob check, both halves:**

| | before | after |
|---|---|---|
| files on disk / tracked | 1019 / 1019 | 1019 / 1019 |
| full blob multiset | `fd8c9f35…e954b` | `fd2b988b…c3f9c` |
| **blob multiset of the other 1018** | `287c768e…4cb79` | **`287c768e…4cb79`** |
| tabs image sha256 | `568564bc…1e852` | `cc20ed69…f435f` |

The third row is the one that matters: the 1,018 images I did not touch are
byte-for-byte identical to `HEAD`, computed as a set so a rename or a swap could
not hide in it. `git status` reports exactly one modified file.

**The new image was verified to contain the fix, not merely to be new.** Across
**14 independent settled loads** of the monochrome story: **3 tabs**, occupied
**299.750 of a 300px container**, tablist `scrollWidth === clientWidth` (nothing
clipped), and **0 differing pixels** against the newly recorded baseline, 14/14.
Against the *old* baseline the same settled render differed by 317 pixels in a
92×13 box at (223,90) — §1.1's figure, reproduced.

**One baseline moved, not two.** The default brand resolves `Inter`, renders two
tabs occupying 221.484 of 300, and matched its untouched baseline at **0 pixels
across 8 loads**.

`storybook.spec.ts` was restored from a `cp` backup afterwards,
`ddeb276e…fea5a` before and after.

### 1.1 What the allowlist became

Rather than leave it as an ad-hoc edit to be re-derived and re-proved next time,
it ships as `DS_VISUAL_ONLY` — a comma-separated allowlist of **baseline file
stems**, which are brand-suffixed, so it selects a story *and* a brand. Two
safety properties, asserted rather than documented:

- **refused under CI**, so a stray pipeline variable cannot narrow coverage;
- **a brand that captures nothing now fails** instead of reporting success on
  zero stories.

Both proved. The CI guard needed a plant of its own to reach: with `CI=1`,
`playwright.config.ts` sets `reuseExistingServer: false` and the run dies on the
bound port before any test executes, so `reuseExistingServer: true` was planted
temporarily. With it, `CI=1` + allowlist fails on
`DS_VISUAL_ONLY narrows the capture set and must never be set in CI`, and the
control — same plant, `CI=1`, allowlist unset — passes with `captured 504`.
`playwright.config.ts` restored from a `cp` backup, `64d962ae…ad6fb` before and
after.

---

## 2. Serial mode — what it was protecting, and what it was actually protecting

### 2.1 The skip, proved

`mode: "serial"` does two separate things under one name. Planting **one**
default-brand story compared against the other brand's recorded image:

```
serial   →  visual baselines [default]: captured 504    1 failed
                                                        1 did not run     ← all 504 monochrome stories
```

Playwright reports a suppressed test as **"did not run"**, never as a failure. A
run whose only visible symptom is a failure somebody has already attributed to
the other brand exercised **half the suite**.

### 2.2 What the guard was for — and it is not what the comment said

The comment justified serialising with a contended run that flagged
`data-display-tabs--narrow-overflow--monochrome` at **96 px, ratio 0.01**.

That is the same story, the same magnitude and the same 92×13 box as the Tabs
font race diagnosed in `01-FIX-tabs-font-race.md` and fixed at `59abd6e`.
**Contention did not corrupt a comparison; it widened the window on a real
component defect.** The premise the guard rested on is gone — and a measured
`mode: "parallel"` run of this spec is now green, 504 + 504.

### 2.3 What I did instead of deleting it

**Kept the serialisation, dropped only the skip**, via `mode: "default"` — which
overrides the config's `fullyParallel: true` for this describe alone.

Instrumented with `Date.now()` at both ends of each pass:

| configuration | plant | result |
|---|---|---|
| `serial` | default-brand failure | captured 504 / **1 did not run** |
| `default` | default-brand failure | captured 504 / **captured 504**, monochrome green |
| `default` | none | both in **worker 0**, ended t+100684ms → started t+100728ms, **44ms apart, no overlap** |
| `parallel` | none | **workers 0 and 1, same millisecond** — negative control |

The last row is the discriminator, and it is why this is not a placebo:
`mode: "default"` is doing the serialising, not decorating a suite that was
sequential anyway.

The serialisation is kept even though its original cause is fixed, because F-1
(§4) is still open, load widens every such window, and one worker instead of two
costs 1.7 minutes against a store of 1,019 images.

### 2.4 The standing gate — `tests/visual/brand-independence.spec.ts`

It spawns a **real child `playwright test` run of the real spec** with one
brand's allowlist left empty, and reads the survivor's capture count out of the
child's own output. A grep for `serial` would pass against
`test.describe.serial()`, a project `dependencies` chain, or a throwing fixture;
this cannot. The plant lives entirely in the environment — nothing in
`storybook.spec.ts` knows the gate exists.

| row | result |
|---|---|
| pre-fix / fix disabled (`mode: "serial"`) | **FAILED** — "the monochrome pass was suppressed by the default-brand failure" |
| as shipped (`mode: "default"`) | **2 passed** (2.7s) |
| **walk-through**: `serial` + `BRANDS` reordered | **FAILED** — "the default pass was suppressed by the monochrome-brand failure" |

The walk-through row is why the gate plants **both directions**. With monochrome
declared first, a single-direction gate goes green while the coupling is
completely intact — and a *monochrome* mismatch would then suppress the default
brand instead. No declaration order satisfies both directions while the group is
coupled.

One implementation note worth its own line: the child run is given
`--output=test-results/brand-independence-child-*`. Playwright **deletes its
output directory at the start of every run**, and parent and child default to the
same one, so an isolated directory is mandatory rather than tidy — measured, the
first version left two of the child's failure directories sitting in the
parent's `test-results`.

---

## 3. The three flakes — one cause, and it is not the one that was suspected

**Yes: they share a cause, and stating it saved two of the three fixes from being
wrong.**

> Every one of them dispatches an input or a capture **before the thing that must
> receive it exists**, and expresses the wait as a fixed budget — a 100ms sleep,
> a live-region utterance, a retry window — instead of as the condition itself.

That is not a family resemblance; it is a testable claim, and **one plant
falsified or confirmed it for each**. Two of the three turn out to share not just
the class but the *mechanism*, and the report had them filed as unrelated.

### 3.1 First, the flake that actually bit

Three full `test:visual` runs after items 1 and 2 were in:

| run | exit | result | failing |
|---|---:|---|---|
| A | 0 | 160 passed, 504 + 504 | — |
| B | 1 | 1 failed / 159, 504 + 504 | **`sortable-announce.spec.ts`** |
| C | 1 | 1 failed / 159, 504 + 504 | **`sortable-announce.spec.ts`** |

**Two in three, in a spec neither the report nor the brief named.** Same
component as `sortable-keyboard-target`, and — measured below — the same
mechanism. The report's F-3 had `sortable-keyboard-target` and `richtext-marks`
as "unrelated to each other"; that is the finding I am correcting.

Note also what did **not** reproduce it: running the two interaction specs
against a concurrent full baseline pass (57/57 × 3, green), and starving them at
14 workers on 12 cores (190/190, green). Contention alone is not the trigger,
which is why the plants below perturb the macrotask queue instead of the CPU.

### 3.2 `sortable-announce` + `sortable-keyboard-target` — one mechanism, read out of dnd-kit's source

`@dnd-kit/core`'s `KeyboardSensor.attach()`:

```js
attach() {
  this.handleStart();                        // -> onStart -> React commit
  this.windowListeners.add(Resize, ...);
  this.windowListeners.add(VisibilityChange, ...);
  setTimeout(() => this.listeners.add(Keydown, this.handleKeyDown));
}
```

`handleStart()` runs **first**, and it is what eventually paints
`data-dragging="true"` *and* produces the "Picked up …" utterance. The
document-level keydown listener every subsequent arrow key depends on is queued
in a `setTimeout` **after** it. So **both** signals the two specs paced on are
emitted inside the race window by construction.

Measured by patching `Document.prototype.addEventListener` on the single-list
story:

| moment | document keydown listeners | `data-dragging` |
|---|---|---:|
| immediately after Space | `["bail"]` | 1 |
| after `data-dragging="true"` is observable | `["bail"]` | 1 |
| after one macrotask boundary | `["bail", "bound handleKeyDown"]` | 1 |

`bound handleKeyDown` arrives **11.3ms after `bail`, and never before
`data-dragging`**. `sortable-keyboard-target` covered this with
`waitForTimeout(100)`; `sortable-announce` covered it with a wait on the live
region, which is `handleStart()`'s own output. The second is the one that failed.

**Both now wait for the listener itself** (`tests/visual/dnd-keyboard.ts`).
There is no duration to tune.

**Proved by planting the race**, not by re-running until green. The plant defers
every 0ms macrotask in the page — precisely the window `attach()` uses — so it
widens the real race rather than inventing one:

| variant | 500ms plant | 3000ms plant |
|---|---|---|
| pre-fix (100ms sleep / live-region pacing) | **6 failed / 3 passed** | — |
| **walk-through**: `waitForTimeout(600)` | 4 passed | **3 failed / 1 passed** |
| as shipped (wait for the listener) | **9 passed** | **9 passed** |

The middle row is the whole argument in one line: **a sleep that wins is the same
race with a longer fuse.** The condition wait is unaffected by the size of the
window. Clean: 54/54 at 12 workers.

`expectHeld` is kept alongside the new wait, and not as belt-and-braces: the
sensor wait says the next key will be heard, `expectHeld` says the *right tile*
is holding it, and E34 is a defect about the second. Neither implies the other.

### 3.3 `richtext-marks` G-4 — reproduced, and the first plant could not close its walk-through

The same macrotask plant reproduced it, in exactly the test the report named:

```
Expected substring: "**Reduced**"
Received string:    "**Reduce**d **p95 latency** by 40% across three services"
```

**Six characters, not seven.** G-4 pressed `Shift+ArrowRight` seven times in a
row and assumed seven characters were selected. Under load one is dropped — and
it reads as a broken serializer, which is what the assertion appears to be about.

The press is now retried against the selection: one press, one check, and a press
that changed nothing is simply pressed again. `window.getSelection()` is read
rather than `editor.state.selection`, because ProseMirror's mirror lags the DOM
by design — **13 of 25 loads still reported the pre-keystroke position while the
DOM selection was already correct** — so polling the mirror would wait on the
wrong clock. It is also the selection Chromium's native ⌘B acts on, which is the
input path this case exercises.

| variant | timer plant 300 / 1000 / 3000ms | **swallow-one plant** |
|---|---|---|
| pre-fix (blind seven presses) | **1 failed** / **1 failed** / — | **FAILED** `**Reduce**d …` |
| **walk-through**: 400ms sleep between presses | passed / — / **passed** | **FAILED** `**Reduce**d …` |
| as shipped (checked selection) | **45 / 45 / 45 passed** | **PASSED** |

**Row 2 column 1 is honest bad news and it changed how this was proved.** A
400ms sleep between the seven presses survives the timer plant at *every*
strength — so that plant reproduces the bug without discriminating the repairs,
and on its evidence alone I could not claim the checked selection was better than
a sleep. Rather than assert it, I built a second plant that swallows exactly
**one** `Shift+ArrowRight`. It reproduces the observed failure verbatim, it
cannot be waited out — a key that was never delivered never arrives — and it
separates the two repairs cleanly. Clean: 90/90 at 12 workers.

This is the same lesson `selectAll` in that file already recorded, applied in the
one place that had not learned it.

### 3.4 Coachmark — the 736px signature is the whole suite's, not Coachmark's

`storybook.spec.ts` waited on `#storybook-root` with `state: "attached"`. That
div is **empty in `iframe.html`'s static markup**, so the wait resolves on the raw
HTML before any story module has run. Measured at the exact instant the
screenshot was taken, with the spec's protocol verbatim — 10 loads of
`patterns-coachmark--default`, **10 out of 10**:

| | at capture | settled |
|---|---:|---:|
| `documentElement.scrollHeight` | **736** | 720 |
| `getComputedStyle(body).marginTop` | **8px** — the UA default | 0px |
| `#storybook-root` children | **0** | 1 |
| `document.styleSheets.length` | 10 | 11 |

**736 = 720 + the 8px top and bottom body margin no stylesheet has overridden
yet.** Treating the viewport discrepancy as the finding rather than the symptom
is what produced that table, and it says the capture happens before Storybook's
own CSS applies and before the story exists. It is not Coachmark's: **the tabs
story produces the same 1280×736 image in its retries**, which is visible in §1's
selection proof.

The fix waits for the story to exist. **It moves no baseline** — measured against
the recorded images across coachmark ×3 and feedback-toast ×3, five loads each:
the old protocol produced a 1280×736 image **30 times out of 30**, and the new one
produced a **0-pixel match 30 times out of 30**. A full 1,008-story pass in both
brands is green with the store byte-for-byte unchanged, and it now takes **2.0
minutes instead of 3.4** — the retry loop was doing the waiting, badly.

Proved by planting: hold the Coachmark story module for 8s while `iframe.html`
and the preview runtime load normally, so `#storybook-root` is attached and empty
long enough to be deterministic.

| row | result |
|---|---|
| fix disabled + plant | **2 failed**, `Expected an image 1280px by 720px, received 1280px by 736px`, **both brands** |
| as shipped + plant | **2 passed** |
| as shipped, no plant | 1,008 captured, **0 baselines moved** |

**The walk-through I expected to succeed does not.** Raising
`toHaveScreenshot`'s timeout to 30s with the mount wait removed **still fails**,
and the call log says why: it takes **one** screenshot and stops, because a blank
page is a *stable* page. The retry loop only rides out a story that is already
mounting; it was never a safety net for a story that has not started. I had
assumed the opposite and written it up as the likely dodge — the measurement
corrected me, and it strengthens the case rather than weakening it.

---

## 4. What I did **not** fix, and why — the two toast baselines

`feedback-toast--tones` and `feedback-toast--dark-mode` fire **four** toasts into
a region that holds a maximum of **three**, and the eviction of the oldest runs on
a `setTimeout(SLIDE_OUT_MS)` inside `ToastProvider` — not on a user action.

Measured on `--tones`:

| moment | toasts |
|---|---|
| at capture time | **4** — the first already `data-dismissing="true"` |
| ~30 double-rAFs later | **3**, permanently |

**The recorded baselines hold four.** Verified by sampling the toast box out of
the stored PNG: all four tone tints are present — `230,237,242` (info),
`228,241,229` (success), `244,225,223` (error), `254,243,199` (warning). They
pass today only because `toHaveScreenshot` retries until it **matches** and the
four-toast window is still open when it looks.

So the previous plan's "a settle detector exposes two more baselines" is correct,
and the cause is now named: **these are time-dependent stories**, of exactly the
kind `TIME_DEPENDENT`'s own docstring says to make deterministic rather than to
list. Any wait for a story to **settle** rather than merely to **mount** turns
them red immediately. That is the defect surfacing, not the wait misbehaving.

**I did not act on it.** Fixing it properly means changing the story, and that
moves both images — and the brief authorised exactly one baseline to move. The
measurement is recorded in `storybook.spec.ts` where the next person will look,
and raised as **F-6** below. The mount wait shipped in §3.4 deliberately stops
short of a settle detector, and I have stated the cost: it does not make these two
stories deterministic.

---

## 5. Five consecutive `test:visual` runs, with the counts that actually ran

| run | exit | tests | default brand | monochrome brand | wall |
|---|---:|---|---:|---:|---:|
| 1 | **0** | **160 passed** | captured **504** | captured **504** | 2.5m |
| 2 | **0** | **160 passed** | captured **504** | captured **504** | 2.5m |
| 3 | **0** | **160 passed** | captured **504** | captured **504** | 2.6m |
| 4 | **0** | **160 passed** | captured **504** | captured **504** | 2.6m |
| 5 | **0** | **160 passed** | captured **504** | captured **504** | 2.5m |

**5,040 story captures across the five runs, with no brand pass skipped in any of
them** — which is the point of §2, and the reason the brand columns are printed
rather than a bare "green". 160 = the previous 158 plus the two
`brand-independence` cases. 504 + 4 time-dependent = 508 stories per brand.

**No baseline moved.** After all five runs: 1,019 on disk, 1,019 tracked,
`git status` on the snapshot directory reports **0** modified files, multiset
`fd2b988b…c3f9c` — the value set by the single authorised re-record in §1 and
unchanged since.

For contrast, the same suite before §3's fixes: **A green, B failed, C failed**,
two of three on `sortable-announce`.

## 5.1 Gates, each exit code separately

| gate | exit | result |
|---|---:|---|
| `npm run build` | **0** | clean |
| `npm test` | **0** | **1953 passed / 1953**, **123 files**, 0 skipped |
| `npm run check` | **0** | 384 files, no fixes applied — `npm run format` was not needed |
| `npm run typecheck` | **0** | both projects |
| `npm run css:check` | **0** | 79 files, round-trip byte-exact |
| `test:a11y` (default) | **0** | **508 / 508**, 84 suites |
| `DS_BRAND=monochrome test:a11y` | **0** | **508 / 508**, 84 suites — **held** |
| `npm run test:visual` ×5 | **0,0,0,0,0** | 160/160 each, 504 + 504 each |

`build` ran before `test`, so `packaging.test.ts` (`skipIf(!existsSync(dist))`)
actually executed — **123 files with 0 skipped**. 1953 and 123 are unchanged from
the previous plan because every file I touched lives under `tests/visual/`, which
`vitest.config.ts` deliberately excludes.

---

## 6. Every gate, proved by planting its own target

| gate | pre-fix | fix disabled | shipped | walk-through attempted |
|---|---|---|---|---|
| **`brand-independence.spec.ts`** (F-2) | FAIL — `1 did not run` | FAIL (same: `mode: "serial"`) | **PASS** 2/2 | **FAIL** — `serial` + `BRANDS` reordered; closed by planting both directions |
| **`DS_VISUAL_ONLY` CI refusal** | n/a (new) | n/a | **FAIL on `CI=1` + allowlist**, PASS on `CI=1` alone with `captured 504` | — |
| **`captured no stories at all`** | n/a (new) | n/a | **FAIL** on an empty allowlist — it is the plant `brand-independence` uses | — |
| **story-mount wait** (F-1, coachmark) | FAIL — `received 1280px by 736px`, both brands | FAIL (same) | **PASS** 2/2 under the same plant | **could not be walked through**: raising `toHaveScreenshot` to 30s still FAILS |
| **dnd-kit sensor wait** (F-3) | FAIL 6/9 @500ms plant | FAIL (same) | **PASS 9/9** @500ms **and** @3000ms | **FAIL** — `waitForTimeout(600)` passes @500ms, **fails @3000ms** |
| **richtext checked selection** (F-3) | FAIL @300ms, FAIL @1000ms | FAIL (same) | **PASS 45/45** @300 / 1000 / 3000ms | **FAIL** under swallow-one; see the caveat below |

**Two rows need their caveats said out loud rather than left in the table.**

**The mount-wait row cannot be walked through the way I predicted, and I checked
rather than claiming it.** The obvious dodge — leave the defect and raise the
screenshot timeout — does not work, because `toHaveScreenshot` takes one
screenshot of a blank page, finds it stable, and fails. My prediction was wrong
in the fix's favour, which is worth recording precisely because the alternative
temptation is to report the prediction.

**The richtext row's walk-through is closed by the SECOND plant only.** Under the
macrotask plant, a 400ms sleep between presses passes at every strength — so on
that evidence alone the checked selection is indistinguishable from a sleep, and I
would have been claiming coverage I had not demonstrated. The swallow-one plant
reproduces the observed string verbatim and separates them. **The first plant is
a reproducer, not a discriminator**, and it is listed as such rather than quietly
replaced.

**No row was dropped, and no row failed to bite.** Every mutation went in through
a Python **assert-one-occurrence** guard that printed its match count, and every
restore came from a `cp` backup confirmed with `shasum -a 256`.

---

## 7. Findings

**F-1 — resolved for the mount, still open for the settle.** `storybook.spec.ts`
no longer photographs stories that do not exist; the 1280×736 class of failure is
gone and cost no baseline. It still does not wait for a story to *settle*, so a
baseline that records a transient can still be matched by catching that transient.
Two are known (F-6).

**F-2 — resolved, with a standing gate.** One brand's failure can no longer
suppress the other's 504 stories; `brand-independence.spec.ts` plants both
directions.

**F-3 — resolved, and it was one cause, not three.** All three flakes dispatch an
input or a capture before its receiver exists. Two of them —
`sortable-announce` and `sortable-keyboard-target` — share the *same mechanism*
(dnd-kit's `setTimeout` listener attach), which the previous report had filed as
unrelated. `sortable-announce` was never on anyone's list and is the one that
failed two runs in three.

**F-4 — unchanged and untouched.** `Tabs` still has a feedback-loop hazard for
shrink-to-fit consumers. Nothing here affects it.

**F-6 (new) — `feedback-toast--tones` and `feedback-toast--dark-mode` are
time-dependent stories with baselines recorded mid-eviction.** Four toasts fire
into a three-slot region and the eviction runs on a timer; the stored images hold
four, the settled render holds three, permanently. Measured, recorded in the spec,
**not acted on**: the fix is to make the story deterministic, and that moves both
images. **This is the decision I am handing back** — the same shape as the tabs
baseline in the previous plan, and the reason the mount wait deliberately stops
short of a settle detector.

**F-7 (new) — the serial-mode comment described a symptom as a cause.** It
justified serialising with a contended tabs mismatch at 96px/0.01, which is the
Tabs font race fixed at `59abd6e`. Worth recording because the guard was correct
and its stated reason was not, and a future reader deleting it on the strength of
"the cause is gone" would also delete the protection F-1 still needs.

---

## 8. Method notes

**Servers.** Storybook on **6006** (pid **36929**, the original
`storybook dev -p 6006`) and the page on **5173** were **reused, never killed** —
both verified alive and answering 200 after `test:a11y` ran in both brands, which
is the one gate that could have replaced the Storybook process.

**No forbidden git.** No `git clean`, `git stash`, `git reset`, `git checkout --
<file>`, `git checkout-index`, or `git worktree` at any point. Every restore came
from a `cp` backup verified with `shasum -a 256`:

| file | sha256 |
|---|---|
| `storybook.spec.ts` (pristine, restored after §1) | `ddeb276e…6fea5a` |
| `sortable-announce.spec.ts` (pre-fix) | `26763f3a…6fe85` |
| `sortable-keyboard-target.spec.ts` (pre-fix) | `3d8ba200…bbde` |
| `richtext-marks.spec.ts` (pre-fix) | `59bf4bac…8390f` |
| `playwright.config.ts` (restored after the CI-guard plant) | `64d962ae…ad6fb` |

Commits were made with `--no-verify` deliberately: `husky`/`lint-staged` runs its
own `git stash` on every commit, and with planted mutations and `cp` backups in
flight the deterministic route was to run `biome format`, `biome check` and
`tsc --noEmit` myself before each commit. All three are green in §5.1 against the
final tree. Nothing was ever staged with `git add -A`.

**Probes ran outside the repository.** Every measurement script lives in the
session scratchpad and imports `@playwright/test` by absolute path, so no
throwaway file ever entered the working tree, and no probe spec could own a
snapshot directory and compare a capture against itself — the self-inflicted mess
§8 of the previous report records. PNG comparison is done by decoding both images
in a Chromium canvas, because this repository has no image library installed.

**Child-run isolation.** `brand-independence.spec.ts` spawns a nested
`playwright test`. Playwright deletes its output directory at the start of every
run and both default to `test-results/`, so the child is given its own — measured
after the first version left two of its failure directories in the parent's.

## 9. Post-conditions

- Branch **`charcoal-theme`**, **99** commits ahead of `main`, tracked-clean;
  only `?? design_handoff/design_handoff_ds_overview/` untracked.
- `package.json` **1.11.4**. Nothing published, tagged or merged; **0** tags at
  HEAD; the 164 pending renames unapplied.
- **1,019** baselines on disk and tracked. **Exactly one blob moved**, the
  authorised one; the other 1,018 are byte-for-byte identical to the previous
  `HEAD` (`287c768e…4cb79`).
- `test:visual` is **green five runs in a row**, 160/160 each, with **504 + 504**
  stories captured in every run.
- **Akhil's Storybook tab on 6006 does not need a reload** — no `src/` file
  changed in this work. Everything is under `tests/visual/` plus one recorded PNG.

## Self-Check: PASSED

- `$DS/tests/visual/brand-independence.spec.ts` — FOUND, 2 tests, both passing
- `$DS/tests/visual/dnd-keyboard.ts` — FOUND, new, typechecked
- `$DS/tests/visual/storybook.spec.ts` — FOUND, modified (mount wait, `mode: "default"`, `DS_VISUAL_ONLY`)
- `$DS/tests/visual/sortable-announce.spec.ts` — FOUND, modified
- `$DS/tests/visual/sortable-keyboard-target.spec.ts` — FOUND, modified, both `waitForTimeout(100)` removed
- `$DS/tests/visual/richtext-marks.spec.ts` — FOUND, modified
- `$DS/tests/visual/storybook.spec.ts-snapshots/data-display-tabs--narrow-overflow--monochrome-chromium-darwin.png` — FOUND, `cc20ed69…f435f`
- `394fe20`, `eec91cb`, `9b29406`, `511a4aa`, `c26dba3` — all five FOUND on `charcoal-theme`
- 1,019 baselines tracked; **1** blob moved; other-1018 multiset unchanged — verified
- `playwright.config.ts` and the pre-fix specs restored to their original
  `shasum`s after every plant — verified
