---
phase: 03-content-layer-image-origin
plan: 01
subsystem: content / image origin
tags: [data-migration, gate, cdn-cache, negative-controls, od-1]
requires: ["02-02"]
provides:
  - "156 remote photo URLs on https://images.akhilsaxena.com"
  - "`IMAGE_ORIGIN` as the single canonical image origin in the repository"
  - "`REMOTE_URL_KEYS` as the single statement of which `urls` keys are remote"
  - "`npm run gate:origin` — the CONT-04 ship gate, scoped per OD-1"
  - "`migrate-photo-origin.mjs --verify` — a 156-URL liveness check"
affects:
  - "data/portfolio_images.json (156 values)"
  - "wrangler.jsonc (closing comment reworded — it held the last shipped legacy hostname)"
  - "package.json (gate:origin)"
tech-stack:
  added: []
  patterns:
    - "host substitution via `new URL()` with an asserted pathname equality, never a string replace"
    - "gate pattern assembled from DNS labels so the gate's own source is scannable without an exemption"
    - "exhaustive SCAN/SKIP path classification, with an unclassified path failing the gate"
    - "occurrence counting rather than `grep -c` line counting"
key-files:
  created:
    - "src/lib/image-origin.ts"
    - "scripts/migrate-photo-origin.mjs"
    - "scripts/assert-no-r2dev-urls.mjs"
  modified:
    - "data/portfolio_images.json"
    - "wrangler.jsonc"
    - "package.json"
decisions:
  - "`REMOTE_URL_KEYS` is exported alongside `IMAGE_ORIGIN` (the plan asked only for the origin): the migration and the gate both iterate exactly those four keys, and if they disagreed the gate would check different keys than the migration wrote"
  - "wrangler.jsonc's closing comment was reworded — OD-1 puts wrangler.jsonc in scope, and that comment held the last legacy hostname in a shipped file. The plan's resume-signal raised this as a sub-question that was never explicitly answered; the rewording is forced by OD-1, not chosen"
  - "the gate's regex is built from `['r2','dev']` so the gate's own source carries no matchable literal and needs no self-exclusion — an exclusion for 'the gate's own file' is a hole big enough to hide a real URL in"
  - "`test/**`, `.github/**` and `design_handoff_portfolio/**` are named SKIP rules with reasons; OD-1's list named neither include nor exclude for them, so leaving them unclassified would have been an unauthored hole"
  - "the migration refuses a PARTIALLY migrated manifest rather than completing it — 3-of-156 exits 1 and writes nothing"
metrics:
  duration: "~1h"
  completed: "2026-08-26"
  commits: 2
  gates: "gate:origin PASS; typecheck 0 errors; check exit 0; 156/156 URLs 200 image/webp"
---

# Phase 3 Plan 01: Image Origin Summary

All **156** remote photo URLs are on `https://images.akhilsaxena.com`, the hostname exists in exactly
one file in `src/`, and a gate that has been made to fail seven different ways stops the old origin
coming back. The old origin count in the shipped artefact set went **156 → 0**; the canonical count
went **0 → 156**.

Two commits on `main`:

| commit | what |
|---|---|
| `3c87696` | `content(03-01): move 156 photo URLs onto the cached custom domain` — 3 files, +495/−157 |
| `b969430` | `build(03-01): gate the legacy image origin out of the shipped artefact set` — 3 files, +484/−3 |

---

## 1. The four premises, re-derived before anything was written

The plan said to stop and report if any figure differed. None did.

| premise | plan said | measured from `data/portfolio_images.json` |
|---|---|---|
| records | 39 | **39**, top-level array |
| distinct remote hosts | 1 | **1** — `pub-2d90…r2.dev`, 156 values |
| remote URLs | 156 | **156** = 39 × 4 |
| `urls` keys | 5, one keyset | **5**, exactly one keyset across all 39: `original, large, medium, small, thumb` |

