# F-8 — the cap counted the toasts that were already leaving

**Status: done.** `$DS` = `design-system`, branch `charcoal-theme`, **101 → 102**
commits ahead of `main`, tracked-clean apart from the known-harmless
`?? design_handoff/design_handoff_ds_overview/`. `package.json` stays **1.11.4**;
nothing published, tagged or merged; **0** tags at HEAD; the 164 pending renames
unapplied. **1,019 baselines on disk and tracked, blob multiset unchanged.**

| commit | what |
|---|---|
| `769acd8` | `fix(toast): count live toasts, not leaving ones, when enforcing the cap` |

**Every gate green.** One number moved deliberately and is called out rather than
buried: `npm test` is **1953 → 1956**, because the fix ships three regression
tests and those tests *are* the gate F-8 never had.

**Three things came out differently from my own predictions or from the standing
rules, and all three are in the body:** the defect **compounds** — a sixth toast
settles at **1 live**, not 2; `npm run test:a11y` **failed 37/508 for reasons that
had nothing to do with this fix**, and the cause is a property of the gate script
worth keeping; and the *existing* FIFO test turns out **not** to gate the 4-node
window it is cited as protecting.

---

## 1. The defect, reproduced on demand before anything was touched

The brief's discipline — *if you cannot make it fail on demand, you cannot claim to
have fixed it* — decided the order of work: the browser reproduction came first,
against the shipped component, with no fix and no test in the tree.

A probe drives `feedback-toast--default` through the burst by **clicking the real
story buttons** (each click is its own React event, so this is the burst a real
application produces, not a synthetic batch). After each step it reads the region:
`total` counts rendered `.ds-atom-toast` nodes, `live` counts only those *without*
`data-dismissing`. A `*` suffix marks a dismissing node.

**Pre-fix, 3/3 loads, identical every time:**

```
three       total 3  live 3   Changes saved,Save failed,Update available
four        total 4  live 3   Changes saved*,Save failed,Update available,Approaching usage limit
afterFifth  total 5  live 2   Changes saved*,Save failed*,Update available*,Approaching usage limit,Changes saved
settled     total 2  live 2   Approaching usage limit,Changes saved
```

**The region settles at 2 live where the cap is 3.** This reproduces F-8's reported
trace line for line.

The mechanism is one expression. `add()` computed

```ts
const overflow = prev.length + 1 - MAX_CONCURRENT;
```

At the fifth toast `prev` holds **four** entries — but one of them is the toast the
fourth call already marked `dismissing`, which is mid-slide-out and will delete
itself when its `scheduleRemoval` timer fires. `overflow` therefore computes as
**2**, and the FIFO loop — which *does* correctly skip dismissing candidates when
choosing *whom* to evict — dutifully evicts **two live toasts** because it was
handed the wrong count of *how many*. The eviction path was never wrong. Only the
arithmetic that drives it was.

### 1.1 The defect compounds — this was worse than the brief described

The brief asked me to check a sixth toast on the theory that "a fix that clamps
correctly at 5 but leaks at 6 is the same bug with a different threshold". Measuring
the *pre-fix* sixth answered a different and more useful question:

| pre-fix scenario | settled live | cap |
|---|---:|---:|
| 4 toasts | 3 | 3 |
| 5th inside the 200ms window | **2** | 3 |
| 6th also inside the window | **1** | 3 |

```
afterSixth  total 6  live 1   Changes saved*,Save failed*,Update available*,Approaching usage limit*,Changes saved*,Save failed
settled     total 1  live 1   Save failed
```

3/3 loads. Each toast arriving during a slide-out drags the settled count down by
one more, because each one leaves *more* dismissing nodes in `prev` for the next
one to miscount. A sustained burst drives the region toward showing **one** toast.
**I did not predict the 1-live figure before measuring it** — I expected the sixth
to stay at 2 — and it is the strongest argument for the fix: the further a real
application gets from the quiet case, the worse the component behaves.

### 1.2 The direction of the error, which is why nothing caught it

Every deviation is toward **fewer** live toasts. That is exactly why F-8 survived
1,019 baselines, 508 a11y assertions and 1,953 unit tests: a component that shows
too few toasts renders a *smaller* region, never an anomalous one, and no assertion
in the suite says "there should be three here". §5 confirms this from the other
direction — no baseline moves.

---

## 2. The fix

Count live toasts, not rendered nodes:

```ts
// Count only LIVE toasts. A node already marked `dismissing` is mid-slide-out
// and removes itself after SLIDE_OUT_MS, so it holds no slot. […] (F-8).
const live = prev.reduce((n, t) => (t.dismissing ? n : n + 1), 0);
const overflow = live + 1 - MAX_CONCURRENT;
```

