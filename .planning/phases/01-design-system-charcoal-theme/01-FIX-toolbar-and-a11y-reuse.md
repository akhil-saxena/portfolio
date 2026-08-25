# 01-FIX — the Theme toolbar, and a gate that lied about why it was red

Two developer-experience defects in `../design-system` on `charcoal-theme`. Both were
found by USE rather than by a gate, which is the only interesting thing they have in
common. Committed separately.

- `0fc448c` fix(storybook): make the Theme toolbar authoritative over a sticky background
- `0d1eec7` fix(test): let test:a11y reuse a Storybook that is already running (F-11)

Branch is now **104** commits ahead. `package.json` stays **1.11.4**, no publish, no tag,
no merge, the 164 renames stay unapplied. `?? design_handoff/design_handoff_ds_overview/`
is still the only untracked path.

---

## Job 1 — the Theme toggle only worked in one direction

### What depended on the backgrounds OR

**Nothing.** This was checked before the clause was removed rather than after, because
"it is load-bearing somewhere or it would not have been written" is a good prior and it
happened to be wrong here.

| Candidate dependent | Verdict | How it was established |
|---|---|---|
| Stories selecting dark via a backgrounds hex | **None** | `src/story-mode.test.ts` already fails the build on exactly this (`findHexDarkGlobals`, "no story requests dark by pinning a backgrounds hex instead of the theme global"). All ~70 dark stories use `globals: { theme: "dark" }`, converted in 01-19.1. |
| Playwright specs | **None** | Every `globals=` URL in `tests/` sets `theme:` and/or `brand:`. Grepped all 14 call sites. |
| The a11y runner | **None** | `.storybook/test-runner.ts`'s `prepare` builds `?id=<seed>&viewMode=story&globals=brand:${BRAND}`. It never sets a background. |
| `parameters.backgrounds.default` | **None** — and this is the one that looks like it should | Measured in a real browser: on a fresh boot with no toolbar selection, `globals.backgrounds` is **`null`**. `parameters.backgrounds.default: "light"` resolves inside the addon and never lands in the globals object. The five story files that declare their own `backgrounds.values` (Calendar, DatePicker, DateRangePicker, ColorInput, ColorPicker) all default to `"white"` and never reached the branch either. |
| CI | **None** | The only workflow is `publish.yaml`; it runs typecheck / check / build / test. No Storybook. |

**So it was removed, not made one-way — and there was no one-way version left to keep.**
`initialGlobals` always defines `theme`, so there is no "user has not expressed a
preference" state to distinguish from "user chose light". "An explicit theme wins over a
background suggestion" therefore reduces *exactly* to "theme wins": identical behaviour
to deleting the clause, with more code and a false implication that the suggestion still
does something. The convenience is gone deliberately, and the comment at the site says
why so the next person does not restore it as an obvious improvement.

### The second copy, which is why the commit touches `src/`

`src/OverviewPage.tsx` carried a byte-identical OR in `isDarkGlobals`, feeding a
`globalsUpdated` handler that writes `.dark` onto `document.documentElement` — **the same
element the preview decorator writes**, and it is last-writer on that page. Fixing
`preview.tsx` alone leaves the Theme toggle broken on the Storybook landing page.

The two files **mask each other, one direction each**, which the negative controls
measured directly:

- preview OR planted alone → the story rows fail, **the Overview row passes** (its
  handler corrects the decorator).
- OverviewPage OR planted alone → **the Overview row fails**, every story row passes.

I predicted the Overview row would fail under the preview-only plant. It did not. Worth
recording: it means neither file's defect is visible from the other's cell, and a gate
naming only one of them would have looked adequate.

### The proof, using the actual failure

`tests/visual/theme-toggle-authority.spec.ts`, 5 rows. The reported state is driven two
ways — once from the URL (`globals=theme:light;backgrounds.value:!hex(1c1917)`) and once
over the preview's own `updateGlobals` channel, which is what the toolbar emits.

Reproduced on the pre-fix tree, channel-driven with the background pinned:

```
bg -> #1c1917 : dark=true   theme=light      <- a background alone forced the theme
theme -> dark : dark=true
theme -> light: dark=true                    <- swallowed
theme -> dark : dark=true
theme -> light: dark=true                    <- the state Akhil was stuck in
```