Also confirmed, because the rewrite's safety depends on them: **zero** anomalies in the `-lg`/`-md`/`-sm`
suffix convention, every `original` pathname starts with `/photos/<its own category>/`, all 39 thumbs
start `data:image/webp;base64,`, and no thumb contains a hostname. The record keyset is
`category, date, dimensions, exif, id, order, tags, title, urls` on all 39 — note `tags` is present and
empty, which matches the context doc's OD-3 finding; 03-04/03-06 own removing it.

**One premise was wrong, and it is the plan's own.** `<interfaces>` implies the file is already
`JSON.stringify(data, null, 2)` + trailing newline. It is not — the file on disk had **no trailing
newline** (57 344 bytes; the round-trip is 57 345). The plan's action text explicitly instructs writing
the newline, so I did, and the diff is therefore **157** changed lines rather than 156: the 156 URL
lines plus the closing `]` gaining a newline. Every other line is byte-identical. This is the only
non-URL change in the manifest.

---

## 2. The evidence re-measured, not taken on trust

### The legacy origin really is uncached

```
https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev/photos/abstract/intothemist.webp
  HTTP/1.1 200 OK
  Content-Type: image/webp
  Content-Length: 28426
  (no cf-cache-status, no cache-control, no age — the headers are absent, not MISS)
```

That is 02-02's measurement reproduced exactly, and it is the whole justification for the plan.

### The custom domain caches, and fronts the same bucket

```
https://images.akhilsaxena.com/photos/abstract/intothemist.webp
  req 1: HTTP/2 200  image/webp  28426  cache-control: max-age=14400  cf-cache-status: HIT
  req 2: HTTP/2 200  image/webp  28426  cache-control: max-age=14400  cf-cache-status: HIT

sha1  5df8409d01d926a3de1f1855a6ae7a5ac6242f96  custom domain
sha1  5df8409d01d926a3de1f1855a6ae7a5ac6242f96  r2.dev origin      ← same bucket, same bytes
```

Both requests returned `HIT` because the edge was already warm from the earlier session (`age: 372`,
then `374`). The `sha1` matches the figure supplied for review, digit for digit.

The plan's own gate is on the `-sm` variant against the SHA-256 that `02-DNS-R2-PREREQS.md` recorded:

```
24543e2811a80e5b98c5fad3952dde8f059d7b5db40627543d3a656be17e1fe3  live intothemist-sm.webp
24543e2811a80e5b98c5fad3952dde8f059d7b5db40627543d3a656be17e1fe3  recorded in 02-DNS-R2-PREREQS.md
```

### The category segment is load-bearing

The warning was worth heeding — a `basename`-shaped rewrite produces 156 plausible-looking 404s:

```
200 image/webp   /photos/abstract/intothemist-sm.webp   ← correct
404 text/html    /photos/intothemist-sm.webp            ← category dropped
404 text/html    /intothemist-sm.webp                   ← path dropped
```

The migration never constructs a path. It replaces `protocol`/`host`/`port` on a parsed `URL` and then
**asserts** `pathname` equality before writing, so this class of bug cannot be committed silently.

---

## 3. All 156 URLs resolve — not a sample

```
migrate-photo-origin --verify: PASS
  manifest: /Users/akhilsaxena/Documents/Personal/Repositories/portfolio/data/portfolio_images.json
  checked 156 of 156 URLs in 8.4s
  every one returned HTTP 200 with content-type image/webp from https://images.akhilsaxena.com
```

This is the only evidence in the project that all 39 photographs are reachable at their new addresses.

**On the plan's "well under a minute" estimate:** the first run took **101.5 s** because most objects
were cold; the run above, against a warmed edge, took **8.4 s**. The estimate is right, with the
qualifier the plan already stated.

---

## 4. OD-1 — the verdict and the exclusion set as shipped

Resolved by Akhil, **Option A**, recorded at the head of §3 of `03-CONTEXT.md`:

