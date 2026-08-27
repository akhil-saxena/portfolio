---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01-12 (AppBar height exposed, 44px touch floor, component count reconciled)
last_updated: "2026-08-25T01:26:39.124Z"
progress:
  total_phases: 11
  completed_phases: 2
  total_plans: 59
  completed_plans: 58
  percent: 18
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-16)

**Core value:** The site must be the proof that the design system works — where bespoke and design-system conflict, the design system wins and the gap becomes an upstream finding.
**Current focus:** Phase 4 (Actions photo pipeline) — next. Phases 0–3 are closed. Phases 0, 1 and 2 are closed; the design system published as `2.0.0-beta.1` on the `next` dist-tag on 2026-08-25.

## Current Position

Phases 0, 1 and 2 are all in flight concurrently.

| Phase | Plans | Status |
|---|---|---|
| 00 design-ideation | **25 / 25 COMPLETE** | Both remaining are **human gates** (00-11 sketch review, 00-17 copy review). Playground deletion is parked behind them. One off-plan deliverable shipped: `00-RESPONSIVE-CONTRACT.md`. |
| 01 monochrome theme | 23 / 23 executed | 01-23 complete. The brand was **renamed to monochrome in 01-23**, while nothing had published: `data-brand="monochrome"`, the `./themes/monochrome.css` and `./fonts/monochrome.css` subpaths, `DS_BRAND=monochrome`, and 504 visual baselines renamed by `git mv` with no re-capture. The sibling branch **keeps its original name** (see `01-SIBLING-PROTOCOL.md` §2) and is at **89 commits**, tracked-clean. The palette itself went **near-monochrome** in 01-22, after the ochre identity was rejected at the 01-20 capture review. `DS_BRAND=monochrome test:a11y` is **508/508**, up from 11 failed/497; findings **G2 and G3 dissolved by construction**. 01-21 **COMPLETE 2026-08-25**: `2.0.0-beta.1` published to the **`next`** dist-tag with SLSA provenance; `latest` stays at `1.11.4`, so Cairn's `^1.9.0` is untouched. Published **not** by token but by **GitHub Actions trusted publishing (OIDC)** — the account runs `auth-and-writes` 2FA, under which a Publish token authenticates but cannot write. There is no local publish path; the tag push is the publish button. The registry tarball's shasum came back byte-identical to the local pack, so the build is reproducible. |
| 02 astro foundation | **10 / 10 COMPLETE** | `preview.akhilsaxena.com` LIVE. The Worker's own auth gate observed returning exactly 401 on five request shapes with Access disabled — the only such observation in the project, and the one the legacy app's cookie-fallback gate would have failed. Authenticated path confirmed: `/admin` renders, `/api/health` returns `"r2":"reachable"`. |
| 03 content layer | **8 / 8 COMPLETE** | All five waves landed. Criterion 2 verified independently: a planted cross-file violation exits **1**, emits **no `dist/`**, and reports `✖ [RI-1] data/portfolio_images.json → abstract-intothemist → category: category "archtecture" does not exist in data/site_config.json` with all six RI rules named as run. **`research/ARCHITECTURE.md` Pattern 2 was measured FALSE** — a module-scope `parse()` that nothing imports leaves the build green and emits `dist/`, so the rule ADR-002 made load-bearing would have shipped in dead code. Mechanism is an `astro:config:done` integration, chosen over `build:start` because it also fires on `astro check` and `astro sync`. `npm run build` 0 · `npm test` **484/484 across 12 files** · `gate:content`/`gate:schema`/`gate:origin`/`gate:routes`/`check`/`typecheck` all 0. |
| 04 photo pipeline | **3 / 10 executed** | **Wave 1 complete.** 04-01 re-scoped all 15 count assertions *per assertion* (9 cohort / 7 invariant+floor), so a 40th photo goes from **14 failing tests** to green — proven by renaming a cohort id and watching it fail with `no manifest record for cohort id`. 04-02 shipped `src/lib/photo-pipeline.ts`, the one contract every later plan imports, plus Akhil's OD-2b placeholder-`alt` refusal and the `.github/**` SCAN flip. 04-03 closed the hole where **a manifest could lie about the bucket** — `astro sync` and `gate:origin` both PASS over a URL that 404s. Suite **651/651 across 15 files**; seven gates and `build` all exit 0. |