Post-fix, same sequence: `false / true / false / true / false`, with
`globals.backgrounds.value` asserted still `#1c1917` at every step.

**Every browser row asserts the precondition before the defect** — that the dark
background global landed *and* that the addon actually painted `<body>`
`rgb(28, 25, 23)`. Without that, a Storybook which stopped honouring the globals
encoding would sit in plain light mode and the spec would pass having established
nothing.

| Plant | Result |
|---|---|
| preview OR restored | **FAIL 3** — reported state, toolbar sequence, source check |
| OverviewPage OR restored (preview left correct) | **FAIL 2** — Overview page, source check |
| as shipped | **PASS 5** |

### Flagged, not fixed

`parameters.backgrounds.values` are still `#f5f3f0` / `#1c1917` — the retired identity.
`12b723c`'s reasoning holds: pointing them at `var(--cream)` repaints the **story
canvas**, whose `#f5f3f0` body is recorded in all **1,019** baselines. Not touched.

What *has* changed is the stake. The decorator no longer reads that parameter at all, so
the wrong hexes are now cosmetic rather than load-bearing — a smaller problem, not a
solved one. A comment in `preview.tsx` records both halves at the site.

---

## Job 2 — F-11, `test:a11y` could not reuse a running Storybook

### The mechanism, proven without touching Akhil's server

`start-server-and-test` spawns its server command **unconditionally**. Demonstrated in
isolation with a harmless stand-in instead of a second Storybook — pointed at 6006 while
it was already answering 200, it still printed `SERVER-COMMAND-WAS-SPAWNED` and then ran
the test command. There is no reuse branch to lose.

I deliberately did **not** reproduce the full 37/508 end-to-end. Two Storybook dev servers
share `node_modules/.cache/storybook`, and corrupting that is a real risk to a session I
was told not to disturb. The isolated proof pins the same claim with none of the exposure;
the 37/508 figure is the previous agent's measurement and is not in dispute.

### The reuse behaviour, both shapes

`playwright.config.ts` uses `reuseExistingServer: !process.env.CI`. `scripts/storybook-runner.mjs`
spells the same rule the same way rather than inventing a second, subtly different policy:

| Condition | Strategy | argv |
|---|---|---|
| local, Storybook reachable | **attach** | `test-storybook --url <url>` |
| local, dead port | **spawn** | `start-server-and-test "npm run storybook -- --quiet --no-open --ci" <url> "<bin>/test-storybook --url <url>"` |
| **CI**, reachable or not | **spawn** | as above — the probe is not consulted at all |

Two details that are not decoration:

- **The probe is not a port check.** It fetches `index.json` and requires a parseable
  `entries` object, so an unrelated dev server holding 6006 cannot be attached to and its
  emptiness reported as a Storybook result. That is the same class of misleading green
  F-11 is about.
- **`--ci` on the spawned storybook.** Probe and spawn are not atomic; a Storybook started
  in the gap would put the pipeline back on the `(Y/n)` prompt. With `--ci` that becomes a
  loud `start-server-and-test` timeout instead of a silent hang.

`test:visual:capture` is **deliberately left** on `start-server-and-test`, and the gate
asserts that so the omission is on the record. Reuse is right for a read-only sweep and
wrong for a WRITE: that script overwrites 226 tracked PNGs under `tests/visual-baselines/`,
and capturing them against a hot-reloaded dev Storybook would bake a half-applied edit
into committed baselines. A capture starts cold.

### The gate, and the row that could not be made to bite

`src/storybook-runner.test.ts`, 6 rows. It binds a **real HTTP server on an ephemeral
port** and runs the real script as a **real child process**, because the failure was a
process/port interaction and a stubbed probe would only be checking the stub. Ephemeral
rather than 6006 so it is independent of both CI (nothing listening) and Akhil's machine
(Storybook listening).

| Plant | Result |
|---|---|
| reuse stripped from the runner | **FAIL 1** — attach row |
| `package.json` reverted to `start-server-and-test` | **FAIL 1** — script-wiring row |
| probe reduced to a bare port check | **FAIL 1** — impostor-server row |
| probe forced always-reachable | **FAIL 2** — cold-machine + impostor rows |
| CI guard removed from `planRun` | **FAIL 1** — direct-call row *(see below)* |
| CI probe-skip removed from `main()` | **FAIL 1** — CI row |
| as shipped | **PASS 6** |

