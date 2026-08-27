---
phase: 04-photo-pipeline-actions-half
plan: 02
subsystem: pipeline
tags: [r2, content-hash, cache-control, github-actions, workflow-dispatch, alt-text, zod, gates]

requires:
  - phase: 03-content-layer-image-origin
    provides: "src/lib/image-origin.ts (IMAGE_ORIGIN, REMOTE_URL_KEYS), src/schemas/photo.ts (PhotoSchema origin-equality refinement, PhotoUrlsSchema thumb prefix), scripts/assert-no-r2dev-urls.mjs (the CONT-04 gate and its exhaustive path classification)"
provides:
  - "src/lib/photo-pipeline.ts — the one definition of the staging prefix and bucket, the content-hashed published key scheme, the variant table, the LQIP spec, the object cache policy, the workflow_dispatch input list, the alt placeholder refusal, and the publish branch/retry bound"
  - "OD-2b: a placeholder-shaped `alt` is refused before any R2 read, whole-value never substring, with the false-positive proof"
  - "gate:origin now SCANS .github/**, and fails when any SCAN rule matches zero tracked files"
  - "A written contract for what `dimensions` describes (OD-11), where the field is declared"
  - "THUMB_PREFIX exported from src/schemas/photo.ts so the pipeline's copy can be asserted against the schema that enforces it"
affects: [04-05, 04-06, 04-07, 04-08, 04-09, 04-10, phase-05-srcset, phase-07-admin-write-path]

tech-stack:
  added: []
  patterns:
    - "Contract-module-first: one module states the interface, eight plans import it, a contract test re-implements the expectations rather than importing the producer's helpers"
    - "Regexes built from the constants they validate (STAGING_KEY_RE from STAGING_PREFIX, PUBLISHED_KEY_RE from PUBLISHED_PREFIX + VARIANTS + CONTENT_HASH_HEX_LENGTH), so a constant and its validator cannot disagree"
    - "A mapped tuple over a TYPE PARAMETER as the type-level half of a runtime deep-equality claim"
    - "Per-rule scanned counts plus a zero-match failure, so a SCAN rule cannot silently behave like a SKIP"

key-files:
  created:
    - src/lib/photo-pipeline.ts
    - test/pipeline/photo-pipeline-contract.unit.test.ts
  modified:
    - src/schemas/photo.ts
    - src/lib/image-origin.ts
    - scripts/assert-no-r2dev-urls.mjs

key-decisions:
  - "OD-1 A: content-hashed keys photos/<cat>/<slug>-<hash8><suffix>.webp; Cache-Control public, max-age=31536000, immutable at PutObject, with the A1 caveat recorded beside it"
  - "OD-2 A: alt is a required workflow_dispatch input, validated before any R2 read"
  - "OD-2b: placeholder-shaped alt refused — whole-value token match, punctuation-delimited marker prefixes, a 15-character floor, title-equality and filename-equality"
  - "OD-3 A: the pipeline never reads R2_PUBLIC_URL; it imports IMAGE_ORIGIN and carries no hostname literal. .github/** moves SKIP -> SCAN"
  - "OD-6 A: STAGING_PREFIX 'temp/', STAGING_BUCKET and STAGING_EXPIRE_DAYS exported in wave 1"
  - "OD-7 A: PUBLISH_BRANCH 'main', PUBLISH_RETRY_LIMIT 3 — re-derive-and-retry, never rebase, never force"
  - "OD-11 A: dimensions is the intrinsic size of the SOURCE, for aspect ratio only"
  - "CONTENT_HASH_BYTES is 4 (a byte count) and CONTENT_HASH_HEX_LENGTH is 8 — deviation from the plan's wording, see Deviations"
  - "photo-pipeline.ts does NOT import src/schemas/photo.ts — measured: it would make every wave-5 Actions script unloadable"

patterns-established:
  - "Contract test as the agreement point: where a producer cannot import the enforcing module (runtime constraint), the test imports both sides instead of comparing a value against a re-typed literal"
  - "Blind spots written into the rule's own `why` field, not into a plan file"
  - "Falsify, do not delete: an obligation whose premise was measured wrong is amended in place with what was checked and what was found"