Ten lines added, two removed, in `src/feedback/Toast/index.tsx` — five of them the
comment, two the docblock clarification below. **The eviction loop is untouched**;
it already picked oldest-non-dismissing-first and was already correct.

**Cap semantics are unchanged, and the docblock now says so out loud**, because
"max 3 concurrent" was the ambiguity the defect hid inside:

> Max 3 concurrent **LIVE** toasts; 4th added → oldest FIFO drops. A dropped toast
> keeps its node for `SLIDE_OUT_MS` while it animates out, so the region may
> briefly hold more than 3 nodes — but never more than 3 live ones.

**The 4-node window is preserved deliberately.** The brief was explicit that
`Toast.test.tsx` already encodes it as expected behaviour — its FIFO case advances
250ms of "drop animation grace" before asserting three — and §4.3 shows the new
tests now actively defend it.

### 2.1 Post-fix, same probe, same three loads

```
three       total 3  live 3
four        total 4  live 3   ← the deliberate window, unchanged
afterFifth  total 5  live 3   Changes saved*,Save failed*,Update available,Approaching usage limit,Changes saved
settled     total 3  live 3   Update available,Approaching usage limit,Changes saved
```

**Settles at 3 live, 3/3 loads.** Note `afterFifth` is now `total 5 / live 3` —
five nodes, two of them animating out, three live. The node count overshoots and
the *live* count does not, which is precisely the cap semantics stated above.

---

## 3. Both boundaries, in both directions

| scenario | pre-fix settled live | post-fix settled live | loads |
|---|---:|---:|---:|
| 4 toasts (the ordinary case) | 3 | **3** — unchanged | 3/3 |
| 5th inside the window | 2 | **3** | 3/3 |
| **6th** also inside the window | 1 | **3** | 3/3 |
| **5th after the window closes** | 3 | **3** — unchanged | 3/3 |

**The sixth clamps at 3, it does not leak.** Post-fix it reads
`afterSixth  total 6  live 3` — six nodes, three of them mid-animation, three live —
then settles to `total 3 live 3`. The threshold does not move with the burst
length, which is the failure mode the brief asked me to rule out.

**The after-window case is genuinely unchanged, in both trees.** Once the slide-out
completes there is no dismissing node, so `prev.length` and the live count are
equal and the old expression was already right. The probe waits on the component's
own marker rather than on a duration:

```js
await page.waitForFunction(() => document.querySelector('[data-dismissing="true"]') === null);
```

Its `windowClosed` step reads `total 3 live 3` before the fifth is fired, which is
what makes it a real *after*-the-window measurement rather than a hopeful sleep.

---

## 4. The gate, and proof that it bites

**No story exercises this path and no baseline depends on it** — so a new unit gate
was the only thing that *could* fail on the old calculation. Three tests were added
to `src/feedback/Toast/Toast.test.tsx`, driving the burst through fake timers via a
small `CaptureApi` helper that hands the imperative api back to the test so toasts
can be fired across separate `act()` calls.

The jsdom model agrees with the browser to the toast: **2 live** at the fifth,
**1 live** at the sixth.

### 4.1 The required sequence

| step | tree | result | exit |
|---|---|---|---:|
| **FAIL pre-fix** | tests added, component untouched | **2 failed / 13** — `expected 2 to be 3`, `expected 1 to be 3` | **1** |
| **PASS on shipped** | fix applied | **13 passed / 13** | **0** |
| **FAIL with the fix disabled** | `prev.length` restored by plant | **2 failed / 13** — same two assertions, same numbers | **1** |
| **PASS after restore** | `cp` from backup | **13 passed / 13** | **0** |

