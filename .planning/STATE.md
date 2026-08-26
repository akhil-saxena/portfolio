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
**Current focus:** Phase 3 (content layer & image origin) — wave 1 complete. Phases 0, 1 and 2 are closed; the design system published as `2.0.0-beta.1` on the `next` dist-tag on 2026-08-25.

## Current Position

Phases 0, 1 and 2 are all in flight concurrently.

| Phase | Plans | Status |
|---|---|---|
| 00 design-ideation | **25 / 25 COMPLETE** | Both remaining are **human gates** (00-11 sketch review, 00-17 copy review). Playground deletion is parked behind them. One off-plan deliverable shipped: `00-RESPONSIVE-CONTRACT.md`. |
| 01 monochrome theme | 23 / 23 executed | 01-23 complete. The brand was **renamed to monochrome in 01-23**, while nothing had published: `data-brand="monochrome"`, the `./themes/monochrome.css` and `./fonts/monochrome.css` subpaths, `DS_BRAND=monochrome`, and 504 visual baselines renamed by `git mv` with no re-capture. The sibling branch **keeps its original name** (see `01-SIBLING-PROTOCOL.md` §2) and is at **89 commits**, tracked-clean. The palette itself went **near-monochrome** in 01-22, after the ochre identity was rejected at the 01-20 capture review. `DS_BRAND=monochrome test:a11y` is **508/508**, up from 11 failed/497; findings **G2 and G3 dissolved by construction**. 01-21 **COMPLETE 2026-08-25**: `2.0.0-beta.1` published to the **`next`** dist-tag with SLSA provenance; `latest` stays at `1.11.4`, so Cairn's `^1.9.0` is untouched. Published **not** by token but by **GitHub Actions trusted publishing (OIDC)** — the account runs `auth-and-writes` 2FA, under which a Publish token authenticates but cannot write. There is no local publish path; the tag push is the publish button. The registry tarball's shasum came back byte-identical to the local pack, so the build is reproducible. |
| 02 astro foundation | **10 / 10 COMPLETE** | `preview.akhilsaxena.com` LIVE. The Worker's own auth gate observed returning exactly 401 on five request shapes with Access disabled — the only such observation in the project, and the one the legacy app's cookie-fallback gate would have failed. Authenticated path confirmed: `/admin` renders, `/api/health` returns `"r2":"reachable"`. |
| 03 content layer | **5 / 8 executed** | **Waves 1–2 complete.** 03-01 156 photo URLs onto `images.akhilsaxena.com` + the CONT-04 gate; 03-02 the bold-only bullet grammar (13 bullets, **34 HTML tags → 0**, 17 spans preserved); 03-03 `site_config` as seven `{id,label,columns}` records + `defaultColumns`, 39/39 resolving, 0 orphans; **03-04** 39 `alt` + 16 `place` merged from the reviewed brief, `categoryOrder` backfilled on 39, OD-5 pinned as an assertion; **03-05** projects split to `projects.json` (5 records), `period` deleted from all four records and derived by `src/lib/period.ts` — all four strings byte-identical including **U+2013** — and OD-6's `{{ds.componentCount}}` placeholder stored. Suite **351/351** across 9 files; `gate:origin`/`check`/`typecheck` exit 0. OD-1…OD-6 all resolved by Akhil. **Wave 3 (03-06) needs OD-3 and OD-7.** |

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