Progress: [██████████] 98%

## Performance Metrics

**Velocity:**

- Total plans completed: 58
- 01-23: ~1h, 2 tasks, 2 commits (1 sibling, 1 portfolio), 46 files + 504 baselines renamed by
  `git mv` with zero re-capture. Brand renamed to **monochrome** before anything published.

- 01-22: ~3h, 2 tasks, 5 sibling commits, 16 files + 489 baselines. Monochrome a11y 11 failed/497
  passed → **508/508**.

- Notable: G-15/DS-09 fixed — an `import { Chip }` island fell from 570,555 B / 176,922 B gzip / 99
  modules to **1,620 B / 785 B gzip / 2 modules**.

**By Phase:**

| Phase | Plans done | Notes |
|-------|-----------|-------|
| 00 | 25 / 25 | **complete** |
| 01 | 23 / 23 | cross-repo, sibling branch; palette rebuilt near-monochrome in 01-22, brand renamed to monochrome in 01-23 |
| 02 | 10 / 10 | **complete** |

**Recent Trend:**

- Last 5 plans: 01-20, 01-FIX-focus-ring-soft, 01-21, 01-22, 01-23
- Recurring defect class: a CSS rule losing silently to an existing rule declared lower in
  `primitives.css`. Hit 01-10 and 01-11 consecutively; pre-flighted for 01-12, where it **recurred
  and was caught before shipping** — a floor written on `.ds-atom-footer-link` (0,1,0) was proven, in
  a browser, to be entirely invisible against `.ds-atom-link` (0,1,0) declared ~880 lines lower.
  Shipped at (0,2,0) instead. The general lesson is now three-for-three: **tie on specificity means
  source order decides, and jsdom cannot see it** — so the pre-flight for 01-13 onward is to grep for
  every pre-existing block matching the target selector before writing a rule.

- 01-12 also disproved two mechanisms its own plan prescribed (padding for a touch floor; a
  `.ds-atom-footer-link` selector) by reverting each and re-measuring. Both plan gates it ran had
  defects: one contradicted its own action, one named a spec containing no such probe.

- **01-22 added a new defect class to the register: a design choice that disarms a gate.** Setting
  monochrome light's paper to pure `#FFFFFF` — the obvious modern value, and the one the plan proposed —
  made the correct paint indistinguishable from the hardcoded `rgba(255,255,255,.97)` that
  `confirm-panel.spec.ts` exists to catch. Reinstating the defect left the light case **green**. The
  pre-flight for any future token value change is therefore: grep the specs for that token's value as
  a **decimal channel** as well as a hex, because `toBeCloseTo(30, 0)` is invisible to a hex grep, and
  run the negative control rather than trusting the suite to be green for the right reason.

- 01-22 also found that `--update-snapshots` presets to `changed`, so **448 of 504 monochrome baselines
  were judged matching against the retired palette** — the default `toHaveScreenshot` YIQ threshold of
  0.2 absorbs a cream-to-white shift. `--update-snapshots=all` is required after a palette change.

*Updated after each plan completion*

## Accumulated Context

### Roadmap Evolution