The plant is the brief's own instruction — restore `const overflow = prev.length + 1
- MAX_CONCURRENT;` — and it was verified **on disk**, not assumed:

```
shipped sha : 2111774a0a06418d363a627f560a62fd4c223518f102f0af0625b5ac25d4d415
planted sha : 5d59539b6bd9cafca80e717b5db6ecdee56cae7798e049f01c0f595980d19fd5
ASSERT changed: PASS (planted != shipped)
139:  const overflow = prev.length + 1 - MAX_CONCURRENT;   ← read back from the file
grep -c "prev.reduce" → 0                                  ← the fix is genuinely gone
```

Every plant in this session ran through a Python driver that **copies from the
known-clean shipped file first, asserts the anchor appears exactly once, and aborts
with exit 2 if the resulting file hashes identical to its input.** That is the
direct answer to the previous agent's silent no-op plant: a plant that changes
nothing now fails loudly instead of reporting green.

### 4.2 The row that cannot be made to bite — and I predicted it

**`a fifth toast after the window closes is unaffected (F-8 control)` passes on the
old calculation, and passes on the new one.** It cannot be made to fail by the
primary plant, by construction: with no dismissing node present the two expressions
are arithmetically identical. I predicted this before running it and the prediction
held. It is carried as a **control**, not as a defect gate — it exists to prove the
fix did not disturb the ordinary path — and §4.3 shows it does bite other mutations.

The pre-existing `4th toast drops the oldest (FIFO max=3)` is likewise unaffected by
the primary plant, for the same reason: at the fourth toast nothing is dismissing.

### 4.3 Walking through the gate — three near-miss "fixes"

Beyond the plant the brief mandated, I tried to get a *plausible* wrong fix past the
gate. All three were caught; each was planted from the clean shipped file with the
same shasum assertion.

| variant | mutation | caught by | failures |
|---|---|---|---:|
| **W1** | `overflow = live - MAX_CONCURRENT` — counts live correctly, off by one, so the 4th never evicts | all three new tests **+ the existing FIFO test** | 4 |
| **W2** | FIFO loop walks `prev` backwards — evicts the **newest** live toast | all three new tests **+ the existing FIFO test** | 4 |
| **W3** | dropped node removed **immediately** (`filter`) instead of animated out | **only the new F-8 test** | 1 |

**W3 is the finding here.** It destroys the 200ms slide-out window entirely, and the
existing FIFO test — the one the brief cites as encoding that window as expected
behaviour — **passes anyway**, because it advances 250ms of grace *before* it looks
and so cannot see the window at all. The only assertion that catches it is the new
one:

```
AssertionError: expected { total: 3, live: 3 } to match object { total: 4, live: 3 }
-   "total": 4,
+   "total": 3,
```

So the contract the previous agent correctly identified and told me not to break was,
until this commit, **documented but ungated**. It is gated now. That is a second,
unasked-for reason this fix is worth its test file.

---

## 5. No baseline moved — as predicted

The brief was explicit that a moving baseline would mean a story *does* exercise
this path and the diagnosis is incomplete. Nothing moved, across **two** full
visual runs:

| | value |
|---|---|
| on-disk PNGs | **1,019** |
| tracked PNGs | **1,019** |
| `git status` in the snapshot dir | **0 modified** |
| blob multiset | `fe53e3216143029ec02601ac431caa242e857c900d896cc4fcfb594c506b0e95` |
| path+blob set | `7a7fe269e8faa31967a3783e9490817c0d3ac869ffba137f18d1916a8d5e3809` |

Both hashes are **byte-identical to the values recorded before any file was
touched**, and the multiset matches the `fe53e321…6b0e95` set by the authorised
re-record in the previous plan. The path+blob set is reported alongside the multiset
because a multiset alone cannot detect two baselines swapping paths.

This is the expected result and it corroborates §1.2: the four Toast baselines are
captured *after* the settle wait, in the quiet 3-live state, which the fix does not
change.

---

## 6. Gates, each exit code separately

| gate | exit | result |
|---|---:|---|
| `npm run build` | **0** | clean, `DTS ⚡️ Build success in 29524ms` |
| `npm test` | **0** | **1956 passed / 1956**, **123 files**, 0 skipped |
| `npm run check` | **0** | 385 files, **no fixes applied** — `format` was never flagged |
| `npm run typecheck` | **0** | both projects (`tsc --noEmit` + `tsconfig.test.json`) |
| `npm run css:check` | **0** | 79 files, round-trip byte-exact |
| `test:a11y` (default) | **0** | **508 / 508**, 84 suites — see §6.2 |
| `DS_BRAND=monochrome test:a11y` | **0** | **508 / 508**, 84 suites — **held** |
| `npm run test:visual` ×2 | **0, 0** | **162 / 162** each, **504 + 504** captured each |

`build` ran before `test`, so `packaging.test.ts` (`skipIf(!existsSync(dist))`)
executed — **123 files, 0 skipped**, unchanged.

### 6.1 `npm test` moved 1953 → 1956, deliberately

The standing rules quote **1953**. It is now **1956**: the three regression tests of
§4. **File count is unchanged at 123** — the tests were added to the existing
`Toast.test.tsx`, no new file. This is the one figure in the standing set that the
fix is *supposed* to move; a fix to a behaviour with no gate cannot both close the
defect and leave the test count alone. Flagging it rather than letting a future
agent read 1956 as drift.

### 6.2 `npm run test:a11y` failed 37/508 on the first attempt, for reasons unrelated to this fix

**This is a finding about the gate script, not about the component**, and it is the
one result in this session I did not see coming.

The first run of `npm run test:a11y` reported **37 failed / 508**, across
Breadcrumbs, Timeline, EmptyState, Button and ConfirmDialog — five suites with no
connection to Toast. Every failure was the same, and **none of them was an
accessibility violation**:

```
page.evaluate: TypeError: globalThis.__getContext is not a function
  at getStoryContext (node_modules/@storybook/test-runner/dist/index.js:10160:15)
  at postVisit (.storybook/test-runner.ts:137:68)