> The gate scopes to the shipped artefact set: `data/`, `src/`, `public/`, `scripts/`,
> `astro.config.mjs`, `wrangler.jsonc`, `*.example`, and `dist/` after a build. `.planning/**` and
> `CLAUDE.md`'s legacy section are excluded **by name, in the gate source, each with its reason
> written beside it**.

The gate implements this as an **exhaustive** SCAN/SKIP classification. Every reason below is in
`scripts/assert-no-r2dev-urls.mjs`, on the rule, not in this file.

| rule | disposition | reason (abridged from source) |
|---|---|---|
| `data/**` | SCAN | the committed content CONT-04 exists to keep migrated |
| `src/**` | SCAN | every module that ships, into the Worker or prerendered HTML |
| `public/**` | SCAN | copied verbatim into `dist/` and served as-is |
| `scripts/**` | SCAN | the migration and the gates; a wrong origin here rewrites data wrongly |
| `astro.config.mjs` | SCAN | build configuration — a value here reaches the build output |
| `wrangler.jsonc` | SCAN | deploy configuration and vars — a value here reaches the runtime |
| `*.example` | SCAN | templates a developer copies into real config, so a stale origin propagates |
| `dist/**` | SCAN | build output; walked from disk because it is untracked by design |
| `.planning/**` | SKIP | `02-DNS-R2-PREREQS.md` is **entirely** a before/after measurement of the two hostnames; a blanket replace would delete the evidence the migration was worth doing. 01-23 precedent: a document recording what was true on a date is falsified by a blanket replace, not updated by one. Nothing here has a path into the build. |
| `CLAUDE.md` | SKIP | its Technology Stack section quotes the legacy app's config value under a blockquote already scoping the section to `legacy/nextjs-portfolio`. Same historical-record reason. Named explicitly in OD-1. |
| `design_handoff_portfolio/**` | SKIP | exported design-tool HTML, never built, imported or served. Already excluded from Biome and Prettier for the same reason. |
| `test/**` | SKIP | a test asserting the migration or this gate works must be free to name the string it forbids as a fixture. Tests do not ship. |
| `.github/**` | SKIP | CI configuration, not a shipped artefact. **Flagged to revisit in Phase 4** — the Actions photo pipeline is the only future writer of new URLs, so once it exists its workflow env genuinely can carry an origin and this rule should move to SCAN. |
| `worker-configuration.d.ts` | SKIP | generated by `wrangler types` from `wrangler.jsonc`, which *is* scanned |
| `package-lock.json` | SKIP | npm-generated; registry URLs only, no hand edits reach it |
| tooling manifests + `README.md` | SKIP | build/lint/test config; none declares an image origin, none is served |

**Three of those SKIP rules are mine, not OD-1's.** OD-1 named an include list and named two
exclusions. It said nothing about `test/**`, `.github/**` or `design_handoff_portfolio/**`, all of
which exist and one of which (`design_handoff_portfolio/`, 6 occurrences) actually contains the legacy
hostname today. Leaving them merely *outside the include list* would have made them silent holes, so
each is a named rule with a reason. **`.github/**` is the one worth a second look** — it is the rule
most likely to be wrong once Phase 4 lands.

The classification is enforced, not decorative: **a tracked path matching no rule fails the gate**.
Adding a new top-level directory stops the build until someone decides in writing whether it ships.
That is what stops an allowlist from silently growing holes.

---

## 5. The gate, proven to fail seven ways

A gate that has never failed is an untested assertion. Every transcript below is real output.

### Step 1 — plant the defect it targets

`data[0].urls.small` set back to the legacy origin:

```
  ✖ data/portfolio_images.json:20: pub-2d90aedeebcf4142afe524930c3b6471.r2.dev
  ✖ data/portfolio_images.json abstract-intothemist.small: https://pub-2d90…r2.dev/photos/abstract/intothemist-sm.webp
  2 finding(s) (1 legacy-origin occurrence(s)).
exit=1
```

