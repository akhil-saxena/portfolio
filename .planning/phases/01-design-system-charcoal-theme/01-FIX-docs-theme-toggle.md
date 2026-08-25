# 01-FIX — the docs Theme toggle, and a root cause that was not the one I was given

`../design-system` on `charcoal-theme`, now **109** commits ahead (was 104).
`package.json` stays **1.11.4**; no publish, no tag, no merge, the 164 renames
stay unapplied. `?? design_handoff/design_handoff_ds_overview/` is still the only
untracked path, `git stash list` is empty, no tag points at HEAD.

- `40ced9c` fix(storybook): stop a docs page's dark story deciding the whole page's theme
- `8c658ca` fix(storybook): spell documentElement out, so E29's AST guard can still see it
- `94a7100` test(visual): drive the theme toolbar in docs mode, where it was actually broken
- `afdff49` test(visual): report every transition in a red docs row, not just the first
- `ba98393` test(visual): a dark story on a LIGHT docs page must still render dark

---

## The brief's root cause was wrong, and the fix it prescribed would not have worked

I was told: `preview.tsx:197` performs a global side effect during render, and **on
docs pages story blocks do not re-render when globals change**, so the first render
sets `.dark` and nothing removes it. The prescribed fix was a `globalsUpdated`
subscription.

I instrumented the decorator — a temporary `window.__decoLog.push({ id, viewMode,
merged, user })`, planted and restored from a `shasum`-verified backup — and drove
the real toolbar in the manager. Every globals change on `/docs/inputs-button--docs`:

```
-- Theme=Dark   -> html.cls=dark    (8 decorator runs)
     inputs-button--default    vm=docs merged={"theme":"dark","brand":"default"}  user={"theme":"dark"...}
     ... six more ...
     inputs-button--dark-mode  vm=docs merged={"theme":"dark","brand":"default"}  user={"theme":"dark"...}

-- Theme=Light  -> html.cls=dark    (8 decorator runs)
     inputs-button--default    vm=docs merged={"theme":"light","brand":"default"} user={"theme":"light"...}
     ... six more, all light ...
     inputs-button--dark-mode  vm=docs merged={"theme":"dark","brand":"default"}  user={"theme":"light"...}   <-- LAST
```

**The decorator ran eight times, once per story block, and it ran on every change.**
It did not fail to re-run. `<html>` is one element and a docs page renders every
story of the component onto it. `inputs-button--dark-mode` carries
`globals: { theme: "dark" }`, so its merged globals said dark whatever the toolbar
said, and it rendered **last**. This is a last-writer race between story blocks on a
shared global, not a stale render.

Two consequences, and both matter more than the label:

**The prescribed fix alone does not fix it.** A `globalsUpdated` handler fires
*before* React re-renders the blocks, so the dark block still overwrites it
afterwards. Measured, not argued — plant P3 below leaves the subscription fully in
place, restores only the decorator's merged-globals read, and the docs row goes red.

**The control page proves the mechanism.** `/docs/foundation-divider--docs` has no
story pinning dark, and all eight of its transitions worked on the pre-fix tree. The
axis that stuck was exactly the one a story-level override contradicted.

### What the brief actually measured, reconciled rather than dismissed

The brief's numbers were real; the inference from them was not. In a **bare
`iframe.html`** in docs mode, an `updateGlobals` emit **reloads the document** —
measured twice, by setting `window.__marker = "ALIVE"` and reading it back:

| driver | mode | marker after a globals change |
|---|---|---|
| bare `iframe.html`, channel emit | docs | **GONE** (document replaced) |
| manager toolbar | docs | **GONE** (preview iframe re-navigated) |
| manager toolbar | story | ALIVE (re-render in place, `replaceState` only) |

So in docs mode there is nothing left to observe re-rendering: the decorator log,
the marker, every in-page probe is destroyed. What survives is `<html class="dark">`
— written afresh, on the new document, by the dark block that rendered last.
"Decorator did not re-run" is the correct reading of that evidence and the wrong
conclusion from it.

### The store read that looked like a smoking gun

The brief reports `__STORYBOOK_PREVIEW__`'s store reading `light` while the class
was `dark`, and concludes Storybook's global was correct and only the class was
stale. It reads `storyStore.userGlobals.globals` — the **toolbar's** selection.
The decorator sees `context.globals`, the toolbar's selection **merged with the
current story's own override**. For the dark block those two legitimately disagree,
permanently. The store was not lagging; it was answering a different question.