```

The cause is in `package.json`, not in the tree:

```
"test:a11y": "start-server-and-test \"npm run storybook -- --quiet --no-open\" http://localhost:6006 \"DS_TEST_MODE=a11y test-storybook\""
```

With Akhil's Storybook already holding 6006, `start-server-and-test` still launches
its own, which stalls on an **interactive prompt** — captured verbatim in the run
log:

```
? Port 6006 is not available. Would you like to run Storybook on port 6007 instead? › (Y/n)
```

while the runner proceeds against the *existing* server. The competing process
destabilises the shared preview long enough for `__getContext` to go missing in
`postVisit`.

**`test:visual` is immune, and the reason is one line of config:**
`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so it attaches to
6006 instead of contending for it. `test:a11y` has no equivalent.

The workaround — used for both brands, and what the 508/508 rows in §6 were produced
by — attaches directly and spawns nothing:

```bash
DS_TEST_MODE=a11y npx test-storybook --url http://localhost:6006
DS_BRAND=monochrome DS_TEST_MODE=a11y npx test-storybook --url http://localhost:6006
```

Both returned **508 / 508, 84 suites, exit 0** on the same tree that had just
reported 37 failures — which is what establishes the 37 as an artefact. The
monochrome run additionally passed the per-story brand assertion in
`test-runner.ts:115` (`<html data-brand>` must equal `DS_BRAND`), so the monochrome
sweep really did run in monochrome and is not 508 default-brand results under a
monochrome label.

**Recommendation, not applied here** (it edits a gate this brief did not
authorise): give `test:a11y` the same reuse semantics as `test:visual`, either by
dropping `start-server-and-test` in favour of the direct invocation above, or by
having it detect an answering 6006 first. As it stands the a11y gate is
**unreliable whenever a developer has Storybook open**, which is most of the time —
and it fails in a shape (`__getContext`, spread across unrelated suites) that reads
like a real regression.

---

## 7. Findings

**F-8 — RESOLVED.** `add()` now computes overflow from the live count.
Reproduced at 2 live before the fix and 1 live at the sixth toast (3/3 loads each),
settles at 3 live after it (3/3), both boundaries clamp, the ordinary four-toast
case and the 200ms window are unchanged, and no baseline moved. Gated by three
tests that FAIL on the previous calculation.

**F-10 (new) — `scheduleRemoval` is called from inside a `setToasts` updater.**
`add()` runs `for (const dropId of ids) scheduleRemoval(dropId);` *within* the state
updater function, which is impure: React may invoke an updater more than once, and
under `StrictMode` it does. Today this is **benign** — the duplicate timer runs the
same `filter((t) => t.id !== id)` and is idempotent — so it changes no behaviour and
I did not touch it. It is worth recording because the impurity is one refactor away
from mattering (any removal that is not idempotent, e.g. a counter or an
announcement, would fire twice), and because the same shape sits in the shipped
`startDismiss`. **Not fixed: out of scope for this brief.**

**F-11 (new) — the `test:a11y` gate is unreliable against an occupied port 6006.**
§6.2. 37/508 infrastructure failures, zero axe violations, on a tree that scores
508/508 when the runner attaches to the existing server. `test:visual` is unaffected
because of `reuseExistingServer`. Handing back with a concrete recommendation rather
than editing the gate.

**F-12 (new) — the 4-node slide-out window was documented but ungated.** §4.3, W3.
The existing FIFO test cannot see the window it is cited as protecting, because it
advances 250ms of grace before asserting. A mutation that removes dropped toasts
instantly passed every test in the repository until this commit. The new F-8 test's
`total: 4` assertion now closes that hole.

**F-6, F-9 — unchanged and untouched.** The settle detector in `storybook.spec.ts`
and the `toHaveScreenshot` 100ms-stability property are exactly as the previous plan
left them. Nothing here touches `tests/visual/`.

**F-4 / F-7 — unchanged and untouched.**