Both halves fired independently — the negative half by `file:line`, the positive half by `id.key`.

### Step 2 — it fails when there is nothing to scan

This is the "unfailable" mode that bit this project six times. Three variants, all exit 1:

```
2a  manifest moved aside
    ✖ data/portfolio_images.json: unreadable — ENOENT
    ✖ data/portfolio_images.json: missing
    2 finding(s) (0 legacy-origin occurrence(s).)              exit=1

2b  pointed at an empty git repo
    git ls-files returned no files … There is nothing to scan,
    so a PASS would be meaningless. Refusing.                  exit=1

2c  pointed at a non-git directory
    could not list tracked files in … — Command failed         exit=1
```

Note 2a reports **0 occurrences** and still exits 1. Finding nothing and having nothing to look at are
different results, and the gate distinguishes them.

### Step 3 — it passes on the migrated tree

```
assert-no-r2dev-urls: PASS
  scanned 72 in-scope file(s) — 0 occurrences of the legacy development origin
  manifest: 156 remote URL(s) across 39+ records all start with https://images.akhilsaxena.com/
  skipped by named rule: .github/** (2), repo tooling manifests and docs (12), .planning/** (304),
    CLAUDE.md (1), design_handoff_portfolio/** (6), package-lock.json (1), test/** (9),
    worker-configuration.d.ts (1)
```

72 files = 32 tracked in-scope + 40 in `dist/`, **as of that run**. The figure is a moving target while
plans 03-02 and 03-03 execute concurrently — a re-run minutes later reported `scanned 73` and
`test/** (10)`, because those plans added in-scope files. What is stable is the part that matters:
`0 occurrences` and `156 remote URL(s)`. The skip counts are printed on every pass, so the size of the
exclusion is visible on every run rather than implied.

### Step 4 — attempts to walk through it

| attempt | result |
|---|---|
| hostname in a `//` comment in `src/lib/r2.ts` | **blocked** — `✖ src/lib/r2.ts:33: pub-2d90…r2.dev`. Comments are deliberately scanned; a hostname in a comment is a hostname in the repo. |
| a `.md` under `src/`, **git-visible** | **blocked** — `✖ src/lib/notes.md:1: pub-2d90…r2.dev` |
| a `.md` under `src/`, **untracked** | **LEAK — exit 0.** See below. |
| hostname appended to a base64 `thumb` value | **blocked** — `✖ data/portfolio_images.json:21`. The raw-text scan sees it; and `thumb` can never *satisfy* the positive half, because that half iterates `REMOTE_URL_KEYS`, which excludes it. |
| **four** hits on **one** line | **blocked, and counted correctly** — 4 findings. `grep -c` reports that same file as **1 line**. This is the exact undercount the plan forbade. |
| uppercase `PUB-…R2.DEV` | **blocked** — the pattern is case-insensitive |
| a different bucket, `some-other-bucket.r2.dev` | **blocked** by the bare-suffix branch — `✖ .r2.dev` |
| the gate's own source | **scanned, clean.** It is tracked and in `scripts/**`, so it is scanned on the same terms as everything else. The pattern is assembled from `['r2','dev']`, so the file carries no matchable literal and needs **no self-exclusion**. |

**The one leak, recorded rather than papered over.** An **untracked** file in `src/` is not scanned,
because the gate uses `git ls-files`. That is the plan's own instruction and it is defensible — a
directory walk needs an ignore list kept in step with `.gitignore` and would descend into
`node_modules`. The boundary holds because an untracked file cannot ship: it is not in the commit CI
builds from, `git add -N` alone makes the gate see it, and if it were imported and built the `dist/`
half would catch the output. This is written into the gate's header as blind spot 1 of 3, together
with compressed PDF content and `dist/` staleness.

---

## 6. Idempotency, given the same four-step treatment