- Phase 06.1 inserted after Phase 6: Design System — Cascade Layers & Density Axis: layers migration split out of Phase 1 so a visual regression stays attributable; density axis added because brand themes own colour/type/geometry but not spacing

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Auth (AUTH-01..04) lands in Phase 2 (foundation), not the admin phase — `/admin` is a live surface the moment it is routable
- [Roadmap]: Phase 1 (monochrome theme) executes **cross-repo** in `../design-system` and ends with a published npm version; Phase 1 ∥ Phase 2
- [Roadmap]: Photo pipeline's Actions half is Phase 4, before the public site — settles the manifest shape and content-hashed keys before the gallery builds `srcset` against them, and debugs the riskiest integration early
- [Roadmap]: CONT-04 (39 photo URLs off `pub-*.r2.dev`) is Phase 3, not a performance pass — it is a data migration and blocks reproducible Lighthouse scores
- [Roadmap]: Phase 0 is design artefacts only; DSGN-04's running sketches are the sole deliberate exception
- [Phase 01]: [01-23] the brand is renamed to **monochrome** in code and forward-looking documents only. Plan summaries, findings registers, the phase directory and the sibling branch keep their pre-rename names, because each records what was true on a date and rewriting it would falsify the record. A gate asserts the historical files still carry the old name, so a blanket replace fails
- [Phase 01]: [01-23] the load-bearing rename gate is **zero references to the pre-rename brand name** anywhere in `src` / `.storybook` / `tests` / `scripts` — not the `data-brand="…"` selector grep. A partial rename written through the DOM API (`dataset.brand = …`) passes the selector grep untouched and silently applies the theme to nothing, which is the 508-story-sweep-in-the-wrong-brand failure of 01-20 in a new costume

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

**Raised by Phase 3 wave 1, 2026-08-25/26 — each found by an executor detonating something, not by reading:**

- **`CONT-03`'s wording contradicts the design.** The requirement says bullets are
  *"allowlist-sanitized"*; ADR-001 §66 and 03-02 make the HTML class **structurally impossible** —
  the stored grammar has no production emitting an angle bracket, so there is nothing to sanitize.
  03-02 deliberately did **not** tick CONT-03. Reword and split it before verify-phase, or the
  requirement stays open against work that is finished.
- **Repoint the portfolio at the registry.** `@akhil-saxena/design-system@2.0.0-beta.1` is published;
  the dependency is still a packed tarball. Do this before Phase 5.
- **`03-01`'s `--verify` asserts exactly 39 records** and stops working the day a 40th photo lands.
  An asserted contract was not loosened unilaterally — Phase 4 should decide whether the count
  becomes dynamic or the assertion moves.
- **The `gate:origin` exclusion for `.github/**` is the one most likely to be wrong**, once Phase 4's
  Actions pipeline can itself carry an origin. Revisit when that pipeline lands.
- **`gate:origin` has a known blind spot, documented in its own header:** an **untracked** file under
  `src/` escapes, because the scan is driven by `git ls-files`. Deliberate, not an oversight — but it
  means the gate protects what will ship, not what is merely on disk.
- **`pharmeasy#2` holds a literal `&`** — the only entity-shaped character in the corpus. Flagged for
  03-07's renderer, which must not double-escape it.

### Blockers/Concerns

- **Concurrent plans in one wave share a git index, and my own repair made that bite.** 04-06's
  commit `f16c6af` swept **six of 04-04's files** into itself — the fixtures, the generator and the
  fixture test. Cause: my W-a repair added `git add test/pipeline/fixtures &&` to 04-04's verify
  command (correct, because `git diff` is blind to untracked files) in a wave where four executors
  share one index, so another plan committed while they were staged. **Content is correct and
  complete; only attribution is wrong, and history was not rewritten.** For waves 3-5: a verify step
  must never `git add` in a shared-index wave — stage inside a `git clone --no-hardlinks` sandbox, or
  assert trackedness with `git ls-files --error-unmatch` instead, which is what 04-04 switched to.