---

## The fix

`<html>` now reflects the **page**, not whichever story last rendered onto it.

```
applyChrome(globals)            the one writer of <html class="dark"> and <html data-brand>
  decorator      viewMode === "docs" ? context.userGlobals : context.globals
  subscription   channel.on("globalsUpdated", ({ globals }) => applyChrome(globals))
```

**In docs mode the toolbar owns `<html>`.** The decorator applies
`context.userGlobals` — the un-merged toolbar selection — so all eight blocks write
the *same* value and the last-writer race becomes a no-op rather than being raced
more carefully. **In story mode the canvas holds exactly one story**, so its merged
globals *are* the page's and `context.globals` stays authoritative; that is what the
~70 dark stories and all 1,019 baselines depend on, and it is byte-for-byte
unchanged.

`context.userGlobals` exists on the runtime context — it is in
`Object.keys(context)`, verified in a browser — but Storybook 8.6 declares it only
on `GlobalsUpdatedPayload`, never on `StoryContext`. The cast is isolated in one
`userGlobalsOf` helper with a comment saying which four rows fail if its fallback is
ever taken.

### The mechanism I subscribed to, and how one event covers both first paint and updates

`globalsUpdated`, via `addons.ready()`. Not `setGlobals` as well, and not a
boot-time hook — because **`globalsUpdated` already fires at boot**. Measured on a
real preview boot, with the listener armed by an init script before any Storybook
script ran:

```
setGlobals      globals={"theme":"dark","brand":"monochrome"}                                   t=+85ms
globalsUpdated  globals={...} userGlobals={...} storyGlobals={"theme":"dark"}                   t=+118ms
```

Both land **before the first story renders**, and `globalsUpdated` fires again on
every toolbar change. That is one mechanism covering both halves, which is what the
brief invited me to prove rather than assume.

The payload needs no view-mode branch either, and that is measured, not lucky:
`payload.globals` is already correct for both modes. In story mode it is merged with
the current story's override; in docs mode `storyGlobals` is `{}`, so it equals the
toolbar's selection.

```
STORY (plain)       globals={"theme":"light","brand":"monochrome"}  storyGlobals={}
STORY (dark-pinned) globals={"theme":"dark", "brand":"monochrome"}  storyGlobals={"theme":"dark"}
DOCS                globals={"theme":"dark", "brand":"monochrome"}  storyGlobals={}
```

`addons.ready()` rather than `addons.getChannel()`: preview annotations are imported
before the preview entry calls `setChannel`, so `getChannel()` throws at module
scope. `ready()` resolves on the microtask after it, ~85 ms ahead of the first event.

### Brand and mode still in one pass, and first paint still correct

Both callers invoke the same `applyChrome`, which sets the class and the attribute in
consecutive statements with nothing between them. It is a single function precisely
so the two cannot drift apart — splitting them paints a frame in the wrong brand,
which is the flash D-34's no-flash module exists to remove, and would make every
first-frame screenshot unreliable.

**First paint is covered twice, deliberately, by two callers that cannot disagree.**
The decorator keeps applying on its own render, so a docs page is correct even if the
`ready()` promise ever settled late; the subscription covers the one page the
decorator cannot reach. Verified across 20 URL-driven cells, all correct:

```
inputs-button--docs      docs  url=light/default    -> cls=(none) brand=(none)      ok
inputs-button--docs      docs  url=dark/monochrome  -> cls=dark   brand=monochrome  ok
overview--docs           docs  url=dark/default     -> cls=dark   brand=(none)      ok
inputs-button--dark-mode story url=light/default    -> cls=dark   brand=(none)      ok   <- story pin beats a light toolbar
inputs-button--dark-mode story url=light/monochrome -> cls=dark   brand=monochrome  ok
... 15 more ...
failures: 0
```

`initialGlobals` is untouched (`{ theme: "light", brand: "default" }`), `isDark` is
still just `context.globals.theme === "dark"`, and nothing reintroduces the
backgrounds coupling — the existing source row in the spec still forbids it and
still passes.

---

## Was brand stuck too? No — and the reason IS the mechanism

The brief's presumption is the obvious one: same decorator, same pass, so if mode was
stuck brand almost certainly was. **Measured, it was not.** On the same
`/docs/inputs-button--docs`, pre-fix, all four brand transitions worked while both
Light transitions failed.