| step | result |
|---|---|
| **1. run twice, diff** | Run 1: `156 rewritten`. Runs 2 and 3: `0 rewritten — already migrated, nothing to do. File not written.` SHA-256 `320c6206…` identical across runs 0, 1 and 2; `diff` empty; `git diff --quiet` clean. The file is not even opened for writing on a no-op. |
| **2. fails with nothing to work on** | Missing manifest → `no manifest at … — refusing to report success with nothing to migrate`, exit 1. 38 records → `expected 39 records, found 38 … the 156-URL arithmetic no longer holds`, exit 1. |
| **3. passes on the un-migrated tree** | `156 rewritten`, 39 thumbs untouched, every pathname preserved — verified against the previous git revision, not against the diff. |
| **4. walk-through** | *Partial migration* (3 of 156 reverted): `would rewrite 3 URLs, expected 156 (153 were already canonical). A partially migrated manifest is not a state this script will silently complete — inspect it. Nothing written.` exit 1, and the file was confirmed untouched. *Vacuous no-op* (39 records, `urls` stripped to `thumb` only): 156 named errors, exit 1 — it cannot reach "0 rewritten" by having nothing to rewrite. *`--verify` on the same stripped manifest*: exit 1 with **zero network requests issued** (no `checked` line), i.e. it refuses before it can report a vacuous success. |

The `thumb` skip is by construction: the four remote keys are iterated by name from
`REMOTE_URL_KEYS`. The trap the plan named is real — `data:image/webp;base64,…` **does** parse as a
`URL`, so an "iterate everything and skip what doesn't parse" filter would have rewritten all 39
previews while looking like the careful option.

---

## 7. Deviations and contradictions

### The plan's own negative-control harness cannot pass — it is unfailable in the *opposite* direction

Three of the plan's `<verify>` blocks (Task 2 verify 2, Task 4 verifies 2 and 3) use:

```bash
( npm run gate:origin >/tmp/g1.txt 2>&1 && R=0 || R=1 ); test "$R" = "1" && echo OK || { echo FAIL; exit 1; }
```

`( … )` is a **subshell**. `R` never reaches the parent, so `test "$R" = "1"` compares `""` to `"1"`
and takes the FAIL branch **unconditionally** — including when the control works perfectly. Observed
live: the verifier correctly printed `1 of 156 URLs did not return 200` and exited 1, and the harness
still reported `FAIL: the verifier passed with a URL that cannot resolve`.

Demonstrated in isolation:

```
( false && R=0 || R=1 ); echo "$R"   →  <unset>     ← the plan's pattern
false; R=$?; echo "$R"               →  1           ← correct
```

Given this project's catalogue — *"unpassable even on a correct fix (3 times)"* — this belongs in the
register. **The gate and the verifier were never at fault; the harness measuring them was.** Every
control in this summary was re-run with `cmd >file 2>&1; R=$?`.

### `wrangler.jsonc` held the last legacy hostname in a shipped file

The gate's very first run failed on a real occurrence:

```
✖ wrangler.jsonc:59: .r2.dev
```

