---
phase: 4
slug: photo-pipeline-actions-half
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-26
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Every value below was **measured** in `04-RESEARCH.md`, not estimated.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 — three projects composed by reference in `vitest.config.ts` |
| **Config files** | `vitest.unit.config.ts` (plain Node, no setup) · `vitest.integration.config.ts` (`globalSetup` builds + spawns `astro preview`) · `vitest.workers.config.ts` (workerd) |
| **Glob contract** | **Mutually exclusive** — `test/**/*.unit.test.ts`, `test/**/*.node.test.ts`, `test/**/*.workerd.test.ts`. A file matching none is silently never run. |
| **Quick run command** | `npx vitest run --project unit` — **measured 444 tests / 7 files / exit 0** on a clean clone |
| **Full suite command** | `npm test` — 484 across 12 files |
| **Build-time gate** | `astro:config:done` hook in `astro.config.mjs` — fires on `build`, `check` **and `sync`** |
| **Schema gate, no secrets** | `npx astro sync` runs all 5 schemas + all 6 RI rules in **1.7 s** and needs **no `.env`/`.dev.vars`** (measured). `astro build` exits 1 without them at `validatePublicVariables`. |
| **Gate chain** | `npm run gate:content` = `gate:schema && gate:sinks && gate:origin && gate:routes` — all four run without secrets |
| **Estimated runtime** | quick ~seconds · `astro sync` 1.7 s · full suite ~45 s |

**Convention to honour.** Unit tests here deliberately **re-implement** rather than import what they
verify — `photo-enrichment.unit.test.ts` states it: *"Importing the merge's own parser would make
this file assert that the merge agrees with itself."* Phase 4's record-producer tests must assert
the **shape independently**, never by calling the producer's own helpers.

---

## Sampling Rate

- **After every task commit:** `npx vitest run --project unit` **and** `npx astro sync`
- **After every plan wave:** `npm test` + `npm run gate:content`
- **Before `/gsd:verify-work`:** full suite green, `npm run build` exit 0
- **Max feedback latency:** ~10 s for the quick pair

---

## Requirement → Test Map

| Req | Behaviour | Type | Automated command | Exists? |
|---|---|---|---|---|
| PIPE-01 | variants at 2000/1200/800/400, `withoutEnlargement`, WebP q85/85/85/80 | unit | `npx vitest run --project unit test/pipeline/variants.unit.test.ts` | ❌ Wave 0 |
| PIPE-01 | EXIF maps to the six schema fields; all-null on a file with none | unit | `… test/pipeline/exif.unit.test.ts` | ❌ Wave 0 |
| PIPE-01 | the produced record satisfies `PhotoSchema` + all six RI rules | integration | `npx astro sync` (exit 1 on violation) | ✅ exists |
| PIPE-02 | the workflow's dispatch inputs are complete and typed | unit | `… test/pipeline/workflow-contract.unit.test.ts` (parses the YAML) | ❌ Wave 0 |
| PIPE-02 | end-to-end from `gh workflow run` | **manual** | one live dispatch | manual |
| PIPE-03 | a second run for the same `temp_key` adds no record and exits 0 | unit | `… test/pipeline/idempotence.unit.test.ts` | ❌ Wave 0 |
| PIPE-04 | every URL in every record resolves 200 + `image/webp` | integration | `node scripts/verify-photo-urls.mjs` | ❌ Wave 0 |
| PIPE-04 | a failure between derive and upload leaves the manifest byte-identical | integration | `… test/pipeline/partial-failure.node.test.ts` | ❌ Wave 0 |
| PIPE-04 | a lifecycle rule's prefix is byte-equal to the pipeline's staging prefix | **manual** | `wrangler r2 bucket lifecycle list` | manual |
| PIPE-05 | a foreign commit to `data/portfolio_images.json` survives a concurrent pipeline push | integration | `… test/pipeline/concurrent-push.node.test.ts` | ❌ Wave 0 |
| CONT-05 | re-uploading yields a different URL; the old URL is untouched | unit | `… test/pipeline/versioned-key.unit.test.ts` | ❌ Wave 0 |
| CONT-05 | a GET of a freshly written URL returns the new bytes | **manual** | `curl -sS -o /dev/null -D -` — **GET, never HEAD** | manual |
| — | the 15 existing tests that break at 40 records | unit + integration | `npx vitest run --project unit` | ✅ exists |