**The row that could not be made to bite.** Deleting the `!ci &&` guard inside `planRun`
left all five original rows **green**. `main()` already forces `reachable = false` in CI,
so the CLI can never hand `planRun` the one combination that guard exists for —
`reachable: true, ci: true`. The CI policy is guarded twice on purpose; the gate could
only see one half of it. Fixed rather than merely reported: a sixth row calls `planRun`
directly, and `scripts/storybook-runner.d.mts` exists solely to make that call type-safe
and says so in its own docstring. The plant bites now.

**A prediction of mine that was wrong, and nearly shipped a vacuous gate.** The first
version used `execFileSync`. Every attach row failed at exactly the 2000 ms probe timeout.
`execFileSync` blocks *this* process's event loop, so the stand-in Storybook living in
this process could not accept the child's connection — the gate was asserting "not
reachable" against a server running perfectly, and would have gone green the moment I
"corrected" the expectation. It is `async` now and the docstring records why.

**Reuse observed in practice:** both a11y sweeps below printed
`[storybook-runner] reusing the Storybook already serving http://localhost:6006` and
finished in ~19 s. `lsof` confirms **pid 36929 still owns 6006**, unchanged, before and
after. Nothing on 5173 was touched.

---

## Gates — every exit code, run separately on the committed tree

| Gate | Exit | Result |
|---|---|---|
| `npm run build` | **0** | full tsup, 84 entries |
| `npm test` | **0** | **1962 passed, 124 files** (was 1956 / 123 — delta is exactly the 6 new rows in one new file) |
| `npm run check` | **0** | after `npm run format` + `biome check --fix` (formatter reflow + import order in the 3 new files) |
| `npm run typecheck` | **0** | both projects |
| `npm run css:check` | **0** | 79 files, round-trip byte-exact |
| `npm run test:a11y` | **0** | **508/508**, default brand, **attached** to the running instance |
| `DS_BRAND=monochrome npm run test:a11y` | **0** | **508/508**, **attached** |
| `npm run test:visual` | **0** | **167 passed** (was 162 — delta is the 5 new theme-authority rows), 504 + 504 captured per brand |

`npm run check` initially exited **1** on three formatting/import findings in the new
files; `npm run format` then `biome check --fix`, and every gate above was re-run after.

## Baselines — none moved

**1,019** before and after, reported three independent ways because a blob multiset alone
cannot detect two baselines swapping paths:

| Fingerprint | Before | After both commits |
|---|---|---|
| blob multiset (`git ls-files -s`, hashes only) | `fe53e321…` | `fe53e321…` |
| path+blob set (hash **and** path, sorted) | `7a7fe269…` | `7a7fe269…` |
| worktree content set (sha256 of every file on disk + path) | `a2fe0292…` | `a2fe0292…` |

1,019 tracked / 1,019 on disk / 953 unique blobs, unchanged. `git status` reports zero
modifications under `tests/visual/storybook.spec.ts-snapshots` or `tests/visual-baselines`.

## Method notes

- Every mutation went through a plant driver that copies from the clean shipped file,
  verifies the backup by `shasum`, asserts the anchor appears **exactly once**, and
  **exits non-zero if the output hashes identical to its input**. All 8 plants were
  re-verified against the committed tree after `lint-staged` had rewritten the files, in
  case formatting had moved an anchor. None had.
- Backups live in the scratchpad, not beside the file, so a stray `.clean` cannot be one
  `git add -A` away from being committed. No `git checkout --`, `git stash`,
  `git reset --hard`, `git worktree` or `git clean` was used. (`husky` runs `git stash`
  itself on every commit; `git stash list` is empty afterwards, both times.)
- The `pkg-revert` plant's mutated `package.json` hashed **identically to the pre-change
  original** (`d89ac3f8…`), which independently confirms the revert reconstructs the true
  pre-fix state rather than an approximation of it.

## For Akhil

**Reload the tab on 6006.** Job 1 changed `.storybook/preview.tsx` and
`src/OverviewPage.tsx`; the dev server has already hot-reloaded both — every measurement
above was taken against your running instance — but the browser tab has not. Job 2 needs
no reload, and your server was never restarted or killed.