- **The placeholder-`alt` refusal (OD-2b) has three measured holes, and closing the first would break
  a legitimate caption.** `"TODO add real alt text here"`, `"XXX marks the spot at the third arch"`
  and `"??? what even is this shot"` are **ACCEPTED** — the refusal catches bare tokens and leading
  markers, not a marker word buried in a longer sentence. 04-02 measured this rather than claiming
  completeness. Tightening the first pattern to a substring match was tried and **rejected**: it reds
  `"Todo el mundo crowds the square before the procession"`, a real Spanish caption. All 39 reviewed
  `alt` values pass, the shortest measured at 83 characters, so the 15-character floor sits 5.5× below
  anything real. **Accepted residual, not a defect** — but if a photo ever ships announced as "TODO
  add real alt text here", this is why.
- **The `.github/**` origin-gate flip cannot see a value hidden behind a secret reference.** Measured:
  a literal inside `${{ secrets.X || '…' }}` **is** caught, but a value living only in the secret
  itself is invisible. `R2_PUBLIC_URL` predates the custom domain by five months, so it very likely
  still holds the `r2.dev` value — and no gate can reach it. OD-3 resolves this by never reading the
  secret; deleting it is a `user_setup` item for 04-10.

- **`console.log` / `console.info` are swallowed by this repo's vitest setup — only
  `process.stdout.write` prints.** Verified independently with a probe: both console markers appeared
  **0** times, the stdout marker once. Found by 04-01, whose by-name diagnostic printed nothing. This
  is its own defect class: **a gate reporting findings through `console.log` is indistinguishable from
  a gate that found nothing**, which is how nine vacuous gates in this project stayed invisible. Any
  assertion that must *show* its evidence writes with `process.stdout.write`.

- **HEAD and GET answer different questions against `images.akhilsaxena.com`, and the obvious choice
  is wrong for liveness.** Measured by 04-03, re-measured independently: `HEAD` returns
  `cf-cache-status: DYNAMIC` and therefore always reaches R2; `GET` can be answered from the edge
  (`HIT`/`REVALIDATED`/`EXPIRED`). So **liveness probes must use HEAD** — a GET cannot distinguish
  "the object exists" from "the object was cached before the upload failed", which is a false pass on
  a mutable key. **Cache assertions must use GET** — HEAD returns no `cache-control` at all, which is
  the opposite trap and the one 03-01 nearly recorded wrongly. My own brief to 04-03 asserted GET for
  both; the executor measured it and refused. `scripts/verify-photo-urls.mjs` encodes this in a frozen
  mode table whose invariant refuses module load if violated.

- **🔴 LIVE EXPOSURE — all 39 unwatermarked masters are publicly downloadable. DEFERRED BY AKHIL
  2026-08-26 to the cutover phase; it is shipping until then.** The legacy pipeline writes an
  unwatermarked 2000px master to `private/<category>/<slug>-clean.webp`. **`private/` is a path
  prefix, not a permission** — the bucket is fronted by a public custom domain, so every master is
  one predictable URL away, and the key is derivable from the public manifest in one line. The
  watermark on the public variants is therefore decorative. Verified independently 2026-08-26:
  **39/39 return HTTP 200 `image/webp`**, and each `-clean` file is larger than its watermarked
  public twin (28,426 → 30,834 · 213,984 → 244,114 · 442,354 → 499,818 bytes).

  Reproduce (GET, never HEAD — HEAD returns `DYNAMIC` with no `cache-control` and will mislead):
  ```bash
  curl -sS -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' \
    https://images.akhilsaxena.com/private/abstract/intothemist-clean.webp
  ```

  **Two fixes, and they compose.** (a) A Cloudflare rule blocking `/private/*` on
  `images.akhilsaxena.com` — minutes, reversible, stops it immediately. (b) Stop writing masters to
  a public bucket at all: a separate bucket with no public domain, or do not upload them. (b) is a
  **Phase 4 design change**, because the pipeline is what writes them.

  This predates Phase 4 and predates the rebuild. **Phase 8 must not cut over to the apex domain
  with this open.**