---

## Wave 0 Requirements

Wave 0 is **not** optional here. Adding one valid 40th photo was measured to turn **15 tests across
4 files red while the build stays green**: `photo-enrichment` (9), `schemas` (4),
`site-config-migration` (1), `build-fails-loudly` (1), plus `migrate-photo-origin --verify`
exiting 1.

- [ ] **Re-scope the 39-hardcoded assertions.** The fix is *not* bumping 39 → 40. One of the tests
      says so in its own failure message: *"re-scope or retire this block rather than weakening
      it."* Decide per-assertion whether it is a dated baseline, a floor, or an invariant.
      `assert-no-r2dev-urls.mjs` already uses the count as a **floor** and correctly passes at 40.
- [ ] `test/pipeline/` — the directory does not exist
- [ ] Fixture images: one with rich EXIF, one with **none**, one already ≤400px (to prove
      `withoutEnlargement`)
- [ ] `scripts/verify-photo-urls.mjs` — generalised from `migrate-photo-origin --verify`, which
      asserts **exactly 39** and so stops working at 40

---

## Manual-Only Verifications

| Behaviour | Req | Why manual | Instructions |
|---|---|---|---|
| End-to-end dispatch | PIPE-02 | Needs real R2 credentials and a real Actions run | One `gh workflow run`; artefact is the run URL + resulting commit SHA |
| Lifecycle expiry actually deletes | PIPE-04 | R2 granularity is **days**, removal lags ~24 h — unobservable in a test | Assert the rule's prefix is byte-equal to the pipeline's constant; never assert deletion |
| CDN serves new bytes after re-upload | CONT-05 | Requires a real write + edge propagation | `curl` **GET** twice; HEAD returns `DYNAMIC` with no `cache-control` and will mislead |

---

## Known Measurement Hazards

Carried from `04-RESEARCH.md` §13 and Phase 3's register. A gate that trips one of these reports a
result it did not measure.

1. **HEAD lies about caching.** `curl -sSI` → `cf-cache-status: DYNAMIC`, no `cache-control`,
   reproducibly. Only GET reveals `max-age=14400`. Every cache assertion must use GET.
2. **Shell is zsh; Actions is bash.** `npx $cmd` with `cmd="astro sync"` passes ONE argv element in
   zsh and "fails" in 245 ms. No `${PIPESTATUS[0]}`, no unquoted `$VAR` expecting word-splitting.
   State the shell for every control.
3. **A worktree copied without `.git` fabricates failures** — four tests walk `git log` and throw
   rather than pass vacuously. Copy the repo *with* its history or expect false reds.
4. **`actions/checkout` defaults to depth 1**, which broke CI on 2026-08-26. Any new workflow must
   set `fetch-depth` deliberately.
5. **`slopcheck install` is not a dry run** — it executed `npm install` in the working tree. Run it
   only in a throwaway directory.
6. **Nothing existing can see a manifest that lies about the bucket.** A schema-valid record
   pointing at four 404ing objects passes `astro sync` (`PASS · 40 photo(s) · RI-1…RI-6`) and
   `gate:origin`, which checks URL *origin*, never liveness.

---

7. **`console.log` and `console.info` are SWALLOWED by this vitest setup.** Only
   `process.stdout.write` reaches the output. Verified independently with a probe test: the two
   console markers appeared **0** times, the `process.stdout.write` marker once. Found by 04-01,
   whose "out-of-cohort ids are reported by name" diagnostic printed nothing at all — a gate that
   reports its findings via `console.log` looks like a gate that found nothing. Any test or script
   that must *show* something in a verify block writes with `process.stdout.write`.