Because **no story in this repo overrides `brand`**. All eight blocks always agreed
on it, so there was nothing to race. The stuck axis was the one, and only the one,
that a story-level override contradicted. That is now a row of its own, asserted
rather than assumed, because it is exactly the presumption a future reader will make.

**Brand was broken, though — on a different page, by a different half of the same
defect, and Akhil has not reported that either.** `src/Overview.mdx` renders
`<OverviewPage />` and **zero** `<Story>` blocks, so the decorator never runs there
at all. Pre-fix:

```
/iframe.html?id=overview--docs&viewMode=docs&globals=theme:dark;brand:monochrome
   ->  html.cls=(none)   data-brand=(none)
```

The Storybook landing page, the first page anyone opens, took **neither** global at
first paint. The theme half was masked because `OverviewPage` carries its own
`globalsUpdated` handler that writes the class; nothing ever applied the brand, at
any theme, ever. That page is the whole reason the subscription is load-bearing
rather than belt-and-braces, and plant P2 isolates it.

---

## All four transitions, both modes, the real toolbar

Driven by clicking the actual Theme and Brand menus in the manager at
`/?path=...`, which is what Akhil does. `l` = `<html>` has no class, `D` = `.dark`.

| page | mode | pre-fix | shipped |
|---|---|---|---|
| `foundation-divider--default` | story | `D l D l` ✓ | `D l D l` ✓ |
| `foundation-divider--docs` (no dark story) | docs | `D l D l` ✓ | `D l D l` ✓ |
| **`inputs-button--docs`** (has a dark story) | docs | `D **D** D **D**` ✗ | `D l D l` ✓ |
| `overview--docs` (zero story blocks) | docs | `D l D l` ✓ | `D l D l` ✓ |

Brand, same four pages, `Monochrome / Default / Monochrome / Default`:

| page | pre-fix | shipped |
|---|---|---|
| `foundation-divider--default` (story) | ✓ ✓ ✓ ✓ | ✓ ✓ ✓ ✓ |
| `inputs-button--docs` | ✓ ✓ ✓ ✓ | ✓ ✓ ✓ ✓ |
| **`overview--docs`** | **✗ ✓ ✗ ✓** (never applied) | ✓ ✓ ✓ ✓ |

A one-way control passes any test that only drives light→dark. Every row here drives
`Dark, Light, Dark, Light` — both directions, twice each — for exactly that reason.

---

## Why the docs rows drive the manager, which is the most important design decision in the gate

Two cheaper drivers were measured and both are unusable, and a gate built on either
would have looked green on a broken build.

**`updateGlobals` on a bare `iframe.html`** reloads the docs document, so the state
under test is destroyed before it can be read.

**A fresh navigation to `iframe.html?...&globals=theme:light`** *is* the defect's own
race, and sampling it is a coin flip. Six trials, pre-fix:

```
bare iframe docs, theme:light, wait 3s          light light DARK light light light
bare iframe docs, theme:light, scroll+wait 4s   light light light light light light
bare iframe docs, theme:dark                    DARK  DARK  DARK  DARK  DARK  DARK
```

One red in six — and scrolling to force every block to mount made it **six greens in
six**, i.e. the "more thorough" version of that row would have hidden the bug
completely.

**The manager toolbar is deterministic.** Six trials, `Dark` then `Light`:

```
manager toolbar Dark,Light pairs (Dl = fixed, DD = bug):   DD DD DD DD DD DD
```

Six of six. That is the only driver that makes this bug bite every time, so it is the
one the docs rows use, and the reasoning is recorded at the helper so nobody
"simplifies" it back to a navigation.

---

## The gate, and proving it bites

`tests/visual/theme-toggle-authority.spec.ts`, **11 rows** (5 pre-existing, 6 new).
Every plant went through a driver that copies from a `shasum`-verified clean source,
asserts its anchor appears **exactly once**, and **exits non-zero if the output
hashes identical to its input**. The `render-only` plant's output hashed
`538cb5c6…`, byte-identical to `git show 0d1eec7:.storybook/preview.tsx` — so it is
the true pre-fix file, not an approximation of it.