requirements-completed: [CONT-05, PIPE-02, PIPE-04]

duration: 75min
completed: 2026-08-27
---

# Phase 04 Plan 02: The Pipeline Contract Summary

**One module now says what a published photo's URL is, where staged uploads live, what the workflow's dispatch interface is called, and what a publishable `alt` may not be — content-hashed keys settle CONT-05 at the URL level, because the measured `max-age=14400` browser cache means no purge can reach a returning reader.**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3 of 3 (Task 1 was the six-decision checkpoint, resolved in review before execution)
- **Files created:** 2 · **Files modified:** 3
- **Commits:** `563e059` (Task 2), `324ee35` (Task 3), plus this summary

## The six decisions, as taken

Task 1 is a `checkpoint:decision`. It was **not** re-asked: all six were resolved by Akhil in review on 2026-08-26 and the resolutions block at the head of `04-RESEARCH.md` § Open decisions is the authoritative record. Implemented as written:

| # | Resolution | Where it lives now |
|---|---|---|
| OD-1 | A — content-hashed keys | `publishedKey`, `PUBLISHED_KEY_RE`, `OBJECT_CACHE_CONTROL`; the A1 `immutable` caveat is written beside the constant and left provisional until 04-10's GET |
| OD-2 | A — `alt` a required dispatch input, validated before any R2 read | `DISPATCH_INPUTS` (`alt`, `required: true`) |
| OD-2b | NEW — refuse placeholder-shaped `alt` | `ALT_MIN_LENGTH`, `ALT_PLACEHOLDER_EXACT`, `ALT_PLACEHOLDER_LEADING`, `altRefusalReason`, `assertPublishableAlt` |
| OD-3 | A — never read `R2_PUBLIC_URL`; `.github/**` SKIP → SCAN | `publishedUrl` composes from `IMAGE_ORIGIN`; the gate's new SCAN rule |
| OD-6 | A — staging prefix `temp/` | `STAGING_PREFIX`, `STAGING_BUCKET`, `STAGING_EXPIRE_DAYS` |
| OD-7 | A — commit directly to `main`, bounded retry | `PUBLISH_BRANCH`, `PUBLISH_RETRY_LIMIT` |
| OD-11 | A — `dimensions` is the SOURCE's intrinsic size | comment above `PhotoDimensionsSchema` in `src/schemas/photo.ts` |

Every one carries its OD number and its measurement **in the module header**, not only here.

## The export surface of `src/lib/photo-pipeline.ts`

698 lines. Everything below is exported; the eight required by the review are marked ✅.

**Staging (OD-6)**
`STAGING_BUCKET` ✅ `'portfolio-photos'` · `STAGING_EXPIRE_DAYS` ✅ `7` · `STAGING_PREFIX` ✅ `'temp/'` · `STAGING_KEY_RE` ✅ · `STAGING_KEY_MAX_LENGTH` `1024` · `assertStagingKey(key: unknown): asserts key is string` ✅

**Published keys (OD-1, OD-3)**
`PUBLISHED_PREFIX` ✅ `'photos/'` · `CONTENT_HASH_BYTES` ✅ `4` · `CONTENT_HASH_HEX_LENGTH` `8` · `CONTENT_HASH_RE` · `contentHash(bytes)` · `PublishedKeyParts` (type) · `publishedKey(parts)` · `PUBLISHED_KEY_RE` · `parsePublishedKey(key)` · `slugFromPublishedKey(key)` · `publishedUrl(key)` · `OBJECT_CACHE_CONTROL`

**Variants**
`VARIANTS` ✅ (readonly 4-tuple of `{ urlKey, suffix, maxWidth, quality }`) · `THUMB` ✅ `{ width: 40, quality: 60, dataUriPrefix: 'data:image/webp;base64,' }`

**Record id**
`PHOTO_ID_SEPARATOR` · `photoIdFor({ category, slug })`

**Dispatch (OD-2, OD-2b)**
`DispatchInput` (type) · `DISPATCH_INPUTS` (`temp_key`, `category`, `title`, `alt` required; `place` optional, in that order) · `ALT_MIN_LENGTH` · `ALT_PLACEHOLDER_EXACT` · `ALT_PLACEHOLDER_LEADING` · `altRefusalReason(candidate): string | null` · `assertPublishableAlt(candidate)`