---

## 8. Method notes

**Servers.** Storybook on **6006** (pid **36929**, the original
`storybook dev -p 6006 --quiet --no-open`) and the page on **5173** were **reused,
never killed** — both verified answering 200 before the work, and `pid36929=alive`
checked after the aborted `test:a11y`, after both direct a11y sweeps and at exit.
The competing Storybook that `start-server-and-test` spawned (§6.2) exited on its
own; a process listing afterwards shows only `36912 → 36929`, Akhil's pair.

**Akhil's Storybook tab DOES need a reload this time.** Unlike the previous plan,
this one changes a `src/` file (`src/feedback/Toast/index.tsx`), so Vite pushed an
HMR update to any open tab. The probes each opened fresh pages and picked the fix up
correctly — the post-fix 3-live measurements are proof the served module is the
fixed one — but a tab left open from before the commit may be running a
half-patched module graph. A plain refresh is enough; **no restart is needed** and
the process must not be killed.

**No forbidden git.** No `git clean`, `git stash`, `git reset`, `git checkout --
<file>`, `git checkout-index`, or `git worktree` at any point. Every restore was a
`cp` from a backup verified with `shasum -a 256`, and every restore asserted the
result equals the expected hash:

| file | sha256 |
|---|---|
| `Toast/index.tsx` (pristine, pre-fix) | `90fbd597…958e8162` |
| `Toast/index.tsx` (shipped, restore point) | `2111774a…25d4d415` |
| `Toast/index.tsx` (planted, `prev.length`) | `5d59539b…80d19fd5` |
| `Toast/index.tsx` (planted, W1 / W2 / W3) | `a5e860e4…` / `951fc0e9…` / `9c00f47e…` |
| `Toast.test.tsx` (pristine, pre-tests) | `bde041ad…75e2be08` |
| `Toast.test.tsx` (shipped) | `febdacd8…5b817714` |

Nothing was staged with `git add -A`; the two files were staged by name. The commit
used `--no-verify` for the established reason — `husky`/`lint-staged` runs its own
`git stash` — with `biome check` (385 files, no fixes) and `tsc --noEmit` run by hand
against the final tree first, both in §6.

**Probes ran outside the repository.** The burst probe and the plant driver live in
the session scratchpad and import Playwright by absolute path, so no throwaway file
entered the working tree.

**On zsh word-splitting.** The previous agent's plant silently copied nothing
because zsh does not word-split unquoted variables. Every plant here is performed by
Python with an explicit anchor-count assertion and a before/after hash comparison
that exits non-zero on a no-op, so the class of failure cannot recur silently. The
same care applied to shell globs: `grep --include=*.tsx` unquoted fails outright
under zsh (`no matches found`) and had to be quoted.

## 9. Post-conditions

- Branch **`charcoal-theme`**, **102** commits ahead of `main`, tracked-clean; only
  `?? design_handoff/design_handoff_ds_overview/` untracked.
- `package.json` **1.11.4**. Nothing published, tagged or merged; **0** tags at HEAD;
  the 164 pending renames unapplied.
- **1,019** baselines on disk and tracked; blob multiset **and** path+blob set
  byte-identical to the pre-work values. **No blob moved.**
- Commit `769acd8` touches exactly **two** files, **0 deletions**
  (`git diff --diff-filter=D HEAD~1 HEAD` empty).
- `test:visual` green **twice**, 162/162 each, 504 + 504 captured each.

## Self-Check: PASSED

- `$DS/src/feedback/Toast/index.tsx` — FOUND, modified (live-count overflow + docblock), `2111774a…25d4d415`
- `$DS/src/feedback/Toast/Toast.test.tsx` — FOUND, modified, 13 tests (was 10), all passing, `febdacd8…5b817714`
- `769acd8` — FOUND on `charcoal-theme`; 2 files, +163 / −2, no deletions
- defect reproduced at **2 live** pre-fix and **1 live** at the sixth, 3/3 loads each — verified in the browser
- fixed behaviour **3 live**, 3/3 loads, both boundaries, ordinary case unchanged — verified
- gate proven: FAIL pre-fix → PASS shipped → FAIL planted → PASS restored, plus 3 walk-through variants all caught
- every plant asserted to have changed the target's shasum away from shipped — verified, incl. one driver-level no-op guard
- 1,019 baselines, multiset `fe53e321…6b0e95` and path+blob `7a7fe269…8d5e3809` unchanged vs pre-work — verified
- `Toast/index.tsx` restored to its shipped shasum after every plant — verified, four times
- Storybook pid 36929 and port 5173 alive at exit — verified