8. **Do not commit `appendFortieth`'s output.** 04-01's fixture asserts, as its first check, that the
   40th record is one the committed manifest does **not** already contain — deliberately, so a test
   fixture leaking into reviewed content is loud rather than silent. Appending it and committing
   fails 4 of 23 assertions by design. 04-05 and 04-09 import this fixture; use it in a sandbox.
9. **`--verify` cannot exit 0 for a record whose R2 objects were never uploaded.** It reports four
   404s, correctly. Any proof step demanding both "append a 40th record" and "`--verify` exits 0"
   is unsatisfiable and must be split.

10. **The EXIF differential corpus does not exist — OD-12's stated evidentiary basis is gone.**
    All 39 served originals carry **exactly one RIFF chunk (`VP8`)**: no `EXIF`, no `XMP`, no `ICCP`.
    Verified three ways — a raw chunk walk, `sharp(...).metadata()` reporting `exif: false`, and the
    container header. Mechanism, not guesswork: the legacy encoder never calls `withMetadata`/
    `withExif`/`keepMetadata`, sharp strips by default, and the camera sources were never committed
    (`new-photos/` holds only `.gitkeep`). So the committed EXIF **values are real but unrederivable**.
    OD-12 was chosen partly because "the 39 records are a ready-made regression corpus" — that
    premise, in both my brief and the research, was **wrong**.
11. **`exifr` and `exif-reader` disagree on one tag name, and a verbatim port writes `null` forever.**
    Tag `0x8827` is `ISO` in `exifr` and **`ISOSpeedRatings`** in `exif-reader`. A straight port
    produces `iso: null` on every future record — **schema-valid, and invisible to every gate in this
    repo**. Found by 04-04 running a cross-library differential on real fixtures (12/12 otherwise
    identical) rather than on the absent corpus. 04-07 owns the mapper and must pin this.
12. **`yaml` is an undeclared transitive dependency.** `require('yaml')` resolves at 2.9.0 today, but
    nothing in `package.json` declares it, so a lockfile refresh could remove it and break 04-08's
    workflow contract test. `package.json` belonged to a concurrent plan at the time. **Whoever next
    owns `package.json` must declare it.**
13. **A re-dispatch under a DIFFERENT category orphans the old record.** `id === category + '-' + slug`,
    so changing the category yields a new id and an insert, leaving the previous record in place.
    **Nothing in Phase 4 owns deletion.** Measured and tested by 04-05, recorded here as a known gap
    rather than papered over — it belongs to the admin phase or a follow-up.

14. **A token deny-list for git argv is not sufficient, and mine was not.** I specified case 0's
    banned set as `rebase`, `--force`, `--force-with-lease`, `-A`, `--all` — and designated it the
    *only* remaining control after a blind source grep was deleted. Measured by 04-06: **three of
    four attacks walk through it.** `git push -f` force-pushes (short form, no `--force`);
    `git push origin +HEAD:refs/heads/main` force-pushes via the `+` refspec prefix with no flag at
    all; and `git add .` stages everything while writing no `-A`. All three ran with the guard
    **silent** and the clean-push case **green** — the clobber surfaced only downstream, as a
    consequence rather than as the operation.
    The shipped guard extends to 12 tokens **and adds four structural checks**: a subcommand
    allow-list, a `-c` key allow-list, a `+`-refspec check, and an exact `add -- <one path>` shape.
    **The lesson generalises: enumerate the permitted shape, do not enumerate forbidden spellings.**