**Publishing (OD-7)**
`PUBLISH_BRANCH` `'main'` · `PUBLISH_RETRY_LIMIT` `3`

`! grep -q 'images\.akhilsaxena\.com' src/lib/photo-pipeline.ts` succeeds, and the contract test asserts the same thing by deriving the hostname from `IMAGE_ORIGIN` so the test contains no literal either. It also asserts the module never *reads* `R2_PUBLIC_URL` (three read shapes) while allowing the header to *name* it, which is the point of that paragraph.

**Measured, and load-bearing for waves 4–5:** plain `node` loads the module and composes a key end to end —

```
PLAIN NODE LOAD OK
  key      : photos/nature/river-bend-277089d9-lg.webp
  url      : https://images.akhilsaxena.com/photos/nature/river-bend-277089d9-lg.webp
  slug back: river-bend
  inputs   : temp_key* category* title* alt* place?
```

## Every control, and its four-step proof

**Shells.** The interactive shell in this session is **zsh**. The `.github/**` proof ran in **bash** (`bash 5.3.9`) and its two decisive controls were repeated in **zsh 5.9** with identical verdicts. Every exit code was captured as `if cmd; then R=0; else R=1; fi` — never `R=$?`, never `${PIPESTATUS[0]}`, and the one place a subshell appears (`if (cd "$SANDBOX" && npm run …); then`) is inside the `if`, not an assignment. Sandboxes were `git clone --no-hardlinks`, **re-cloned before every step**, never `cp -r`. No `git checkout --`, `git stash`, `git reset --hard`, `git worktree` or `git clean` was used anywhere.

### Control 1 — `gate:origin` scans `.github/**` (OD-3). Shell: bash, repeated in zsh.

| Step | What was done | Result |
|---|---|---|
| 1 · plant | appended `https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev/photos/planted.webp` to `.github/workflows/ci.yml` | **exit 1**, `✖ .github/workflows/ci.yml:146: pub-2d90aedeebcf4142afe524930c3b6471.r2.dev` — names the file **and** the line |
| 2a · nothing to check | `rm -rf .github`, index untouched | **exit 1**, `✖ .github/workflows/ci.yml: unreadable — ENOENT …` for both files. It does **not** report a clean scan over a directory it never opened |
| 2b · nothing to check | also removed from the index (`git rm -r --cached`, in the throwaway clone) | **exit 1**, `✖ RULES → .github/**: SCAN rule matched no tracked file` |
| 3 · pass | clean sandbox | **exit 0**, report reads `scanned by named rule: … .github/** (2)` — a **non-zero** count |
| 4a · walk-through | legacy literal hidden inside `${{ secrets.R2_PUBLIC_URL \|\| 'https://pub-….r2.dev' }}` in `deploy.yml` | **exit 1**, `✖ .github/workflows/deploy.yml:145: pub-….r2.dev` — expression syntax is not a hiding place |
| 4b · walk-through | the value **only** behind a secret reference, no literal | **exit 0. NEGATIVE RESULT CONFIRMED.** The gate cannot see a value inside a secret — recorded in the rule's own `why`, which is exactly why OD-3 refuses to read the secret rather than repointing it |

zsh repeat: step 3 → `exit=0` with `.github/** (2)`; step 1 → `exit=1` naming `ci.yml:146`. Identical.

**Measured, not assumed:** `.github/workflows/ci.yml:97` contains the prose `legacy r2.dev URL`. The pattern is `pub-[0-9a-f]+\.r2\.dev|\.r2\.dev`; both alternatives need a leading `pub-<hex>.` or a bare dot, and the comment has neither. The gate stayed green on the clean tree, so no comment edit and **no exclusion** was needed.

### Control 2 — the new zero-match guard (added by this plan, and the reason Control 1 is worth anything)

The flip is worth nothing if `scan: true` sits on a `test` that matches nothing: it would print PASS and mean SKIP — this project's eleventh unfailable gate. So `assert-no-r2dev-urls.mjs` gained **GUARD AGAINST NOTHING (4/4)**: any SCAN rule matching zero tracked files fails by name, and the PASS report now prints per-rule scanned counts. Proof: step 2b above (fires, names the rule) and step 3 (silent on a healthy tree, all eight SCAN labels non-zero).