| plant | what it restores | result |
|---|---|---|
| **P1 `render-only`** | the entire pre-fix `preview.tsx` | **FAIL 3** — docs transitions, overview brand, first paint |
| **P2 `no-subscription`** | keeps the view-mode-aware decorator, deletes only the subscription | **FAIL 2** — overview brand, first paint |
| **P3 `docs-uses-merged-globals`** | keeps the subscription, decorator reads merged globals in docs | **FAIL 1** — docs transitions |
| **P4 `wrapper-brand-only`** | drops the `pageIsDark` qualifier | **FAIL 1** browser (monochrome half) **+ 1** unit |
| as shipped | — | **PASS 11** |

The split between P2 and P3 is the interesting result and it is the honest one:

- **P3 proves the subscription alone does not fix the reported bug.** With
  `globalsUpdated` fully wired, the docs row still fails on
  `docs: Theme=Light did not reach <html>`. The brief's prescribed mechanism is
  necessary but not sufficient.
- **P2 proves the decorator alone does not fix the whole defect.** The docs
  transitions go green, but `overview--docs` stays broken — nothing applies the
  brand on a page that renders no story blocks.

Neither half is visible from the other's cell. A fix with only one of them, and a
gate naming only one page, would have looked adequate.

### The row that could not be made to bite

**`FIRST PAINT`, for the `inputs-button--docs docs theme:light` cell.** Under P1 it
failed in one run and passed in another. It is a *sample of the race*, and the race
is a coin flip — the same 1-in-6 measured above. It is left in the row because when
it does fail it names the mechanism precisely, but it is **soft** and it is not what
the row rests on: the deterministic evidence is `docs: Theme=Light`, which failed
twice out of two Light steps in every P1 run.

The overview cells in that same row are fully deterministic and did bite every time.

### A prediction of mine that was wrong, and cost a red gate to find

I made the transition assertions **hard** first. Planting `render-only`, the docs row
died on its `"the page did not start light"` precondition and **never ran the four
transitions at all** — because first paint on that page is itself a draw from the
race, and it happened to come up dark. My hard assertion on the flaky half was
hiding the reliable half. They are `expect.soft` now (`afdff49`), so one red row
reports every transition rather than the first symptom it happens to hit.

### An existing gate caught me, and it was right to

`applyChrome` first read `const root = document.documentElement` and then
`root.classList.toggle("dark", …)`. `src/story-mode.test.ts`'s `findDarkWrappers`
exempts `classList.add|toggle("dark")` only when the callee **text** ends in
`documentElement.classList.*` — E29's whole point being that `.dark` on anything but
the root re-declares fifty neutrals below the brand layer. An alias is invisible to a
static callee check, so it fired on a correct root write.

I fixed the code, not the guard (`8c658ca`). Widening `findDarkWrappers` to chase
aliases would have traded a real static check for a tidier local, and the alias was
hiding the one fact the gate exists to verify.

---

## Why `src/story-mode.test.ts` changed — stated plainly, not as an incidental edit

It asserts by literal that `preview.tsx` contains
`className={isMonochrome ? undefined : "dark"}`. The fix changes that expression to
`className={isMonochrome && pageIsDark ? undefined : "dark"}`, so the literal had to
move with it. **The assertion is restated, not relaxed**, and here is the argument
you should check rather than take:

The rule the test encodes is *"under monochrome the wrapper must not carry `.dark`,
because `tokens.css` declares `:root.dark, .dark` and
`:root[data-brand="monochrome"]` cannot reach inside a nested `.dark`."* The reason
that rule is safe is that `<html>` already carries the class. `&& pageIsDark` is that
premise made explicit rather than assumed.

**In story mode the two expressions are identical.** This branch only runs when
`isDark` is true, and in story mode `pageGlobals === context.globals`, so
`pageIsDark === isDark === true` and `isMonochrome && true` reduces to
`isMonochrome`. No baseline can move; none did.

They differ only in **docs** mode, which is a state that could not previously exist:
`<html>` now follows the toolbar, so a dark story can sit on a *light* docs page. With
the bare `isMonochrome` form that block renders **light under monochrome only** — a
regression this fix would otherwise have shipped. P4 plants exactly that and the new
browser row fails on the monochrome half alone.

**The cost, measured rather than waved off:** inside that wrapper `--cream` resolves
to the design system's `#181818`, not monochrome's `#161616`, because the brand layer
cannot reach in. Both brands read `rgb(24, 24, 24)`. On a docs preview that is a
shade; in a story-mode probe it would be a false reading, which is precisely why
story mode is left exactly as it was.