- **Tally now nine, and the pattern widened.** 03-06 found a manifest `.min(0)` that could not fail —
  the ninth vacuous gate. More importantly it found **two new failure classes** in the plan's own
  scaffolding. Four Task-2 verify predicates **could not fire at all**: three matched double-quoted
  specifiers where `biome.json` enforces single quotes, and the fourth, `/<\s*[a-zA-Z]/`, matched the
  *literal characters* `[a-zA-Z]` after a `<` — a shape no real regex produces. And all four Task-3
  harnesses assumed **bash `${PIPESTATUS[0]}` while the shell is zsh**: run verbatim, the clean-tree
  control printed `FAIL: gate fires on the clean tree` for a gate that exited 0. Same class as the
  subshell harnesses, different mechanism. **Any harness in a future plan must be run under the shell
  it will actually execute in, before its verdict is believed.**
- **A rival type definition exists in the repo today and the single-definition gate is blind to it.**
  `test/content/photo-enrichment.unit.test.ts:57` declares its own `interface Photo`; `gate:schema`
  passes. This is blind spot 1 of 5, recorded in the gate's own header and verified here
  independently. The gate scans `src/` only, so it protects the shipped surface, not the test surface.
  **Phase 7 must not read this as "one definition exists" without also reading the header.**
- **Running tally of unfailable plan gates, Phase 3: eight.** Wave 2 added two more, both in 03-04.
  Its **idempotence gate measured the commit, not the re-run** — `node merge && git diff --quiet` read
  the 55 additions the merge had just made and reported `FAIL: not idempotent` on correct code, and
  *after* a commit would have reported OK for a script that never ran. Its **`categoryOrder` gate
  passed vacuously**: given `[]` it iterated zero groups and printed `OK 7 categories, dense 1..n
  ranks` with exit 0 — a sentence about seven categories it had never seen. Both repaired by the
  executor, the second with an anti-vacuity clause driven by the *expectation table* rather than by
  the data, so an empty dataset cannot silence it.
- **The `HEAD~1` time bomb fired exactly as predicted.** 03-04 recorded that 03-05 committed `2009dc9`
  **mid-execution**, so the plan's `git show HEAD~1` evidence instruction would have selected a
  revision already carrying `categoryOrder`. It searched the manifest's own log instead and proved the
  choice non-tautological: `HEAD` has `categoryOrder` on 39/39 and a naive finder picks it, while the
  real finder picks `27a5e38` and quotes that hash in its failure messages.
- **Fifteenth machine-sleep agent death**, this time 03-05, which had finished its 586-line summary but
  not staged it. Work was intact because of the one-commit-per-task rule; the summary was committed
  post-hoc after independent verification. The rule keeps paying for itself.
- **The plans' own verification scaffolding is now a known defect surface, not just the code it
  tests.** Phase 3 wave 1 found **four** classes of unfailable gate written *into the plans*: a
  `/three/i` grep that passed on an unedited file by matching a prose comment (the **seventh**
  comment-match in this project); a mutual-exclusivity loop testing hardcoded regexes against
  hardcoded filenames while reading no config; a Node-import gate matching only double-quoted
  specifiers where Biome enforces single quotes; and an idempotence gate reporting "no-op" for a run
  that converted 12 bullets, because `git diff --quiet` measures convergence rather than work.
  Separately, **13 negative-control harnesses** across 03-04/05/06/07 were written
  `( cmd && R=0 || R=1 )` — the assignment happens in a subshell, so the parent always takes the FAIL
  branch, making a **correct** gate report failure. Repaired in `0759c9b`. Wave 2 briefs must put the
  plan's own scaffolding in scope for the four-step proof.
- **`HEAD~1` is never a safe evidence revision in a parallel wave.** 03-03 and 03-05 were both told to
  compare against `git show HEAD~1:<file>` with `HEAD` as fallback; with three plans committing to
  `main` concurrently, both paths return the already-migrated shape and the losslessness proof
  compares against nothing. 03-03 detonated it; 03-05 was repaired pre-dispatch. Any future plan
  comparing against a prior revision must search the file's own log and **throw** when it finds none.