The comment read: *"A placeholder now would plant a `pub-*.r2.dev` reference for Phase 3 to hunt
down."* It was the reference. OD-1 puts `wrangler.jsonc` in scope by name, so under the decision as
written this file must be clean — the rewording is **forced by OD-1, not chosen by me**. The plan's
Task 3 `resume-signal` raised exactly this as a second question ("confirm whether `wrangler.jsonc`'s
closing comment should be reworded to reference `src/lib/image-origin.ts` instead"), and it was not
explicitly answered in the resolution. **If the intent was to leave it, the gate's `wrangler.jsonc`
SCAN rule is what needs revisiting, not the comment.**

The replacement records the corrected premise rather than deleting it: that the prediction was checked
and found wrong, why (`validateSecrets: true`), and where the origin actually lives.
`npx wrangler types` still parses the file.

### Task 2 shipped no commit of its own

`--verify` was written into `migrate-photo-origin.mjs` during Task 1 and landed in `3c87696`, so Task 2
produced evidence but no code and has no separate commit. Two commits, not four. Flagging it because
"one commit per task" is a stated rule and this is a real departure from it.

### `R2_PUBLIC_URL` is deliberately absent — the Phase 4 obligation

The plan asked me to falsify `wrangler.jsonc`'s premise, and it is false. Nothing in Phase 3 reads the
value at runtime: `grep -rn R2_PUBLIC_URL src/ scripts/ astro.config.mjs wrangler.jsonc *.example`
returns **two comments and zero consumers**. With `validateSecrets: true`, declaring it would convert a
value nothing reads into a build failure until someone provisions a secret.

**Phase 4 obligation, recorded in three places so it cannot be rediscovered as an omission** — the
`image-origin.ts` docstring, the reworded `wrangler.jsonc` comment, and here: when the Actions
publishing pipeline lands and a real runtime consumer exists, `R2_PUBLIC_URL` gains its `astro:env`
schema entry and its `wrangler.jsonc` `vars` entry, with `IMAGE_ORIGIN` as the build-time default
rather than a second source of truth.

### Forward-compatibility: the migration asserts *exactly* 39 records

Measured — add a 40th photo and:

- `migrate-photo-origin.mjs` (both modes) → `expected 39 records, found 40`, exit 1;
- `assert-no-r2dev-urls.mjs` → **passes**, because it asserts `>= 39`.

The gate is the long-lived artefact and is growth-tolerant, which is right. The migration is one-shot,
and refusing a manifest at a scale nobody reviewed is also right. But **`--verify` inherits that
strictness and stops working the day Phase 4 adds a photograph**, which is a shame for the only
whole-manifest liveness check in the project. I did not loosen it — the plan specified the 156
assertion explicitly and changing an asserted contract is not an executor's call. Phase 4 should decide
whether `--verify` becomes `39+`-tolerant or moves into the schema work.

### Scope boundary held

`npm run check` initially reported `test/content/site-config-migration.unit.test.ts:66
lint/suspicious/noExportsInTest` — plan 03-03's concurrent work, not mine. Left untouched; it was
resolved by that plan and `npm run check` now exits 0. `data/resume.json` and `data/site_config.json`
were never touched. Only my own files were passed to `biome check --write` — never the repo root.

---

## 8. What these checks cannot see

They prove no **manifest** URL reaches the old origin. They cannot prove no **rendered page** does,
because no page renders a photo yet — `dist/` currently contains **0** occurrences of any photo URL, so
the `dist/` half of the gate is real but has nothing to bite on. The positive half (every manifest URL
starts with `IMAGE_ORIGIN`) is the closest available substitute. **Phase 5 must add a `dist/`-scoped
assertion once a gallery exists**, and at that point the `dist/` walk already in this gate becomes
load-bearing rather than precautionary.

Also unproven: that the 156 objects are the *right* images. The gate checks addresses and
`content-type`, and the byte check covers one object against a recorded SHA-256. Nothing verifies that
`intothemist-md.webp` is a medium rendering of `intothemist`.

`gate:origin` is **not** chained into `build`, `check` or `deploy` — plan 03-08 owns wiring every
Phase 3 gate into `build` and CI in one place, so enforcement stays one file and one review rather
than five incremental edits. Until 03-08 lands, this gate only runs when invoked.

---

## Self-Check: PASSED

```
FOUND: src/lib/image-origin.ts
FOUND: scripts/migrate-photo-origin.mjs
FOUND: scripts/assert-no-r2dev-urls.mjs
FOUND: commit 3c87696
FOUND: commit b969430
gate:origin        exit 0
typecheck          0 errors, 0 warnings, 6 hints
check              exit 0
--verify           156/156 200 image/webp
legacy occurrences in the shipped artefact set: 0   (was 156)
```