**It does not contradict `tests/visual/brand-isolation.spec.ts`**, which asserts that
under monochrome the only `.dark` element is `<html>`. That spec drives
`viewMode=story` throughout (`tests/visual/computed.ts:75`), where `<html>` *is* dark
and the wrapper is bare. Both statements are true; they describe different view modes,
and the new row says so at the assertion so the next reader does not have to
rediscover it.

Because that change was guarded only by a source literal, `ba98393` adds the browser
row. A literal assertion pins the spelling; only a browser can pin the pixel.

---

## Gates — every exit code, run separately on the committed tree

| Gate | Exit | Result |
|---|---|---|
| `npm run build` | **0** | full tsup, 79 CSS files / 220 KB, 193 JS files stamped |
| `npm test` | **0** | **1962 passed, 124 files** — unchanged; `story-mode.test.ts` edited an existing assertion, it did not add one |
| `npm run check` | **0** | first try, no `format` needed |
| `npm run typecheck` | **0** | both projects |
| `npm run css:check` | **0** | 79 files, round-trip byte-exact |
| `npm run test:a11y` | **0** | **508/508**, default brand, **attached** to pid 36929 |
| `DS_BRAND=monochrome npm run test:a11y` | **0** | **508/508**, **attached** |
| `npm run test:visual` | **0** | **173 passed** (was 167 — delta is exactly the 6 new rows), 504 + 504 captured per brand |

`npm run check` passed on the first attempt; `biome check --write` had already been
run on each file before staging, and `lint-staged` reformatted nothing at commit time
(`git diff HEAD` empty after every commit).

## Baselines — none moved

**1,019** before and after, reported both ways the brief asked for, because a blob
multiset alone cannot detect two baselines swapping paths:

| Fingerprint | Before | After all five commits |
|---|---|---|
| blob multiset (`git ls-files -s`, hashes only) | `fe53e3216143029e…` | `fe53e3216143029e…` |
| path+blob set (hash **and** path, sorted) | `7a7fe269e8faa319…` | `7a7fe269e8faa319…` |

1,019 tracked / 1,019 on disk / 953 unique blobs, unchanged. The 226 under
`tests/visual-baselines` are likewise unmoved (`3f0b8b0e…` / `4180886c…`).
`git status` reports zero modifications under either tree.

## Method notes

- No `git checkout --`, `git checkout-index`, `git stash`, `git reset --hard`,
  `git worktree` or `git clean` was used. `husky` runs `git stash` itself on every
  commit; `git stash list` is empty afterwards, all five times.
- Backups live in the scratchpad, not beside the file, so a stray `.clean` cannot be
  one `git add -A` away from being committed. `git add` named every path explicitly.
- Two plants **refused to run** rather than silently doing nothing: the
  `docs-uses-merged-globals` anchor had been reflowed onto one line by `biome`, and
  the driver threw `anchor not found` instead of writing an unmutated file. Anchors
  were re-derived from the committed text after `lint-staged` had formatted it.
- **One measurement had to be discarded.** An early `no-subscription` run reported
  **9 of 10** rows failing, including rows the plant cannot touch. The cause was
  Storybook's indexer, not the plant: `index.json` was returning 500 with
  `Could not parse import/exports with acorn` for ~70 story files. It recovered on
  its own within a minute, unprompted, with pid 36929 never restarted. Every plant
  run after that is bracketed by a health probe requiring `index.json` = 200 **and**
  more than 400 entries, before and after, and the honest P2 result (**FAIL 2**) is
  the re-run. A red gate whose redness has nothing to do with the change is worth as
  much as a green one that missed the defect.

## For Akhil

**Reload the tab on 6006.** `preview.tsx` changed and your dev server has already
hot-reloaded it — every measurement above was taken against your running instance —
but the browser tab has not. Your Storybook was never restarted or killed: pid
**36929** still owns 6006, uptime unbroken, and nothing on 5173 was touched.

Two things you have not reported that are now fixed, and worth a look:

1. **The Brand toolbar did nothing on the Storybook landing page.** Not stuck —
   never applied, at any theme, at first paint or after. That page renders no story
   blocks, so the code that applies the brand never ran on it.
2. **Dark stories inside a component's docs page** now render as a dark block on a
   light page, instead of turning the whole page dark. Under **monochrome** their
   neutrals are the design system's `#181818` rather than monochrome's `#161616` —
   deliberate, documented at the line, and the alternative was rendering them light.