- **Unmeasured, load-bearing:** whether the design system's 334 KB barrel tree-shakes TipTap/ProseMirror out of a public island (DS-09). Measure in Phase 1 with the Phase 0 sketches; re-check as a go/no-go gate in Phase 5. If it fails, the fix is upstream per-component JS exports — never a local workaround.
- **Live site:** `akhilsaxena.com` is not serving (Cloudflare nameservers, no host records). `akhilsaxena.pages.dev` still serves the OLD site only because the purged `main` fails to build and Cloudflare retains the last successful deployment. Schedule pressure, not a hard outage — the first successful new deploy replaces the old site.
- ~~**Cross-repo gate:**~~ **RESOLVED 2026-08-25.** Phase 1 published `2.0.0-beta.1` to the `next` tag, so the portfolio can consume the design system **from the registry** rather than a packed `file:*.tgz`. That retires the tarball bridge and the duplicate-React hazard behind it, and makes the CI gate that fails on a `file:` dependency spec satisfiable now rather than at cutover. **Not yet done** — the portfolio's dependency has not been repointed; do it before Phase 5.
- **Open question carried from research:** Playfair Display delivery — shipped from the design-system theme, or via Astro's `fonts` config? Must be settled in Phase 0 (DSGN-05) before the Phase 1 release is cut.
- **Gate override (Phase 0 planning, 2026-08-17):** the decision-coverage gate reported 31 uncovered CONTEXT.md decisions and was overridden as a false positive. Cause is the matcher, not the plans: it greps for the literal `D-NN:` (colon) form, while the plans cite decisions as `D-02`, `(D-02)`, `D-24,` — D-02 appears 26 times, D-03 11 times, and gsd-plan-checker independently found zero contradictions of D-01…D-47. Separately, ~20 of the 31 (D-27…D-37 design-system/Phase 1; D-10…D-26 admin implementation/Phase 7) are genuinely later-phase decisions that Phase 0 only sketches, so the gate will keep misfiring here until they are tagged `[informational]` in CONTEXT.md. Re-surface at verify-phase.
- DS-02 and DS-03 left Pending after 01-22: both were written against the retired ochre identity. DS-02's 'every accent-as-text usage passes AA' clause is measurably false (--amber as text, monochrome light, 3.11/3.19/2.96) and needs 5 rules in primitives.css re-pointed at --amber-d. DS-03 names --ochre-d as the focus-ring token, but --focus is now bound to --ink. Both need re-stating against the monochrome identity before they can be closed.
- `test:visual` exits 1 on **two** stale baselines, both pre-existing and neither re-recorded by 01-23: `interaction-richtext--dark-mode.png` (default brand, 138 px, the `f1767f2` defect) and `data-display-tabs--narrow-overflow--monochrome.png` (94 px, re-recorded by 01-22 under contention at `8ce0d69`; three fresh captures are byte-identical to each other, so the baseline is stale rather than the story flaky). Both need one deliberate re-record on a quiet machine before 01-21 publishes — Akhil's call.
- `storybook.spec.ts` is `describe.configure({ mode: "serial" })`, so while the default-brand capture fails the second brand's 504 comparisons **never run** in a full `test:visual`. Both stale baselines above are downstream of that skip.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260817-dqf | Scope CLAUDE.md's legacy Next.js docs to the `legacy/nextjs-portfolio` branch; add pre-code repository orientation note | 2026-08-17 | 4e720be | [260817-dqf-update-claude-md-to-scope-legacy-next-js](./quick/260817-dqf-update-claude-md-to-scope-legacy-next-js/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-25T01:25:28.641Z
Stopped at: Completed 01-12 (AppBar height exposed, 44px touch floor, component count reconciled)
Resume file: None