### Control 3 — OD-2b, the placeholder refusal. Shell: zsh (vitest).

| Step | What was done | Result |
|---|---|---|
| 1 · plant | `return null` inserted at the top of `altRefusalReason` | **exit 1 — 22 of 108 assertions failed**, naming each refused input |
| 2 · nothing to check | both token lists emptied to `[]` | **exit 1 — 3 failed**: the two punctuation-delimited marker forms, plus `the token lists are non-empty — an emptied list must be a visible change`. **Finding:** the bare tokens (`TODO`, `picture`, …) still fail because they are shorter than `ALT_MIN_LENGTH`, so the length floor is real defence in depth for the common case; only the long prefix forms depend on the token lists |
| 3 · pass | correct code | **exit 0**, 108 assertions, including all 39 reviewed `alt` values |
| 4a · walk-through | the "tightening" to a **substring** test | **exit 1 — exactly the six legitimate captions failed.** This is the false-positive proof: a substring rule rejects real alt text |
| 4b · walk-through | `MARKER_DELIMITER` loosened to token-then-any-non-letter | **exit 1 — `"Todo el mundo crowds the square at sunset in Cartagena"` failed.** That is why the marker tier requires punctuation |

**The legitimate-caption proof (OD-2b's hard requirement).** Each of these contains a placeholder token as a word or a substring and **PASSES**:

| Caption | Why it is the interesting case |
|---|---|
| `Photo taken from the fort wall at dusk` | opens with `photo` — exact-match tier only, never leading |
| `Image reflected in the still water below the ghat` | opens with `image` |
| `A picture window framing the ridgeline at first light` | contains `picture` |
| `Altocumulus banked over the ridge before the rain came` | contains `alt` as a substring |
| `The alto sax case propped open on a bar stool` | contains `alt` as a word stem |
| `Todo el mundo crowds the square at sunset in Cartagena` | opens with the letters `todo` followed by a space — the reason the marker tier demands punctuation |
| `Kingfisher dive` (15 chars) | exactly at `ALT_MIN_LENGTH`; 14 chars is refused |

Plus the whole real corpus: **all 39 reviewed `alt` values pass**, iterated over the manifest with a floor (`>= 39`), so a 40th record strengthens the claim rather than falsifying it. Measured while choosing the floor: the shortest real `alt` is **83** characters, the longest **159** — so 15 sits ~5.5× below anything a human has written here, and none of the 39 contains any placeholder token as a substring.

**Residual holes, measured and recorded rather than papered over:**

```
"TODO add real alt text here"    -> ACCEPTED   (marker, space, letter; 27 chars)
"XXX marks the spot on this map" -> ACCEPTED
"??? what even is this shot"     -> ACCEPTED
"TODO: add real alt"             -> refused
"TODO"                           -> refused
```

Closing the first would mean refusing `Todo el mundo …`. That trade is written into `ALT_PLACEHOLDER_LEADING`'s comment, with the note that tier 1 catches the overwhelmingly common bare-token form, `ALT_MIN_LENGTH` catches fragments, and `PhotoSchema` remains the last line on the committed record.

### Control 4 — the variant table cannot drift from `REMOTE_URL_KEYS`. Shells: zsh (vitest) and zsh (`astro check`).

Planted a **reorder** (swapped `large` and `medium`):
- `npm run typecheck` → **exit 1**, `ts(2322): Type '"large"' is not assignable to type '"medium"'` **and** the mirror error, naming both positions.
- contract test → **exit 1**, 2 failures (`urlKeys deep-equal REMOTE_URL_KEYS, in order` and the measured-numbers block).
- restored → both exit 0, module byte-identical (`shasum` verified).

### Control 5 — three more contract controls, each planted and each failing

| Planted defect | Result |
|---|---|
| `THUMB.dataUriPrefix` mutated one character | **exit 1** — `THUMB is 40px q60 and its prefix IS the one PhotoUrlsSchema enforces`. This is the assertion the `THUMB_PREFIX` export exists to make possible |
| `STAGING_BUCKET` → `'portfolio-photo'` | **exit 1** — `STAGING_BUCKET is byte-equal to wrangler.jsonc r2_buckets[].bucket_name` |
| staging segment class loosened to the legacy `[A-Za-z0-9._-]+` | **exit 1** — 4 failures, including `REFUSES traversal: "temp/../secrets"` and `is stricter than the legacy /api/dispatch validator it replaces` |

### Control 6 — two assertions that failed for real, unplanted, during this plan

Better evidence than a planted defect, so recorded verbatim:

1. `the module contains no hostname literal (OD-3)` went **red on my own first draft** — the OD-3 paragraph in the module header spelled `images.akhilsaxena.com`. The header was rewritten to name the fact without the hostname. `gate:origin` would never have caught this: it looks for the *legacy* origin only.
2. `nothing else under src/ imports the pipeline contract` went **red on a false positive**: `src/schemas/photo.ts` legitimately *names* the module in a comment, and my first version tested `includes('photo-pipeline')`. Narrowed to an import-specifier pattern, with the reason written in place — a rule that fires on prose is a rule that gets deleted.

### Part 2 (`dimensions`) — a comment, so the proof is different, and it is stated as such

There is no gate here, and the summary says so rather than implying one. What was proven is that **nothing changed**: in a fresh `git clone --no-hardlinks` sandbox (bash), the content suite ran `444 passed (444)` / 7 files / exit 0 **before** the comment and `444 passed (444)` / 7 files / exit 0 **after** it, and a comment-stripped diff of `src/schemas/photo.ts` reports `IDENTICAL: no non-comment line changed`. Enforcement of the contract itself is **04-07's derivation test** (source metadata, never emitted variant size), not anything in this plan.

## Task 3 Parts 3 and 4, delivered rather than described

**Part 3 (W6) — `THUMB_PREFIX` export.** Added in **Task 2**, per the B2 repair, because Task 2's own test imports it and an ESM named import of a non-exported binding is a *load-time* error. Verified: `npm run gate:schema` exit **0** (a bare string constant is not a rival content shape), `npm run typecheck` exit **0**, and the drift assertion proven able to fail (Control 5). `npm run check` could not have caught the missing export — it is `biome check . && prettier --check` with no type resolution, which is why `typecheck` was run.

**Part 4 (W7) — the false `PHASE 4 OBLIGATION` at `src/lib/image-origin.ts:27`.** Amended, not deleted. What replaced it, in substance:

> **PHASE 4 CHECKED THAT CONDITION AND IT DID NOT HOLD.** (Amended 2026-08-27 by plan 04-02.) The paragraph is quoted back — it recorded that when the pipeline landed and a real consumer existed *at runtime*, `R2_PUBLIC_URL` would gain its `astro:env` and `wrangler` `vars` entries. *"The reasoning was right and the prediction was wrong, so it is falsified here rather than deleted"* — the 01-23 precedent, the same one that keeps `.planning/**` out of the CONT-04 scan set. Then what Phase 4 actually built: `src/lib/photo-pipeline.ts` plus `scripts/**`, run by Actions on a **Node runner**, composing every URL from `IMAGE_ORIGIN` by import (OD-3), so nothing reads the origin inside the Worker — the trigger the obligation named. Under `validateSecrets: true`, declaring the variable would still force provisioning a secret nothing reads: a build failure. Finally, the sibling comments are named, and the condition under which the original reasoning applies again (a Phase 7 admin route composing an upload URL) is stated.

## Deviations from Plan

### 1. [Rule 1 — measured defect in the plan's instruction] `photo-pipeline.ts` does NOT import `THUMB_PREFIX` from `src/schemas/photo.ts`

- **Found during:** Task 2, before writing the module.
- **The plan said:** *"`THUMB` … The prefix is the same string `PhotoUrlsSchema` enforces. **Import it** — and add the one-word `export` HERE."*
- **Why it cannot be done:** measured with plain `node`, the runtime every wave-4/5 script uses —

  ```
  import { PhotoUrlsSchema } from 'src/schemas/photo.ts'
  → ERR_MODULE_NOT_FOUND: .../src/lib/image-origin
  ```

  `photo.ts` imports the origin **extensionless** (`'../lib/image-origin'`), which Vite and `astro check` resolve and Node's ESM resolver does not. Importing `photo.ts` from the contract module would make 04-07's and 04-09's scripts unloadable — and the plan's own `<verification>` requires the opposite (*"resolves the module without a bundler — the scripts in `scripts/` import from `src/lib/` the same way `assert-no-r2dev-urls.mjs` already does"*). Adding `.ts` inside `photo.ts` was rejected too: `test/content/schemas.unit.test.ts:1024` asserts the specifier ends at `lib/image-origin`, and that file belongs to another plan.
- **What was done instead, preserving the plan's actual purpose:** `THUMB_PREFIX` **is** exported from `photo.ts` (the deliverable stands), and the agreement is asserted in the **contract test**, which runs under Vitest and imports both sides. The failure mode the plan was closing — *"comparing `THUMB.dataUriPrefix` against a literal re-typed in the test, which agrees with itself"* — is closed: Control 5 shows a one-character drift in the pipeline's prefix turns the test red.
- **Also verified:** the module loads under plain `node` and composes a key end to end (transcript above). Its only relative import carries `.ts`, and the test asserts that property for every relative import, because `npm run check` cannot see it.

### 2. [Rule 2 — correctness] `CONTENT_HASH_BYTES = 4`, plus `CONTENT_HASH_HEX_LENGTH = 8`

The plan describes `CONTENT_HASH_BYTES` alongside *"sliced to 8 characters"* and *"8 hex characters is 32 bits"* — a byte name for a character count, which is the shape of a real future bug (`hash.slice(0, CONTENT_HASH_BYTES)` → four characters → every URL in the manifest silently shortened). No other plan in the phase references the constant (grepped: only 04-02 names it), so the name now means what it says: **4 bytes**, with `CONTENT_HASH_HEX_LENGTH = CONTENT_HASH_BYTES * 2 = 8`. `contentHash()` returns exactly 8 characters, and `publishedKey` **refuses** a hash that is not `/^[0-9a-f]{8}$/`, so the misuse fails loudly at the first key composition. Asserted in the test.

### 3. [Rule 2 — the flip needed a guard to mean anything] the zero-match SCAN guard

Not in the plan. Step 3 of the plan's own proof says *"a SCAN rule that matched zero files would be indistinguishable from a SKIP"* and asks for the count to be asserted — but nothing in the gate reported per-rule counts, and nothing failed when a SCAN rule reached nothing. Both were added: per-rule counts in the PASS report, and GUARD AGAINST NOTHING (4/4) as a failure. It applies to all eight SCAN labels, not just the new one.

### 4. [Rule 2 — OD-2b's home] the alt refusal lives in the contract module

OD-2b is a new requirement and the plan gives it no file. The validator itself is 04-08's (`scripts/lib/dispatch-input.mjs`), but its *rules* are contract, and 04-08 is told to import from here. So `ALT_MIN_LENGTH`, the two token lists and `altRefusalReason` are exported here, and 04-08 imports rather than re-derives them. Two shapes are provided deliberately: `altRefusalReason` returns a reason string or `null` (so the workflow can print it, and so the rule is testable without try/catch), and `assertPublishableAlt` throws.

### 5. [Rule 3 — the type-level control was silently vacuous twice]

`VariantTable` had to be written as a mapped tuple over a **type parameter**. The two simpler forms both failed, and the failure modes are recorded in the module because a "tidied" version would compile while asserting nothing:
- generic `ImageVariant<K extends …>` inside the mapping → `ts(2344)`: the constraint is checked for every key including `length`, so `4` is offered where a key name is required;
- the same mapping with the shape inlined but over a **concrete** tuple → `ts(1360)`: not homomorphic, so `length` is mapped too and the result is an object type, not a tuple.

### 6. Scope held

`biome check --write` was run **only** on the five files this plan owns, never repo-wide, because 04-01 and 04-03 were committing concurrently. `git add` named explicit paths. `STATE.md` and `ROADMAP.md` were **not** touched.

## Things that contradict the plan or the research

1. **`04-RESEARCH.md`'s header is now malformed.** The resolutions block was inserted *inside* the parenthetical of the `**Confidence:**` line (line 5), so the file reads `… flagged inline and in \`## Open decisions — OD-1, 2, 3, 6, 7, 11 RESOLVED 2026-08-26` … and the stray `\`)` closes 16 lines later at `## Open decisions (original analysis follows)\`)`. The content is intact and unambiguous; the markdown is not. Not fixed — not this plan's file.
2. **The same falsified `R2_PUBLIC_URL` prediction lives in two more files.** `astro.config.mjs:160-162` and `wrangler.jsonc:68-70` both predict that Phase 4 adds the variable. Both are wrong for the reason measured in Part 4. This plan does not own either file, so they are **named inside** the `image-origin.ts` amendment rather than edited. Worth a line in 04-10.
3. **Task 3's Part numbering in the plan is inconsistent** — the `<action>` runs Part 1, Part 2, then **Part 5**, then Parts 3 and 4. All five were executed; only the reading order is odd.
4. **The plan's `<output>` block is closed twice** (`</output>` on both of the last two lines). Cosmetic.
5. **`grep -c` warning honoured.** Every file-content check in this plan is `! grep -q` or a `test -f … &&`-guarded form, or an assertion inside the contract test where a missing file throws rather than passing.
6. **`04-VALIDATION.md` gained hazard 7 while this plan ran** (04-01's finding: this Vitest setup swallows `console.log`/`console.info`; only `process.stdout.write` reaches the output). Checked: the contract test prints nothing and reports only through `expect`, so it is unaffected — and the two gates it exercises report through `console.error` + a non-zero exit, which is observed here as an exit code, not as text.

## Verification

| Command | Result |
|---|---|
| `npx vitest run --project unit test/pipeline/photo-pipeline-contract.unit.test.ts` | **exit 0**, 108 assertions |
| `npx vitest run --project unit` | **exit 0**, 611 tests / 10 files (includes 04-01's and 04-03's concurrent work) |
| `npm run gate:content` (schema, sinks, origin, routes) | **exit 0** |
| `npm run gate:origin` | **exit 0**, 94 in-scope files, `.github/** (2)` under SCAN |
| `npm run gate:schema` | **exit 0** — the new module declares no rival content shape; the `THUMB_PREFIX` export changes nothing |
| `npm run check` | **exit 0** |
| `npm run typecheck` (`astro check`) | **exit 0**, 0 errors over 64 files |
| `node <probe>.mjs` importing `src/lib/photo-pipeline.ts` | **exit 0** — loads and composes a key without a bundler |
| `test -f src/lib/photo-pipeline.ts && ! grep -q 'images\.akhilsaxena\.com' src/lib/photo-pipeline.ts` | **succeeds** |

## Known Stubs

None. Every export is implemented and asserted. Two deliberate non-implementations, both by decision rather than omission:

- **No `private/` key helper.** T-04-09 (39 unwatermarked masters publicly readable) is deferred to Phase 8 by Akhil; defining that path here would let a later plan compose one from this contract while the hole is open. What a new run uploads is OD-9, decided in 04-07.
- **`OBJECT_CACHE_CONTROL`'s `immutable` claim is provisional** until 04-10 measures whether the custom domain re-emits an object's `Cache-Control` (with a **GET**, never a HEAD). OD-1 A does not depend on it, and the caveat is written beside the constant.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The two trust boundaries this plan touches were already in the register and are mitigated here: T-04-04 (`assertStagingKey`, stricter than the legacy validator, 14 negative cases asserted) and T-04-05 / T-04-06 (`publishedUrl` composed from `IMAGE_ORIGIN`, origin **equality** asserted, no hostname literal in the file).

## Self-Check

- `src/lib/photo-pipeline.ts` — FOUND (698 lines)
- `test/pipeline/photo-pipeline-contract.unit.test.ts` — FOUND (586 lines)
- `src/schemas/photo.ts`, `src/lib/image-origin.ts`, `scripts/assert-no-r2dev-urls.mjs` — FOUND, modified
- `563e059` — FOUND (`feat(04-02): the phase's contract — one module for keys, staging and dispatch`)
- `324ee35` — FOUND (`feat(04-02): scan .github, write the dimensions contract, retire a false obligation`)

## Self-Check: PASSED