15. **`observeGit` must not be substitutable for the runner.** A witness that *replaces* the git
    runner proves a prohibition about a runner that never ran. 04-06's observer is additive, runs
    live on every invocation, and its terminal audit asserts `observed.length > 0` **and** that
    `push`/`commit`/`fetch`/`reset` each appeared — because "no forbidden argv" is trivially true of
    a module that never pushed. Measured: 110 invocations captured, 0 forbidden.
16. **`publishManifest` validates bytes, never semantics — so `astro sync` must stay INSIDE the retry
    loop.** 04-06 measured that a stale re-derive *is* committed and pushed, silently discarding a
    concurrent human record. The catching layer is `rederive` itself. This binds 04-09 step 9.
17. **`engines.node: ">=22.12.0"` understates the floor** — the `.ts`-extension imports need
    **22.18.0** type stripping. `.nvmrc` pins 22.22.3 and all three workflows read it, so CI is safe;
    the declared range is what is wrong.

18. **`exif-reader` returns `DateTimeOriginal` as a `Date`, and the naive EXIF stamp is parsed as
    UTC — so `date` must be formatted with `toISOString()`, never local getters.** Verified on this
    machine, which resolves to `Asia/Calcutta`: a `2026-03-28T23:59Z` capture yields **2026-03-28**
    via `toISOString()` and **2026-03-29** via `getFullYear()/getMonth()/getDate()`. Every evening
    exposure would be dated a day late. 04-07 pins it by forcing `TZ=Asia/Kolkata` around a 23:59Z
    capture so the test discriminates wherever it runs; planting local getters fails it. **Neither the
    typings nor the docs reveal this** — it was found by running the library.
19. **`q85/85/85/80` was never true of the legacy output.** The plan quoted legacy `addWatermark`
    verbatim as the spec, but that code's second encode uses sharp's **default** quality, discarding
    the table. 04-07 builds one lossy encode per variant (resize → raw → composite → WebP once at the
    variant's quality), so the quality column is now true of the emitted bytes. Recorded as a
    deliberate departure from legacy, not a port.
20. **The numeric-literal guard passes on a missing file.** Same defect the B7 repair fixed for the
    OD-9 grep — `grep` exits 2 and prints nothing on an absent file, indistinguishable from a clean
    one — and the fix was never applied to its neighbour. Not a live risk (the module exists and the
    load-bearing check is the decoded-width assertion), but it is the same shape twice, which is why
    the standing rule is: **every `! grep` needs a `test -f` guard.**

21. **`wrangler r2 object` operates on LOCAL storage unless `--remote` is passed.** Measured on the
    installed wrangler 4.123.0 against a key that certainly exists remotely: without the flag it
    reports *"The specified key does not exist."*; with it, the 28,426-byte object downloads.
    **A `put` without `--remote` writes to local disk and looks like success**, so every dispatch
    would be a silent exit-0 no-op that uploads nothing and commits a manifest pointing at objects
    that were never created. Load-bearing because OD-5 resolved to wrangler over the S3 SDK.
    **Every `r2 object` invocation must carry `--remote`, and a gate must assert it** — the failure
    mode is silent, so nothing downstream would notice.
22. **A source file containing a literal NUL byte is invisible to `grep`, and every grep-based gate
    over it passes vacuously.** `scripts/lib/dispatch-input.mjs` used join('\0') with a **literal**
    NUL as an array-comparison separator — a correct technique, since a name containing the separator
    cannot then cause false equality. But the literal byte made `file(1)` report the source as
    `data`, and `grep -q 'export'` returned **not found** while `grep -a` found it 9 times. Fixed by
    writing the separator as the escape '\u0000': identical at runtime, and the file is text
    again. Verified after the edit — 957/957 and all gates unchanged. **Standing rule: a control
    character belongs in a source file as an escape, never as a literal byte.**

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers every ❌ above
- [x] No watch-mode flags
- [x] Every gate proven to FAIL by planting its target defect
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-26 — after the plan-checker's 8 blockers and the repairs in `04-10` plus six gate edits
