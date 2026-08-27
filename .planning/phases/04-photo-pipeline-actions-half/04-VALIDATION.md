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

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers every ❌ above
- [x] No watch-mode flags
- [x] Every gate proven to FAIL by planting its target defect
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-26 — after the plan-checker's 8 blockers and the repairs in `04-10` plus six gate edits
