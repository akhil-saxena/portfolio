# Phase 4: Photo Pipeline (Actions half) — Research

**Researched:** 2026-08-26
**Domain:** GitHub Actions image pipeline · sharp/EXIF on a Node runner · R2 object lifecycle · CDN cache invalidation · concurrent writes to `main`
**Confidence:** HIGH on everything measured in this session; MEDIUM on two Cloudflare behaviours that could not be measured without R2 write credentials (flagged inline and in the open-decisions section).

> **Every number and every behavioural claim below carries the command that produced it.**
> Where a claim is cited rather than measured it is tagged `[CITED: url]`. Where it rests on
> training knowledge it is tagged `[ASSUMED]`. Six premises from the roadmap, `CLAUDE.md`,
> `PROJECT.md` and Phase 3's own summaries were re-tested this session; **four were wrong**
> and are corrected in §1.

---

## Summary

The legacy pipeline is a good skeleton and a poor fit. Its `processImage()` produces a record
that **fails the Phase 3 schema in four independent ways**, measured by planting one:
`alt` missing, `categoryOrder` missing, `tags: []` forbidden, and all four `urls.*` on the
retired `r2.dev` origin. So this phase is not a port — it is a rewrite of the record producer
against a schema that did not exist when the original was written.

The single most useful mechanism discovery is that **`astro sync` runs the entire Phase 3
content gate — all five per-file schemas and all six referential-integrity rules — in 1.7 s,
exits 1 on a violation, and needs no `.env`/`.dev.vars`** (measured; `astro build` *does* need
them and exits 1 without them). That makes "validate the candidate manifest entry before
touching R2 or git" a two-second step rather than a build, and it is the backbone of the
partial-failure story: **derive → validate → upload → commit**, so every side effect happens
after the only thing that can reject the record.

The two things nothing in the repository can currently see are the two things this phase must
add. First, **manifest↔bucket liveness**: a fully schema-valid 40th record pointing at four R2
objects that return 404 passes `astro sync` at exit 0 reporting `content set: PASS · checked:
40 photo(s)` (measured). Second, **cache versioning**: the current URLs are path-based, and a
GET returns `cache-control: max-age=14400` (measured), so a re-uploaded photo serves stale
bytes to a returning browser for up to four hours with no purge able to help.

**Primary recommendation:** implement the *documented* legacy design (R2 `temp/` →
`workflow_dispatch`), rewrite the record producer against `PhotoSchema`, put content hashes in
the R2 keys, order the job **derive → `astro sync` → upload → commit → delete temp**, and gate
the commit behind a new liveness verifier that generalises the hardcoded-39 one Phase 3 shipped.

---

## User Constraints

**There is no `04-CONTEXT.md`** — `.planning/phases/04-photo-pipeline-actions-half/` was empty
when this research ran (`ls` returned nothing). So there are no locked decisions from a
discuss-phase session. The constraints below are lifted from `CLAUDE.md` and from decisions
already recorded in `PROJECT.md` and Phase 3 artefacts; they bind this phase just as hard.

### Locked by `CLAUDE.md`

| Constraint | Consequence for Phase 4 |
|---|---|
| **No runtime filesystem.** Content is committed JSON; the admin publishes by committing via the GitHub API. | The manifest is the database. Every pipeline write is a git commit. |
| **Security: auth fails closed.** Missing configuration denies rather than degrades. | A missing R2 credential must fail the job, never skip the upload and commit a record anyway. |
| **Bindings come from `cloudflare:workers` and must NOT be absence-guarded.** | Irrelevant here and worth saying so: the pipeline runs on a **Node runner**, not in the Worker. It uses S3/REST credentials, not the `PORTFOLIO_BUCKET` binding. |
| **Performance: Lighthouse 95+, real budget on the gallery.** | Cache behaviour of newly written objects is a Phase 4 output, not a Phase 5 problem. |
| **GSD workflow enforcement.** | Plans, not ad-hoc edits. |

### Locked by `PROJECT.md` § Key Decisions (both currently `— Pending`, i.e. decided but unexecuted)

> *"**Implement the R2 staging pipeline, not the live one.** Keeps binaries out of git history
> and off the base64-through-a-Worker path. The dead `/api/dispatch` code was the better design,
> just abandoned."* — `PROJECT.md:248`

> *"**Split the photo pipeline: Actions half before admin UI.** The Actions half depends only on
> the schemas and can be driven with `gh workflow run`."* — `PROJECT.md:255`

This settles item 2 of the research brief **by prior decision**, and §2 below confirms its
factual premise independently.

### Locked by Phase 3

- `src/schemas/` is the **one** definition of every content shape.
  `scripts/assert-single-schema-source.mjs` fails on a rival `z.object` or `interface Photo`
  anywhere under `src/`. A pipeline script must not restate the photo shape inside `src/`.
- `src/lib/image-origin.ts` is the **only** place the image hostname is written.
- `OD-3`: `tags` is dropped and the schema declares it `z.never().optional()` with the decision
  in the error message.
- `OD-5`: `photo.focalPoint` and `home_config.peekPositions` both survive.

### Deferred / out of scope

- The admin UI, `/api/upload`, `publishContent`, and anything that renders a photo. Phases 5 and 7.
- Photo analytics (`PHOTO_ANALYTICS`) — dropped by decision, and `wrangler.jsonc` records why.

---

## Phase Requirements

| ID | Description | Research support |
|----|-------------|------------------|
| **PIPE-01** | A photo uploaded to R2 staging is resized, has its EXIF read, and is committed with an updated manifest | §3 legacy variant/EXIF/thumb spec (measured from source and from served bytes); §5 required record shape; §8 recommended job order |
| **PIPE-02** | Drivable end-to-end from the command line before any admin UI exists | §2 `/api/dispatch` had zero call sites; §7 `wrangler r2 object put` exists in the installed wrangler; §8 `gh workflow run` argv measured |
| **PIPE-03** | Re-running a job for the same upload does not duplicate entries | §6 measured: a naive duplicate append is caught by RI-5 (×2) and RI-6 — but only *after* the manifest is written, so idempotence must be decided in the producer, not left to the gate. OD-4 |
| **PIPE-04** | A partial failure does not leave the manifest inconsistent with the bucket, and staged objects expire | §6 measured: a schema-valid record pointing at four 404s passes at exit 0 — **no existing gate can see this**; §7 `wrangler r2 bucket lifecycle add … --expire-days` verified present. OD-5, OD-6 |
| **PIPE-05** | Pipeline commits and admin publishes cannot clobber each other | §9 `baseSha: "latest"` confirmed on the legacy branch; GitHub `PUT /contents` 409 and `PATCH /git/refs` fast-forward semantics cited; the GITHUB_TOKEN trigger suppression measured against docs. OD-7, OD-8 |
| **CONT-05** | A re-uploaded photo does not serve stale forever | §4 full cache measurement, including the HEAD-vs-GET trap. OD-1, OD-2 |

---

## 1. What the source documents got wrong

Re-measured this session. Do not re-derive these.

| # | Premise, and where it is written | Measured, 2026-08-26 |
|---|---|---|
| 1 | `03-01-SUMMARY.md` §2: *"req 1: … `cache-control: max-age=14400` `cf-cache-status: HIT`"*, presented as the output of `curl -sSI` | **Both halves are true only for GET.** `curl -sSI` (HEAD) on the same URL returns `cf-cache-status: DYNAMIC` **and no `cache-control` header at all**, reproducibly, on three objects × three tries. A GET returns `REVALIDATED` then `HIT` with `cache-control: max-age=14400`. **Any cache verification in this project must use GET.** The research brief itself proposed `curl -sSI` twice — that method would have produced a false "the CDN is not caching" conclusion. |
| 2 | `CLAUDE.md` § Architecture: *"Apply watermark to original and medium (not thumb)"* — the comment is copied from the legacy source | **The comment contradicts its own code.** `scripts/process-images.js` applies `addWatermark()` inside the `for (const variant of VARIANTS)` loop, i.e. to **all four** variants. Only the 40 px base64 thumb and the `private/*-clean.webp` copy skip it. |
| 3 | `CLAUDE.md` § Configuration and the legacy workflow: the pipeline needs five R2 Actions secrets | **All five already exist in the repository**, dated `2026-03-28` (`gh secret list`). They are not a `user_setup` gap — but `R2_PUBLIC_URL` predates the `images.akhilsaxena.com` custom domain by five months, so it almost certainly still holds the `r2.dev` value. See OD-3. |
| 4 | `src/lib/image-origin.ts` header: *"**PHASE 4 OBLIGATION** … when the Actions publishing pipeline lands and a real consumer of the origin exists **at runtime**, `R2_PUBLIC_URL` gains its `astro:env` schema entry and its `wrangler.jsonc` `vars` entry"* | **The obligation's own condition is not met.** The Actions pipeline runs on a Node runner, never inside the Worker; there is still no runtime consumer of the origin in the Worker after Phase 4. `astro.config.mjs` sets `validateSecrets: true`, so declaring the variable would force provisioning a secret nothing reads — the exact failure the comment warns against. **Do not obey this comment; it was written against a different Phase 4 than the one the roadmap describes.** |
| 5 | `03-01-SUMMARY.md`: *"`03-01`'s `--verify` asserts exactly 39 records and stops working the day a 40th photo lands"* (also in `STATE.md` Pending Todos) | **Confirmed, and narrower than feared.** `scripts/migrate-photo-origin.mjs:65` has `EXPECTED_RECORDS = 39` compared with `!==`; run against a 40-record manifest it exits 1 with `expected 39 records, found 40`. But `scripts/assert-no-r2dev-urls.mjs:103` uses the same constant as a **floor** (`manifest.length < EXPECTED_RECORDS`) and **passes** at 40, reporting `160 remote URL(s) across 39+ records`. Only the verifier breaks. |
| 6 | Roadmap Phase 4 note: *"It also settles the manifest shape and **the content-hashed key scheme** (CONT-05)"* | Not wrong, but it is a **presumption of the answer**, not a decision anyone recorded. No ADR, CONTEXT or PROJECT decision selects content hashing over the alternatives. Treated as OD-1, with the roadmap's preference noted as evidence rather than as a lock. |

---

## 2. `/api/upload` vs `/api/dispatch` — settled with evidence

**Claim under test** (`CLAUDE.md` § Architectural Constraints): the wired admin flow used
`/api/upload` (commits raw files to `new-photos/`, relying on the push trigger), while
`/api/dispatch` implements an R2 `temp/` + `workflow_dispatch` path that nothing calls.

```bash
git grep -n "api/dispatch" legacy/nextjs-portfolio          # every occurrence, whole tree
git grep -n "api/upload"   legacy/nextjs-portfolio
```

| Route | Call sites in `src/` | Where the string appears at all |
|---|---|---|
| `/api/dispatch` | **0** | `AGENTS.md:28`, and `docs/superpowers/specs/…-admin-panel-design.md` at lines 34, 208, 304 — three prose documents and nothing else |
| `/api/upload` | **1** | `src/app/admin/page.tsx:249` — `await fetch("/api/upload", { method: "POST", body: formData })` |

**Verified.** `/api/dispatch` is dead code that only documents describe; `/api/upload` is the
only path the admin ever exercised. Reading `src/app/api/upload/route.ts` confirms the
mechanism: it base64s the file (`toBase64(await file.arrayBuffer())`) and `PUT`s it to
`new-photos/<category>/<name>.<ext>` through the GitHub Contents API, which fires
`process-photos.yml`'s `on: push: paths: ['new-photos/**']` trigger.

### Recommendation: implement the dispatch design

**This is already a recorded project decision** (`PROJECT.md:248`) and the evidence supports it:

| | `/api/upload` (push trigger) | `/api/dispatch` (R2 `temp/` + `workflow_dispatch`) |
|---|---|---|
| Binary in git history | **Yes, permanently** — a 25 MB base64 blob per photo, unremovable without a history rewrite | No |
| Path through the Worker | Whole file base64-encoded in a Worker isolate | Worker only names an R2 key |
| Idempotence handle | The file path in git | The `temp/` key, which the job deletes on success — a natural once-only token |
| Cleanup story | `new-photos/` must be emptied in the same commit | R2 lifecycle rule, prefix-scoped (§7) |
| Drivable with no UI | Awkward — needs a commit to a magic directory | **`gh workflow run process-photos.yml -f temp_key=…`** |

**Inference, not proof:** success criterion 1 names `gh workflow run process-photos.yml`, which
is `workflow_dispatch`. That points at the dispatch design. It is an inference because a
`workflow_dispatch` trigger could equally be bolted onto a push-shaped job — the criterion
constrains the *trigger*, not the *staging mechanism*.

**Consequence to plan for:** `new-photos/` must not be created. It is not a tracked directory
today, and §6 shows that a new top-level directory **fails `gate:origin`** until someone adds a
classification rule with a reason.

---

## 3. The legacy pipeline, read from source

`git show legacy/nextjs-portfolio:scripts/process-images.js` — measured, not summarised.

### Variants

```js
const VARIANTS = [
  { suffix: "",    maxWidth: 2000, quality: 85 },   // → urls.original
  { suffix: "-lg", maxWidth: 1200, quality: 85 },   // → urls.large
  { suffix: "-md", maxWidth: 800,  quality: 85 },   // → urls.medium
  { suffix: "-sm", maxWidth: 400,  quality: 80 },   // → urls.small
];
```

Each is `sharp(buf).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer()`
where `width = Math.min(variant.maxWidth, sourceWidth)`. R2 key:
`photos/<category>/<slug><suffix>.webp`, `ContentType: image/webp`. **No `CacheControl` is set
on any PutObject** — which §4 shows is exactly why the zone default applies.

Confirmed against live bytes:

```bash
curl -sS "https://images.akhilsaxena.com/photos/nature/fairwayreflections-sm.webp" -o p.webp
node -e "require('sharp')('p.webp').metadata().then(m=>console.log(m.width+'x'+m.height))"
# → 400x267
```

### Watermark

`addWatermark(buffer, width)` composites an SVG `<text>` reading `akhil saxena`:

- font: `monospace`, weight 400, `letter-spacing: 0.08em`
- size: `Math.max(10, Math.min(24, Math.round(width * 0.01)))` — so 20 px at 2000 wide, clamped to 10 px at 400 wide
- fill: `rgba(255,255,255,0.20)`
- anchored bottom-right, inset `Math.round(width * 0.015)` on both axes
- `gravity: "center"` on the composite, with the SVG sized to the full image

Applied to **all four** variants (see §1 row 2). The 40 px thumb and the clean copy skip it.

### The `private/` clean original — **a live security exposure, measured today**

```js
await r2Client.send(new PutObjectCommand({
  Bucket: bucket,
  Key: `private/${category}/${slug}-clean.webp`,   // "private" is a prefix, not a permission
  Body: cleanOriginal, ContentType: "image/webp",
}));
```

The prefix confers nothing. The bucket is public on `images.akhilsaxena.com`, so every clean
original is fetchable at a URL derivable from the committed manifest. Probed all 39:

```bash
# derive private/<category>/<basename(urls.original)>-clean.webp for each record, then:
while read -r u; do curl -sS -o /dev/null -w '%{http_code}\n' "$u"; done < keys.txt
```

**39 / 39 returned HTTP 200 with real image bytes.** Spot checks:

| URL | Status | Bytes | Dimensions |
|---|---|---|---|
| `…/private/architecture/redbuilding-clean.webp` | 200 | 370 510 | — |
| `…/private/abstract/intothemist-clean.webp` | 200 | 30 834 | — |
| `…/private/nature/fairwayreflections-clean.webp` | 200 | 831 512 | 2000×1333 |

The watermark on the public variants is therefore decorative: the unwatermarked 2000 px
original is one guessable path away. **This predates Phase 4 and is true of production right
now.** It is not caused by anything this phase does, but this phase is the one that decides
whether to keep writing them. See OD-9.

### EXIF

```js
exifr.parse(filePath, {
  pick: ["Make","Model","LensModel","FNumber","ExposureTime","ISO","FocalLength"],
  gps: false,
})
```

mapped to exactly the six schema fields:

| Schema field | Derivation | Null when |
|---|---|---|
| `camera` | `[Make, Model].filter(Boolean).join(" ")` | join is empty |
| `lens` | `LensModel` | absent |
| `aperture` | `` `f/${FNumber}` `` | `FNumber` falsy |
| `shutter` | `ExposureTime < 1 ? `1/${Math.round(1/t)}` : `${t}s`` | absent |
| `iso` | `ISO` (number) | absent |
| `focalLength` | `` `${FocalLength}mm` `` | absent |

`extractExif` returns `null` on any throw, and the caller substitutes an all-null object — so a
file with no EXIF still produces a schema-valid `exif` block. That behaviour must be preserved:
`PhotoExifSchema` is `strictObject` with six **nullable, non-optional** fields.

Null census in the committed manifest, measured:

```
camera=1  lens=11  aperture=2  shutter=2  iso=2  focalLength=2
```

**`DateTimeOriginal` is deliberately not picked.** `date` is set to
`new Date().toISOString().split("T")[0]` — the *processing* date. Measured distribution across
the 39 records: `{"2026-03-28": 38, "2026-04-07": 1}`. Both are ingestion dates; not one is a
capture date. See OD-10.

### LQIP thumb

`sharp(src).resize({ width: 40, withoutEnlargement: true }).webp({ quality: 60 })`, then
`` `data:image/webp;base64,${buf.toString("base64")}` ``. No watermark. All 39 committed thumbs
start with that prefix, which `PhotoUrlsSchema` enforces.

### `dimensions` means the **source** size, not the emitted size

```
manifest dimensions ≠ 2000 wide:
  architecture-redbuilding    1920x1280  (ratio 1.500)
  abstract-plane              1318x2341  (ratio 0.563)
  nature-fairwayreflections   4608x3072  (ratio 1.500)
```

Fetched and measured with sharp:

| Record | `dimensions` | served `urls.original` |
|---|---|---|
| `architecture-redbuilding` | 1920×1280 | **1920×1280** |
| `abstract-plane` | 1318×2341 | **1318×2341** |
| `nature-fairwayreflections` | 4608×3072 | **2000×1333** |

So `dimensions` is `sharp(sourceBuffer).metadata()` — for sources under 2000 px it coincides
with `original`, and for larger ones it does not. Ratio survives (4608/3072 = 1.500;
2000/1333 = 1.5004, off by 0.03 % from integer rounding). **PUB-05 wants `dimensions` for CLS
reservation, which needs the ratio and not the absolute size, so the existing data works — but
the contract has never been written down and Phase 4 is the producer.** See OD-11.

### Two entry points, both replaced

`action-process.js` (push mode, walks `new-photos/<category>/`) is retired with the push
trigger. `action-process-dispatch.js` (dispatch mode) is the shape to keep, but note what it
does wrong for this phase:

- `if (existingIds.has(entry.id)) { console.error("Duplicate ID"); process.exit(1); }` — a
  re-run **fails** rather than no-ops (OD-4).
- `entry.order = maxOrder + 1` only; **`categoryOrder` did not exist** and is now required.
- `entry.tags = tags` — now forbidden by the schema.
- It writes the manifest, *then* deletes the R2 temp object, with no validation between.
- `JSON.stringify(merged, null, 2)` with **no trailing newline** — 03-01 measured the committed
  file at 57 345 bytes *with* the newline it added, so a legacy-shaped write would revert it and
  produce a spurious one-line diff on the closing `]`.

---

## 4. CONT-05 — the cache measurement

### The measurement, and the trap in the brief's own method

```bash
U="https://images.akhilsaxena.com/photos/abstract/intothemist.webp"
curl -sSI "$U"                                   # HEAD
curl -sS -o /dev/null -D - "$U"                  # GET
```

| Method | `cf-cache-status` | `cache-control` | `age` |
|---|---|---|---|
| **HEAD** ×3, three different objects | `DYNAMIC` every time | **absent** | absent |
| **GET** try 1 | `REVALIDATED` | `max-age=14400` | — |
| **GET** try 2, 3 | `HIT` | `max-age=14400` | `0` |

**A HEAD request against this origin reports `DYNAMIC` and carries no `cache-control` at all.**
Any gate or verification step in this phase that uses `curl -I` will conclude the CDN is not
caching and will be wrong. Use GET.

### Where `max-age=14400` comes from — and where it does not

```bash
curl -sS -o /dev/null -D - "https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev/photos/abstract/intothemist.webp"
# → HTTP/1.1 200 OK, ETag only. No cache-control, no cf-cache-status, no age.
```

The R2 object itself carries **no `Cache-Control` metadata** — the legacy `PutObjectCommand`
never set one. So on the custom domain:

- **Edge TTL:** Cloudflare's default for a 200 with no origin cache header, **120 minutes**
  `[CITED: developers.cloudflare.com/cache/concepts/default-cache-behavior/]`. `.webp` is in the
  default-cached extension list, which is why we see `HIT` at all.
- **Browser TTL:** `max-age=14400` = **4 hours**, injected by the zone, not by the object.

So overwriting bytes at the same key leaves a returning browser serving the old image for up to
four hours, with the edge revalidating after two. That is CONT-05's whole problem, and it is
measured rather than assumed.

### A query string **is** part of the cache key

```bash
U="https://images.akhilsaxena.com/photos/abstract/intothemist.webp?v=$(date +%s)"
# try1: cf-cache-status: MISS   cache-control: max-age=14400
# try2: cf-cache-status: HIT    age: 0
```

A previously unseen `?v=` produced a genuine `MISS` then `HIT`. Version-in-query works at the
edge, and a different URL is a different browser cache entry too.

### The three options, costed

| Option | Fixes edge? | Fixes browser? | New infra | Cost |
|---|---|---|---|---|
| **A. Content-hashed key** — `photos/<cat>/<slug>-<hash8><suffix>.webp` | Yes, by construction | Yes | none | Breaks the measured `id === category + "-" + basename(urls.original)` invariant (holds on 39/39 today); leaves the previous version's objects behind on re-upload; makes the manifest URLs less human-readable |
| **B. Query-string version** — `…/<slug>-lg.webp?v=<hash8>` | Yes (**measured**) | Yes | none | The R2 object stays mutable, so a re-upload overwrites live bytes — R2 documents "maximum concurrent writes to the same object name: 1 per second" `[CITED: developers.cloudflare.com/r2/platform/limits/]`; a mid-write reader can get either version; some CDN/cache-key configurations strip query strings, so the property must be re-measured if zone cache settings ever change |
| **C. Purge API** — `POST /zones/{id}/purge_cache` with a Zone → Cache Purge → Edit token `[CITED: developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/]` | Yes | **No** | a new zone-scoped API token + `CLOUDFLARE_ZONE_ID` | **Insufficient alone.** The measured response carries `cache-control: max-age=14400`, and no server-side purge reaches a browser cache that already holds it |

**Recommendation: A, with `Cache-Control: public, max-age=31536000, immutable` set at
PutObject.** It is the only option under which the bytes at a URL never change, which
independently helps PIPE-04: a re-run cannot half-overwrite an object a live page is reading.
C is ruled out on evidence. B is a real, cheaper alternative and is recorded as such in OD-1.

⚠️ **One premise of A must be measured, not cited.** R2's S3 API is documented to accept
`Cache-Control` on PutObject — *"✅ System Metadata: ✅ Content-Type ✅ Cache-Control …"*
`[CITED: developers.cloudflare.com/r2/api/s3/api/]`. Whether the **custom domain re-emits it**
in place of the zone's `max-age=14400` is **not stated on any first-party page I could find**;
two of the three Cloudflare pages fetched explicitly do not cover it, and the only sources that
assert it are third-party `[ASSUMED]`. It is trivially measurable once R2 write credentials are
available: `wrangler r2 object put portfolio-photos/probe.webp --file … --cache-control
"public, max-age=31536000, immutable" --remote`, then GET it and read the header. **That
measurement belongs in the plan that chooses the key scheme, before the scheme is locked.**

---

## 5. What Phase 3 gives you to build on

### The required record shape, read from `src/schemas/photo.ts`

| Field | Type | Required? | Notes for a producer |
|---|---|---|---|
| `id` | `string` matching `/^[a-z0-9-]+$/` | **yes** | measured invariant: `id === category + "-" + basename(urls.original)` on **39/39**. Not asserted anywhere. |
| `title` | `string`, min 1 | **yes** | legacy derives it from the filename via `titleCase()` |
| `alt` | `string`, min 1 | **yes** | **cannot be machine-generated** — see below |
| `category` | `string` matching the slug regex | **yes** | must resolve in `site_config.categories[].id`; **exact comparison, no case transform** |
| `date` | `string` matching `/^\d{4}-\d{2}-\d{2}$/` | **yes** | today it is the ingestion date, not the capture date (OD-10) |
| `exif` | strict object, six fields, each `string\|number\|null` | **yes** | **nullable, not optional** — the object must be present with all six keys |
| `urls` | strict object | **yes** | `original`, `large`, `medium`, `small` must each parse as a URL whose `.origin === IMAGE_ORIGIN` **by origin equality, not `startsWith`**; `thumb` must start `data:image/webp;base64,` |
| `order` | positive int | **yes** | unique across the whole manifest (RI-5) |
| `categoryOrder` | positive int | **yes** | unique **within its category** (RI-6). Legacy never produced this. |
| `dimensions` | `{width,height}` positive ints | **yes** | source dimensions today (§3) |
| `place` | `string`, min 1 | optional | 16 / 39 filled |
| `description` | `string`, min 1 | optional | 0 / 39 filled |
| `focalPoint` | `string` matching `/^\d{1,3}% \d{1,3}%$/` | optional | **no zod `.default()`** — deliberate, so `parse()` never materialises it. `DEFAULT_FOCAL_POINT = '50% 50%'` is exported for the renderer. |
| `tags` | `z.never().optional()` | **forbidden** | present-and-empty fails with the OD-3 rationale in the message |

`PhotoSchema` also carries a `superRefine` with four `alt` rules: non-empty after trim; not
equal to `title` (compared case- and whitespace-insensitively); must not open with
`image of` / `photo of` / `picture of`; must not contain `[AKHIL-`.

`z.strictObject` throughout — an unknown key is a failure, not an addition.

### The six referential-integrity rules (`src/schemas/content-set.ts`)

| Rule | Assertion | How a new photo can break it |
|---|---|---|
| RI-1 | every `photo.category` ∈ `site_config` ids | a dispatch input naming a category that does not exist |
| RI-2 | every declared category is used by ≥1 photo | not reachable by adding |
| RI-3 | every `home_config.peekIds` entry is a real photo id | only by **deleting** |
| RI-4 | every `peekPositions` key ∈ `peekIds` | not reachable by adding |
| RI-5 | `photo.id`, `photo.order`, `project.id` each unique | **a re-run appending a second copy** |
| RI-6 | `categoryOrder` unique within its category | **a re-run, or a wrong rank derivation** |

Every violation is accumulated, never thrown on first. `report.checked` reports how many things
each rule looked at, and a rule whose input failed its own schema is listed in `rulesSkipped`
rather than counted as passing.

### Where enforcement actually lives — and how much it costs

Measured in a clone with a 40th record planted (`git clone --no-hardlinks`, `node_modules`
symlinked, argv passed explicitly because **zsh does not word-split an unquoted `$cmd`** —
my first timing run passed `"astro sync"` as one argv element and "failed" in 245 ms):

| Command | Exit on clean data | Elapsed | Needs `.env`/`.dev.vars`? | Runs the content gate? |
|---|---|---|---|---|
| `npx astro sync` | 0 | **1 735 ms** | **No** (measured: exit 0 without them) | **Yes** — full census, all six RI rules |
| `npx astro check` | 0 | 4 313 ms | No | Yes |
| `npx astro build` | 0 | 2 172 ms | **Yes** — exits 1 at `validatePublicVariables` without them | Yes |

All three print the identical line:

```
[content-gate] content set: PASS · checked: 40 photo(s), 7 category record(s), 6 peek id(s),
1 peek position(s), 5 project(s), 7 categoryOrder group(s) · rules run: RI-1…RI-6
```

**`astro sync` is the cheapest complete validator and the only one that needs no secret
seeding.** A photo workflow that uses it does not need `npm run bootstrap:local` and therefore
never has placeholder Access values sitting in a job that also holds real R2 credentials.

### The scripts **cannot** import the schema

`astro.config.mjs` records the measurement: *"`src/schemas/index.ts` re-exports with
EXTENSIONLESS relative specifiers, which only a bundler resolves. A plain `node scripts/*.mjs`
cannot import this module, which is why the content gate lives in the build rather than in a
script beside the other gates."*

**This is the load-bearing architectural constraint of Phase 4.** A `scripts/*.mjs` pipeline
step cannot call `PhotoSchema.parse()`. It has exactly two honest options: shell out to
`npx astro sync` (recommended — one mechanism, already proven, 1.7 s), or add a bundler-aware
runner. It must **not** restate the shape: `gate:schema` fails on a rival definition under
`src/`, and while `scripts/` is outside that scan, a second copy there is the drift CONT-01
exists to prevent.

### `alt` is required and cannot be machine-generated — the unresolved design question

`alt` is `z.string().min(1)` plus four `superRefine` rules. The Phase 3 record is emphatic
about why: `test/content/photo-enrichment.unit.test.ts` opens with *"The public gallery ships
zero framework JS, so `alt` is delivered on the `<img>` element and is **the entire non-visual
experience** of 39 images … A string that was re-wrapped, curly-quote-normalised, truncated or
'improved' in transit is no longer the string that was reviewed."* All 39 existing values were
written by looking at each photograph and reviewed with Akhil on 2026-08-23.

There is **no mechanism in the repository** by which a pipeline could obtain one. The four
candidate answers are laid out as **OD-2** — this is the phase's biggest genuine fork, and it
determines whether the pipeline can complete unattended at all.

Note the interaction that rules one option out immediately: a placeholder would have to survive
`astro sync`. `alt: "TODO"` passes `min(1)` and all four refinements, so it would ship a
photograph announced to a screen reader as "TODO". `alt: "[AKHIL-ALT] …"` fails the marker rule
and would red the build — loudly, but a red `main` blocks the deploy of everything else.

---

## 6. What no existing gate can see — measured by planting

### A schema-valid record can point at four 404s

Planted a 40th record: correct origin, correct slug regex, real-looking `alt`, `order: 40`,
`categoryOrder: 9`, valid thumb prefix. The four R2 objects do not exist.

```
npx astro sync   → EXIT=0, elapsed 2s
[content-gate] content set: PASS · checked: 40 photo(s) … rules run: RI-1…RI-6

curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
  https://images.akhilsaxena.com/photos/nature/newphoto.webp
→ 404 text/html
```

**The build is green and the site would ship four broken images.** `gate:origin` also passes —
it checks the *origin* of every URL, never its liveness. `PhotoSchema`'s `remoteUrl` refinement
does the same. **PIPE-04's "manifest consistent with the bucket" has no existing enforcement
whatsoever, and building one is a Phase 4 deliverable.**

The tool for it already exists in shape: `scripts/migrate-photo-origin.mjs --verify` fetches all
156 URLs and requires 200 + `image/webp` on each. It just refuses to run at 40 records (§1 row 5).

### A naive duplicate append **is** caught — but only after the write

Appended record 40 a second time, verbatim:

```
npx astro sync → EXIT=1
✖ [RI-5] data/portfolio_images.json → indices 39, 40: duplicate photo id "nature-newphoto"
✖ [RI-5] data/portfolio_images.json → indices 39, 40: duplicate global order value 40
✖ [RI-6] data/portfolio_images.json → category nature: categoryOrder 9 is used by
         nature-newphoto and nature-newphoto
```

So the safety net exists. It is a net, not a design: it fires after the manifest is on disk. If
the pipeline validates before uploading and committing (§8), this becomes a job failure with no
side effects, which is what PIPE-03 should mean.

### The legacy record shape, dropped in unmodified

Planted exactly what `processImage()` returns. `npx astro sync` → **EXIT=1, seven findings in
four classes**:

```
✖ [SCHEMA-photos] … → alt: Invalid input: expected string, received undefined
✖ [SCHEMA-photos] … → urls.original: must be an absolute URL whose origin is exactly
      https://images.akhilsaxena.com … received "https://pub-2d90…r2.dev/photos/nature/newphoto.webp"
   (× 4, one per remote key)
✖ [SCHEMA-photos] … → categoryOrder: Invalid input: expected number, received undefined
✖ [SCHEMA-photos] … → tags: OD-3: `tags` is dropped …
  checked: 40 photo(s) … rules run: RI-4
  rule NOT run: RI-1 … RI-6 — not run — data/portfolio_images.json did not satisfy its own schema
```

**This is the porting delta, exactly.** Four changes to `processImage()` and nothing else about
its imaging logic is wrong.

### A new top-level directory fails `gate:origin`

Running the gate in a sandbox that had picked up four stray `*.out` files:

```
✖ origin.out: unclassified path
    this path matches no SCAN or SKIP rule, so nobody has decided whether it ships.
    Add a rule to RULES in this file, with its reason, before the build can proceed.
  4 finding(s) (0 legacy-origin occurrence(s)).
```

The exhaustive SCAN/SKIP classification is real and it bites. **If Phase 4 creates any new
top-level path — `new-photos/`, a staging dir, a fixtures dir — the build stops until a rule
with a written reason is added to `scripts/assert-no-r2dev-urls.mjs`.** Plan for it.

Also confirmed by flipping record 40 back to the legacy host: the gate reports
`12 finding(s) (4 legacy-origin occurrence(s))` and names `IMAGE_ORIGIN` as the import to use.

---

## 7. Environment, credentials and R2 lifecycle

### What is provisioned today

```bash
gh auth switch --hostname github.com --user akhil-saxena   # the akhil-brevo account gets 403
gh secret list   --repo akhil-saxena/portfolio
gh variable list --repo akhil-saxena/portfolio
```

| Name | Kind | Created | Phase 4 relevance |
|---|---|---|---|
| `R2_ACCESS_KEY_ID` | secret | 2026-03-28 | S3-compatible R2 credential — **already exists** |
| `R2_SECRET_ACCESS_KEY` | secret | 2026-03-28 | already exists |
| `R2_BUCKET_NAME` | secret | 2026-03-28 | already exists; `wrangler.jsonc` names the bucket `portfolio-photos` in the clear, so this being a secret is legacy caution |
| `R2_ENDPOINT` | secret | 2026-03-28 | already exists |
| `R2_PUBLIC_URL` | secret | 2026-03-28 | **exists, and is five months older than the custom domain** → OD-3 |
| `CLOUDFLARE_ACCOUNT_ID` | secret | 2026-08-19 | used by `deploy.yml`; also what `wrangler r2 …` needs |
| `CLOUDFLARE_API_TOKEN` | secret | 2026-08-19 | scope unknown from here — see below |
| `DEPLOY_ENABLED` | variable = `true` | 2026-08-19 | deploys are live |

No secret **value** was read, and none should be. Names and timestamps only.

**Not provisioned, and needed depending on the decisions taken:**

| Item | Needed for | Decision it hangs off |
|---|---|---|
| A PAT or GitHub App token with `contents: write` | making the pipeline's commit trigger CI → Deploy | OD-8 |
| `CLOUDFLARE_API_TOKEN` with **R2 Storage → Edit** | `wrangler r2 object put/get/delete`, `wrangler r2 bucket lifecycle` | OD-5, OD-6 |
| `CLOUDFLARE_ZONE_ID` + a **Zone → Cache Purge → Edit** token | option C only | OD-1 (ruled out) |

**Unknown and must be checked by Akhil, not guessed:** whether the existing
`CLOUDFLARE_API_TOKEN` already carries R2 Edit. It was created for `wrangler deploy`, which
needs Workers Scripts Edit; R2 Edit is a separate permission. Local verification is impossible —
there is no `~/.wrangler` config and no `CLOUDFLARE_*` in the environment
(`env | grep -iE '^(CLOUDFLARE|CF_)'` → empty).

### R2 object lifecycle — **not dashboard-only**

Verified against the installed wrangler 4.123.0, not the docs:

```
$ npx wrangler r2 bucket lifecycle --help
  wrangler r2 bucket lifecycle list   <bucket>
  wrangler r2 bucket lifecycle add    <bucket> [name] [prefix]
  wrangler r2 bucket lifecycle remove <bucket>
  wrangler r2 bucket lifecycle set    <bucket>     # from a JSON file

$ npx wrangler r2 bucket lifecycle add --help
  --expire-days           Number of days after which objects expire  [number]
  --abort-multipart-days  Number of days after which incomplete multipart uploads are aborted
```

So `wrangler r2 bucket lifecycle add portfolio-photos expire-staging temp/ --expire-days 7` is a
valid, prefix-scoped, CLI-issued rule. Confirmed by the docs
`[CITED: developers.cloudflare.com/r2/buckets/object-lifecycles/]`: prefix scoping supported,
granularity is **days**, configurable via dashboard / wrangler / S3
`putBucketLifecycleConfiguration`, max 1 000 rules per bucket, and *"objects will typically be
removed from a bucket within 24 hours"* of expiry.

**Verification consequence — read this before writing a gate.** Criterion 3 says staged objects
*"expire on their own"*. Minimum granularity is one day and removal lags up to another day, so
**no plan can prove expiry by observation inside a session**. The only honest gate is:
`wrangler r2 bucket lifecycle list portfolio-photos` returns a rule whose **prefix is byte-equal
to the prefix the pipeline actually writes**, asserted from one shared constant. A gate that
merely checks "some lifecycle rule exists" would pass against a rule scoped to the wrong prefix,
which is this project's ninth-and-counting unfailable-gate pattern.

### Staging a photo from the command line, with no admin UI

`wrangler r2 object put` exists in the installed version and takes exactly what is needed:

```
wrangler r2 object put <bucket>/<key> --file <path> --remote
  --content-type, --ct     --cache-control, --cc     --expires
```

This means PIPE-02 needs **no S3 SDK on the developer's machine and no S3 keys** — only a
Cloudflare API token with R2 Edit. It also means `--cache-control` can be set at put time, which
is the mechanism option A in §4 depends on. R2 limits relevant here
`[CITED: developers.cloudflare.com/r2/platform/limits/]`: 5 GiB single-part upload, 1 024-byte
key length, 8 192-byte object metadata, 1 200 REST requests / 5 min, and **1 concurrent write
per second to the same key**.

### The runner

| Fact | Measured |
|---|---|
| Node version | `.nvmrc` = **22.22.3**; `node --version` locally agrees. Both workflows use `node-version-file: .nvmrc`. `package.json` `engines.node >= 22.12.0`. |
| `sharp` availability | **Already in `node_modules` at 0.35.3**, transitively via `astro@7.2.2` (and 0.35.2 via `miniflare`). Registry latest is **0.35.4** (`npm view sharp version`). `engines.node >= 20.9.0`. |
| Native build on the runner? | **No.** The committed `package-lock.json` (lockfileVersion 3, generated on darwin-arm64) already contains `node_modules/@img/sharp-linux-x64` and `node_modules/@img/sharp-libvips-linux-x64`. `npm ci` on `ubuntu-latest` resolves the prebuilt binary. Verified by grepping the lockfile, not assumed. |
| `exifr` | 7.1.3, `time.modified` **2022-05-01** — unmaintained for four years. See OD-12. |
| `@aws-sdk/client-s3` | 3.1118.0, modified 2026-08-25 — actively maintained, but see OD-5 on whether it is needed at all. |

---

## 8. Recommended job architecture

### Order of operations — validation before every side effect

```
1  read dispatch inputs (temp_key, category, alt, title, …)
2  GET the staged object out of R2  →  buffer                      [read-only]
3  sharp: metadata + 4 variants + 40px thumb; exifr: EXIF          [pure, in memory]
4  hash each emitted variant → compose the R2 keys and URLs        [pure]
5  read data/portfolio_images.json; derive order / categoryOrder;
   upsert the candidate record                                     [local write only]
6  npx astro sync            ← 1.7s, all 5 schemas + all 6 RI rules; exit 1 stops the job
   ─────────────────────── NOTHING ABOVE THIS LINE HAS A SIDE EFFECT ───────────────────────
7  PUT the 4 variants (+ optional clean copy) to R2
8  liveness verify: GET every URL in the new record, require 200 + image/webp
9  git commit + push, with a bounded re-derive-and-retry loop      [see §9]
10 DELETE the staged temp/ object                                   [the once-only token]
```

Rationale, per criterion:

- **Criterion 3 (partial failure).** A crash before step 7 leaves nothing changed anywhere. A
  crash between 7 and 9 leaves **orphan bytes in the bucket** — invisible, harmless, and
  swept by the same lifecycle machinery — but never an orphan *record*. The forbidden direction
  is a manifest entry with no bytes, which §6 proves no existing gate can catch.
- **Criterion 2 (idempotence).** Step 10 last makes the `temp/` key a once-only token: a re-run
  after success finds nothing to fetch and exits cleanly. A re-run after a step-7 failure re-does
  everything from a clean read.
- **Criterion 1.** Step 6 is the schema-valid guarantee; step 8 is the "variants really are in
  R2" guarantee; step 9 is the commit.

### Driving it

```bash
gh workflow run process-photos.yml --ref main \
  -f temp_key=temp/2026-08-26-riverbend.jpg \
  -f category=nature \
  -f title='River Bend' \
  -F alt=@alt.txt
```

`gh workflow run --help` (measured, gh 2.93.0) confirms `-f/--raw-field`, `-F/--field`
(*"respecting @ syntax"* — so long alt text can come from a file), `--json` via stdin, and
`--ref`. `workflow_dispatch` allows **25** top-level inputs and a 65 535-character payload
`[CITED: docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax]` — note
this contradicts the widely repeated "10 inputs" figure, which the current docs do not state.

### Fetch depth

The photo workflow **must set its own `fetch-depth` deliberately.** `actions/checkout` defaults
to depth 1. The pipeline job itself does not walk history, so depth 1 would work for it — but
if it ever runs `npm test`, the four migration proofs that walk `git log -- <file>` throw rather
than skip. Both existing workflows set `fetch-depth: 0` after this broke Deploy at run
`32941901693` on 2026-08-26 07:15 (`gh run list`, failure visible in the history). **Decide and
comment it; do not inherit the default silently.**

---

## 9. PIPE-05 — concurrency

### The legacy guard was disabled — confirmed on the branch

```
git show legacy/nextjs-portfolio:src/components/admin/DeployButton.tsx | grep -n baseSha
  86:          baseSha: "latest",
```

and `src/app/api/deploy/route.ts` reads:

```js
// The current admin sends "latest", which BYPASSES this guard and can
// silently clobber newer data — the rebuilt admin must load /api/data on mount…
if (baseSha !== "latest" && currentSha !== baseSha) {  /* 409 */ }
```

**Verified exactly as `CLAUDE.md` and `PROJECT.md` describe.** One nuance worth carrying: even
with `baseSha` bypassed, the route's final `PATCH /git/refs/heads/main` sends `force: false`,
which GitHub documents as *"make sure the update is a fast-forward update … Leaving this out or
setting it to false will make sure you're not overwriting work"*
`[CITED: docs.github.com/en/rest/git/refs]`. So a commit landing between the ref read and the
PATCH is still refused — a narrow last line of defence that the legacy code then mapped to 409.

`PROJECT.md:127` already diagnoses the root cause and prescribes the fix:

> *"HEAD-comparison is **too strict** — the photo pipeline commits constantly, so it 409s
> unrelated edits. Someone hit that and disabled the guard. The fix is per-file **blob**-SHA
> comparison (`PUT /contents/{path}` wants the blob SHA of the file being replaced and returns
> 409 on mismatch)."*

Confirmed against the API reference: `sha` is *"the blob SHA of the file being replaced"*,
required when updating, and a mismatch returns **409 Conflict**
`[CITED: docs.github.com/en/rest/repos/contents]`.

### What Phase 4 can and cannot deliver

The admin does not exist. Phase 4 can build exactly one side of PIPE-05, plus the contract:

1. **Make the pipeline's own write safe.** The runner has a real checkout, so the Contents API
   is not the natural tool — `git push` is. On a non-fast-forward rejection the correct recovery
   is **re-derive, never rebase**: `git fetch`, re-read the fetched `data/portfolio_images.json`,
   re-run the upsert (which recomputes `order` and `categoryOrder` against the *new* maxima),
   re-run `astro sync`, commit, push again — bounded, e.g. three attempts, then fail loudly.
   A `git rebase` of an appended JSON array element is a textual conflict waiting to happen and
   would resolve `order` incorrectly even when it succeeded.
2. **Serialise pipeline runs against each other** with
   `concurrency: { group: photo-pipeline, cancel-in-progress: false }` — queue, do not cancel,
   for the same reason `deploy.yml` gives in its own comment.
3. **Write down the contract Phase 7 must honour**: the admin publishes `data/*.json` with a
   per-file blob SHA and surfaces 409 as a conflict, never `"latest"`.

Criterion 4 is testable today without the admin, because *"a concurrent manual edit"* is just a
human `git push`. A negative-control test: hold a stale checkout, land a commit touching
`data/portfolio_images.json` from elsewhere, then run the pipeline's push step and assert the
foreign commit survives and either the retry succeeded or the job reported a conflict.

### The trigger problem — verified, and it changes the design

> *"When you use the repository's `GITHUB_TOKEN` to perform tasks, events triggered by the
> `GITHUB_TOKEN` will not create a new workflow run … if a workflow run pushes code using the
> repository's `GITHUB_TOKEN`, a new workflow will not run even when the repository contains a
> workflow configured to run when `push` events occur."*
> `[CITED: docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow]`
> Exceptions: `workflow_dispatch` and `repository_dispatch` always run; a **GitHub App
> installation token or a personal access token** triggers events normally.

This repo's deploy chain is `push → CI → workflow_run → Deploy`, and `deploy.yml` deliberately
has **no push trigger and no manual dispatch**, with a comment saying so:

> *"This workflow has no push trigger and deliberately no manual-dispatch trigger, because
> either would be a way to reach the publish without a green CI run."*

Confirmed live: `gh run list` shows every `Deploy` run with event `workflow_run`, each preceded
by a green `CI` run on `push`.

**Therefore: a pipeline commit pushed with `GITHUB_TOKEN` lands on `main`, runs no CI, and
deploys nothing.** The photo appears in the manifest and not on the site until the next human
push. That is a design fork, not a detail → **OD-8**.

---

## 10. Standard stack

### Core

| Package | Version to use | Purpose | Provenance |
|---|---|---|---|
| `sharp` | `^0.35.4` (latest; 0.35.3 already resolved transitively) | resize, WebP encode, SVG watermark composite, source metadata | `[ASSUMED — legacy-derived]` for the choice; `[VERIFIED: npm registry]` for the version and the Linux prebuilds in the committed lockfile |
| `exifr` | `7.1.3` | EXIF extraction | `[ASSUMED]` — carried from legacy; unmaintained since 2022-05-01, see OD-12 |
| `@aws-sdk/client-s3` | `^3.1118.0` | R2 get / put / delete over the S3 API | `[ASSUMED]` — carried from legacy; **may be unnecessary**, see OD-5 |
| `wrangler` | `^4.123.0` (already a devDependency) | R2 object and lifecycle operations from the CLI | `[VERIFIED]` — subcommands read from `--help` on the installed binary |

### Alternatives worth considering

| Instead of | Could use | Tradeoff |
|---|---|---|
| `exifr` | `exif-reader` 2.0.3 (modified 2025-12-12) fed from `sharp(...).metadata().exif` | Drops a dead dependency and a second file read; sharp already surfaces the raw EXIF buffer. But the six-field mapping must be re-derived and re-proved against the 39 committed records — a real cost, and OD-12 says why that proof is cheap here |
| `@aws-sdk/client-s3` | `wrangler r2 object get/put/delete` | Reuses `CLOUDFLARE_API_TOKEN`; drops ~27 packages; but shells out once per object (5 per photo) and the two credential systems then coexist for no reason. See OD-5 |

**Installation** (deferred to whichever plan needs it — nothing is installed by this research):

```bash
npm install --save-dev sharp exifr @aws-sdk/client-s3
```

---

## Package Legitimacy Audit

Run 2026-08-26 with `slopcheck` (already on PATH at `/opt/homebrew/bin/slopcheck`).

| Package | Registry | Latest | Last modified | Source repo | slopcheck | Disposition |
|---|---|---|---|---|---|---|
| `sharp` | npm | 0.35.4 | 2026-08-26 | lovell/sharp | **[OK]** | Approved |
| `exifr` | npm | 7.1.3 | 2022-05-01 | MikeKovarik/exifr | **[OK]** | Approved, **but stale for 4 years** → OD-12 |
| `@aws-sdk/client-s3` | npm | 3.1118.0 | 2026-08-25 | aws/aws-sdk-js-v3 | **[OK]** | Approved (may be unnecessary → OD-5) |
| `exif-reader` | npm | 2.0.3 | 2025-12-12 | devongovett/exif-reader | **[OK]** | Alternative, evaluated |

```
scanned 4 packages
4 OK
```

**Packages removed due to a `[SLOP]` verdict:** none.
**Packages flagged `[SUS]`:** none.

⚠️ **Operational warning for whoever runs this next: `slopcheck install <pkgs>` is not a
dry run.** It executed `npm install exifr @aws-sdk/client-s3 sharp exif-reader` in the working
tree, modifying `package.json` and `package-lock.json` (`added 27 packages`). Reverted
immediately with `git checkout -- package.json package-lock.json && npm ci`; `git status
--short` is clean and `node_modules` is back to the committed lockfile. **A future plan must run
this in a throwaway directory, not in the repo.**

All three legacy-derived packages are `[ASSUMED]` on the *choice*, per the package-name
provenance rule: they were discovered from this repository's own history, which is an
authoritative source about what was used before but not about what is correct now.

---

## 11. Architectural responsibility map

| Capability | Primary tier | Secondary | Why that tier owns it |
|---|---|---|---|
| Resize, WebP encode, watermark | **GitHub Actions runner (Node 22)** | — | `sharp` is a native binary; it can never run in `workerd` |
| EXIF extraction | Actions runner | — | needs file/buffer parsing outside the Worker |
| R2 object write | Actions runner via S3 or wrangler | — | the Worker's `PORTFOLIO_BUCKET` binding is a *read/serve* path; the pipeline is not in the Worker |
| Manifest mutation | Actions runner (local file + git push) | — | there is no runtime filesystem; the manifest is only ever written by a commit |
| Schema + RI validation | `astro sync` on the runner | the Astro build in CI | one definition, two chances to catch |
| Manifest↔bucket liveness | **new gate, Actions runner** | — | nothing existing can see it (§6) |
| Serving the bytes | Cloudflare CDN on `images.akhilsaxena.com` | R2 | already provisioned in Phase 2 |
| Cache versioning | **the R2 key or URL the pipeline writes** | — | the CDN cannot version what the producer did not (§4) |
| Staged-object expiry | R2 bucket lifecycle rule | — | prefix-scoped, days granularity (§7) |

---

## 12. Don't hand-roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Validating the new record | a second copy of the photo shape in `scripts/` | `npx astro sync` (1.7 s, no env needed) | CONT-01 exists to stop exactly this drift; `gate:schema` already forbids a rival under `src/` |
| Origin correctness in the produced URLs | an `R2_PUBLIC_URL` secret read by the script | `IMAGE_ORIGIN` from `src/lib/image-origin.ts` | its header says it is the only place the hostname is written; a stale secret is invisible to `gate:origin`, which scans literals (OD-3) |
| Expiring staged uploads | a cron job that lists and deletes `temp/` | `wrangler r2 bucket lifecycle add … --expire-days` | server-side, prefix-scoped, no code path to fail |
| Cache invalidation | a purge script | a versioned key or query string | measured: the response carries `max-age=14400`, which no purge can reach in a browser |
| Conflict recovery on push | `git rebase` / `git push --force` | re-derive from the fetched manifest, bounded retry | `order` and `categoryOrder` must be recomputed against the *new* maxima; a textual rebase gets them wrong even when it succeeds |
| Serialising runs | a lock file in the repo | `concurrency: { group, cancel-in-progress: false }` | native, and `deploy.yml` already documents the queue-don't-cancel rationale |

**Anti-pattern, named because the legacy code shipped it:** treating a key prefix as an access
control. `private/` is a string (§3).

---

## 13. Common pitfalls

### P-1 · `curl -I` reports the CDN as uncached
**What goes wrong:** a HEAD request to `images.akhilsaxena.com` returns `cf-cache-status:
DYNAMIC` and no `cache-control`, on objects that a GET reports as `HIT` with `max-age=14400`.
**How to avoid:** every cache assertion uses `curl -sS -o /dev/null -D -` (GET).
**Warning sign:** a verification step concluding "the custom domain isn't caching" for objects
Phase 3 already proved cached.

### P-2 · A green build over a manifest pointing at 404s
**What goes wrong:** §6. `astro sync`/`astro build` exit 0.
**How to avoid:** a liveness step between the R2 upload and the commit.
**How the gate is proven to fail:** point one URL at a key you have not uploaded; the gate must
exit non-zero **and name that URL**. A gate that only counts 200s would pass a run that checked
zero URLs — the anti-vacuity contract in `content-set.ts` applies here too.

### P-3 · zsh does not word-split an unquoted variable
**What goes wrong:** `npx $cmd` where `cmd="astro sync"` passes one argv element; npx fails in
245 ms and the harness records a spurious exit 1. **This happened in this session.** Bash would
have split it.
**How to avoid:** every snippet declares its shell; Actions steps run **bash**, local
verification runs **zsh**. Never `${PIPESTATUS[0]}` (zsh is `${pipestatus[1]}`) — capture the
exit code without a pipe by redirecting to a file.

### P-4 · A sandbox without `.git` fakes four test failures
**What goes wrong:** copying tracked files into a temp dir and running the suite reports
`bullets-migration`, `photo-enrichment`, `resume-structure` and `site-config-migration` as
file-level failures. **This happened in this session**, and it is those tests' guard working:
they walk `git log -- <file>` and throw rather than pass vacuously.
**How to avoid:** `git clone --no-hardlinks` the repo, never `cp -r` the worktree. Same root
cause as the `fetch-depth: 0` fix in both workflows.

### P-5 · Deriving `order`/`categoryOrder` from a stale read
**What goes wrong:** two runs read `maxOrder = 39` and both write `order: 40` → RI-5 fires, or
the second push clobbers the first.
**How to avoid:** derive after the final `git fetch` in the retry loop, never before.

### P-6 · `git show HEAD~1:<file>` as an evidence revision
Recorded in `STATE.md` as having detonated twice in Phase 3. **This phase adds a third commit
writer to `main`**, so it is strictly worse here. Any before/after proof must search the file's
own log and **throw** when it finds no predecessor.

### P-7 · A new top-level directory silently red-lining the build
`gate:origin` fails on an unclassified tracked path (§6). Adding `new-photos/`, a fixtures dir
or a staging dir requires a rule with a written reason in the gate source.

### P-8 · A red build leaves the previous `dist/` on disk
Carried from the brief and still true: a hand-run `wrangler deploy` after a failed build ships
the last good artefact. Relevant because a pipeline commit is the most likely new source of a
surprise red build.

---

## 14. Runtime state inventory

This phase does not rename anything, but it *does* write to systems outside git, so the same
discipline applies.

| Category | Found | Action |
|---|---|---|
| **Stored data** | `data/portfolio_images.json` — 39 records, the only manifest. R2 bucket `portfolio-photos`: `photos/**` (public variants), `private/**` (39 clean originals, publicly reachable — §3), and presumably `temp/**` (**could not enumerate — no R2 credentials in this environment**) | code + data |
| **Live service config** | R2 custom domain `images.akhilsaxena.com` (provisioned in Phase 2, not in git). The **r2.dev dev URL is still enabled** — `curl` to `pub-2d90…r2.dev` returned 200 with a matching ETag this session, so the uncached rate-limited origin Phase 3 migrated *off* is still *serving*. `wrangler r2 bucket dev-url disable` would close it. No R2 lifecycle rule is known to exist. | `user_setup` |
| **OS-registered state** | **None.** No cron, no launchd, no scheduled workflow. The only triggers are `push` and `workflow_run` (`gh workflow list`: CI, Deploy, Dependabot Updates). | none |
| **Secrets / env vars** | Seven repo secrets + one variable (§7). `R2_PUBLIC_URL` is the one whose *value* may be stale and whose staleness is invisible to every gate (OD-3). No `.env`/`.dev.vars` change is needed — `astro sync` runs without them (measured). | verify, don't assume |
| **Build artifacts** | `dist/` and `.astro/` are gitignored. `node_modules` was disturbed by `slopcheck install` during this research and **restored with `npm ci`**; `git status --short` is clean. | none |

---

## 15. Environment availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node | everything | ✓ | 22.22.3 (`.nvmrc` agrees) | — |
| npm | install | ✓ | 10.9.8 | — |
| `sharp` | resize/watermark | ✓ (transitive) | 0.35.3 in `node_modules`; 0.35.4 on the registry | promote to a direct devDependency |
| `sharp` Linux prebuild | the runner | ✓ | `@img/sharp-linux-x64` present in the committed lockfile | — |
| `exifr` | EXIF | ✗ | — | `exif-reader` via `sharp().metadata().exif` (OD-12) |
| `@aws-sdk/client-s3` | R2 I/O | ✗ | — | `wrangler r2 object` (OD-5) |
| `wrangler` | R2 + lifecycle | ✓ | 4.123.0 | — |
| `gh` | `gh workflow run`, secret listing | ✓ | 2.93.0, authed as `akhil-saxena` (the `akhil-brevo` account 403s on this repo) | — |
| `slopcheck` | package audit | ✓ | on PATH | — |
| **Cloudflare credentials locally** | any R2 write, any lifecycle change | **✗** | no `~/.wrangler`, no `CLOUDFLARE_*` in env | **none — `user_setup`** |
| **R2 Edit token in Actions** | steps 2, 7, 10 | **unknown** | `CLOUDFLARE_API_TOKEN` exists; its scope is not readable | **`user_setup` — must be confirmed** |
| **A token that triggers CI on push** | criterion 5's "serves the new bytes" | **✗** | only `GITHUB_TOKEN` | **`user_setup`** (OD-8) |

**Blocking with no fallback:**
- No local Cloudflare credential → **the "does R2 honour object `Cache-Control` on the custom
  domain" measurement (§4) cannot be taken until one exists**, and OD-1 cannot be fully closed
  without it.
- No R2 lifecycle rule can be created or listed → criterion 3 is unverifiable.

**With a fallback:** `exifr`, `@aws-sdk/client-s3` (both have viable alternatives above).

---

## Validation Architecture

### Test framework

| Property | Value |
|---|---|
| Framework | Vitest 4.1.10, three projects composed by reference in `vitest.config.ts` |
| Project configs | `vitest.unit.config.ts` (plain Node, no setup), `vitest.integration.config.ts` (`globalSetup` builds + spawns `astro preview` on real workerd, `hookTimeout: 300_000`), `vitest.workers.config.ts` (`@cloudflare/vitest-pool-workers`, real `workerd`) |
| Glob contract | **mutually exclusive** — `test/**/*.unit.test.ts`, `test/**/*.node.test.ts`, `test/**/*.workerd.test.ts`. Every test file must match exactly one. |
| Quick run | `npx vitest run --project unit` — **measured 444 tests / 7 files / exit 0** on a clean clone |
| Full suite | `npm test` — `STATE.md` records 484 across 12 files |
| Gates | `npm run gate:content` = `gate:schema && gate:sinks && gate:origin && gate:routes`. **All four run without `.env`/`.dev.vars`** (measured, all exit 0 at 40 records) |
| Build-time gate | `astro:config:done` hook in `astro.config.mjs`; fires on `build`, `check` **and `sync`** |

**Convention to honour:** unit tests in this repo deliberately **re-implement** rather than
import the thing they verify — `photo-enrichment.unit.test.ts` says so in its header: *"Importing
the merge's own parser would make this file assert that the merge agrees with itself."* A Phase 4
test of the record producer should follow that: assert the *shape* independently, not by calling
the producer's own helpers.

### Phase requirements → test map

| Req | Behaviour | Type | Automated command | Exists? |
|---|---|---|---|---|
| PIPE-01 | variants at 2000/1200/800/400, `withoutEnlargement`, WebP q85/85/85/80 | unit | `npx vitest run --project unit test/pipeline/variants.unit.test.ts` | ❌ Wave 0 |
| PIPE-01 | EXIF maps to the six schema fields, all-null on a file with none | unit | `… test/pipeline/exif.unit.test.ts` | ❌ Wave 0 |
| PIPE-01 | the produced record satisfies `PhotoSchema` + all six RI rules | integration | `npx astro sync` (exit 1 on violation) — wrapped as `… test/pipeline/record-valid.node.test.ts` | ❌ Wave 0 |
| PIPE-02 | the workflow's dispatch inputs are complete and typed | unit | `… test/pipeline/workflow-contract.unit.test.ts` (parse `.github/workflows/process-photos.yml`) | ❌ Wave 0 |
| PIPE-02 | end-to-end from `gh workflow run` | **manual-only** | one live dispatch; artefact is the run URL + the resulting commit SHA | manual |
| PIPE-03 | a second run for the same `temp_key` adds no record and exits 0 | unit | `… test/pipeline/idempotence.unit.test.ts` — run the upsert twice over an in-memory manifest, assert length unchanged **and** that the first run changed it (anti-vacuity) | ❌ Wave 0 |
| PIPE-04 | every URL in every record resolves 200 + `image/webp` | integration | `node scripts/verify-photo-urls.mjs` (generalised from `migrate-photo-origin.mjs --verify`) | ❌ Wave 0 |
| PIPE-04 | a failure between derive and upload leaves the manifest byte-identical | integration | `… test/pipeline/partial-failure.node.test.ts` — inject a throw, assert `git diff --quiet` **and** assert the injected throw actually fired | ❌ Wave 0 |
| PIPE-04 | a lifecycle rule exists whose prefix is byte-equal to the pipeline's staging prefix | **manual-only** | `wrangler r2 bucket lifecycle list portfolio-photos` — needs credentials; **cannot be proven by observing an object disappear** (§7) | manual |
| PIPE-05 | a foreign commit to `data/portfolio_images.json` survives a concurrent pipeline push | integration | `… test/pipeline/concurrent-push.node.test.ts` against a local bare repo | ❌ Wave 0 |
| CONT-05 | re-uploading yields a different URL, and the old URL is untouched | unit | `… test/pipeline/versioned-key.unit.test.ts` — two different byte inputs must produce two different keys, **and** identical bytes must produce the same key | ❌ Wave 0 |
| CONT-05 | a GET of a freshly written URL returns the new bytes | **manual-only** | `curl -sS -o /dev/null -D -` (**GET, never HEAD** — §4) | manual |
| — | the 15 existing tests that break at 40 records | unit + integration | `npx vitest run --project unit` and `… --project integration test/content/build-fails-loudly.node.test.ts` | ⚠️ **exist and must be re-scoped, Wave 0** |

### Sampling rate

- **Per task commit:** `npx vitest run --project unit` (444 tests, seconds) + `npx astro sync`
  (1.7 s).
- **Per wave merge:** `npm test` + `npm run gate:content`.
- **Phase gate:** full suite green, `npm run build` exit 0, and one real
  `gh workflow run process-photos.yml` producing a schema-valid committed record with live URLs.

### Wave 0 gaps — the measured inventory

**Planting one schema-valid 40th photograph turns 15 tests across 4 files red while the build
stays green.** Control on the same clone: `--project unit` 444/444, exit 0.

```bash
git clone --no-hardlinks <repo> /tmp/p4c && cd /tmp/p4c   # a real clone: the migration
cp <repo>/.env <repo>/.dev.vars .                          # proofs need git history
ln -s <repo>/node_modules node_modules
# append one valid record, then:
npx vitest run --project unit
```

| File | Failures | Root cause |
|---|---|---|
| `test/content/photo-enrichment.unit.test.ts` | **9** | asserts the manifest is exactly the 39-row `00-PHOTO-CONTENT.md` cohort: brief-row↔record bijection, `toHaveLength(39)`, `EXPECTED_PLACES = 16`, dense per-category ranks, and `focalPoint` on no record |
| `test/content/schemas.unit.test.ts` | **4** | `EXPECTED_PHOTOS = 39`; the exif-null census; `validateContentSet`'s reported counts; "accepts the 23 records with no place key" |
| `test/content/site-config-migration.unit.test.ts` | **1** | *"reads all 39 photo records"* |
| `test/content/build-fails-loudly.node.test.ts` | **1** | `expect(result.output).toContain('39 photo(s)')` |
| `scripts/migrate-photo-origin.mjs --verify` | exits 1 | `EXPECTED_RECORDS = 39` compared with `!==` |
| `scripts/assert-no-r2dev-urls.mjs` | **passes** | same constant used as a **floor** (`<`), reports `160 remote URL(s) across 39+ records` |

**These are migration proofs, and the fix is not to bump 39 to 40.** One of them already says so
in its own failure message:

> `these ids did not exist at ${previous.ref.slice(0,7)}, so this migration did not derive their
> rank; **re-scope or retire this block rather than weakening it**`
> — `test/content/photo-enrichment.unit.test.ts:340`

So Wave 0 is: **scope each migration proof to the cohort it proves** — the ids the brief names,
or the ids present at the pre-migration revision it already resolves — rather than to "every
record in the manifest". Where a count is genuinely a census of the corpus (`schemas.unit.test.ts`
`EXPECTED_PHOTOS`), it becomes derived rather than literal, with an anti-vacuity floor so an
emptied manifest still fails.

**New files Wave 0 must also create:**

- [ ] `test/pipeline/` and its first `*.unit.test.ts` — the directory does not exist
- [ ] `scripts/verify-photo-urls.mjs` — generalised liveness verifier, count derived from the
      manifest, with an explicit non-zero floor
- [ ] a shared constant for the staging prefix, imported by the workflow, the script and the
      lifecycle assertion, so no two of them can disagree
- [ ] no framework install needed — Vitest 4.1.10 is present and configured

---

## Security domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so it is enabled.

### Applicable ASVS categories

| Category | Applies | Standard control here |
|---|---|---|
| V1 Architecture | yes | validation precedes every side effect (§8); the pipeline never runs in the Worker |
| V2 Authentication | no | the pipeline is triggered by a repo-scoped `workflow_dispatch`; GitHub gates it |
| V3 Session management | no | stateless job |
| V4 Access control | **yes** | **`private/` is a prefix, not a permission — 39/39 unwatermarked originals are publicly downloadable today (§3).** Also: who may dispatch the workflow = who may write to the repo |
| V5 Input validation | **yes** | `temp_key` must be constrained to the staging prefix — the legacy `/api/dispatch` did exactly this with `/^temp\/[a-zA-Z0-9._/-]+$/`, and dropping it lets a caller point processing at an arbitrary key. `category` must be validated against `site_config` ids **before** any R2 read |
| V6 Cryptography | yes (light) | a content hash is `crypto.createHash('sha256')` from `node:crypto`; never hand-roll |
| V7 Error handling / logging | **yes** | a failed R2 or GitHub call must not echo the credential; the legacy routes log `res.status` and a generic message, never the token |
| V12 Files / resources | **yes** | a size cap and a magic-byte check on the staged object; the legacy `/api/upload` had `MAX_BYTES = 25 * 1024 * 1024` and an extension allowlist, and the dispatch path had neither |
| V14 Configuration | **yes** | secrets scoped to the single step that needs them, as `deploy.yml` already does; third-party actions pinned to a full commit SHA, as both existing workflows already do |

### Threat patterns for this stack

| Pattern | STRIDE | Mitigation |
|---|---|---|
| Arbitrary R2 key processed via `temp_key` | Tampering / Information disclosure | anchor the regex to the staging prefix; reject `..` and absolute forms |
| Decompression / pixel bomb in a staged image | Denial of service | `sharp` `limitInputPixels` (default on) + an explicit byte cap before `sharp()` is called |
| Unwatermarked originals enumerable | Information disclosure | OD-9 |
| A malicious `alt` reaching rendered HTML | XSS (Phase 5) | Phase 3's render boundary + `gate:sinks`; `alt` is an attribute, but the input still crosses a trust boundary |
| A leaked long-lived PAT (if OD-8 chooses one) | Elevation of privilege | fine-grained, single-repo, `contents: write` only, with an expiry; a GitHub App installation token is strictly better |
| A third-party action moving its tag | Supply chain | pin to a full commit SHA — the existing workflows already state this rule in a comment |
| A pipeline commit deploying without CI | Tampering | this is the *inverse* risk in OD-8: option (b) must not become a second, ungated deploy path — `deploy.yml`'s header says exactly why |

---

> **Decided by Akhil in review, 2026-08-26.** These are decisions, not recommendations. Plan 04-02
> implements them as written and does not re-ask. The remaining decisions (OD-4, OD-5, OD-8, OD-9,
> OD-10, OD-12) are still open and belong to plans 04-04, 04-05, 04-07, 04-08.
>
> | # | Resolution |
> |---|---|
> | **OD-2** | **Option A — `alt` is a required `workflow_dispatch` input**, validated against the four content rules **before any R2 read**, so a bad value costs nothing. `gh workflow run -F alt=@alt.txt` reads it from a file, so length is not a constraint. |
> | **OD-2b** | **NEW REQUIREMENT — refuse placeholder-shaped `alt`.** The dispatch validator must reject, case-insensitively and after trimming: `TODO`, `TBD`, `FIXME`, `XXX`, `???`, the bare words `alt`/`photo`/`image`/`picture`, a value equal to the filename, a value equal to the title verbatim, and anything shorter than ~15 characters. **This closes a measured gap:** 04-08 proves `alt: "TODO"` passes all four existing content rules, so without this a hurried dispatch ships a photograph announced to a screen reader as "TODO". Validate before any R2 read. Akhil asked for this explicitly. |
> | **OD-1** | **Option A — content-hashed keys**, `photos/<cat>/<slug>-<hash8><suffix>.webp`. A re-upload yields a new URL, so nothing serves stale bytes and no cache purge is needed. Gates Phase 5's `srcset`. |
> | **OD-3** | **Option A — the pipeline never reads `R2_PUBLIC_URL`;** it imports `IMAGE_ORIGIN` from `src/lib/image-origin.ts`, so it structurally cannot emit a non-canonical origin. The secret predates the custom domain by five months and very likely still holds the `r2.dev` value. Also: move `.github/**` from SKIP to SCAN in the origin gate. |
> | **OD-6** | **Option A — staging prefix `temp/`.** The lifecycle rule is created **once by Akhil** (04-10 Task 2, a blocking human-verify), and asserted thereafter by comparing the rule's prefix to the same constant the pipeline writes — plus `enabled` and a real expiry action. |
> | **OD-7** | **Option A — commit directly to `main`** with a bounded re-derive-and-retry on conflict. Available because OD-2 resolved to A rather than C. |
> | **OD-11** | **Option A — declare `dimensions` as the intrinsic size of the source**, not of `urls.original`. Three records already disagree today (`nature-fairwayreflections` is `4608x3072` while `urls.original` serves `2000x1333`), so this converts an accident into a contract before Phase 5 builds CLS reservation on it. |
> | **OD-4** | **Option A — upsert keyed on `id`, exit 0.** A re-run recomputes the record and replaces it in place. **It must NOT renumber `order` or `categoryOrder`** — renumbering on retry would reorder the gallery as a side effect, so assert preservation explicitly. Retry after a partial failure becomes the ordinary path rather than manual cleanup. |
> | **OD-5** | **Option B — `wrangler r2 object`, NOT the S3 SDK.** The research recommended A but conditioned it: *"unless OD-6 forces a Cloudflare API token anyway (it does, for lifecycle) — in which case B becomes the tidier answer and the five `R2_*` secrets can be retired."* OD-6 resolved to A, so the condition is met and the recommendation flips. One credential system, ~27 fewer packages. **Contingency:** B requires `CLOUDFLARE_API_TOKEN` to carry **R2 Storage → Edit**, which is unverified from here. 04-10 Task 2's blocking checkpoint tests it. If it fails, Akhil adds the scope; falling back to A is the last resort and is a **deviation to record**, not an executor's call. |
> | **OD-12** | **Option B — `exif-reader` fed from the buffer `sharp` already produced.** Drops a four-year-stale dependency and a second file read. **The differential proof is mandatory, not optional:** re-extract EXIF from the 39 live originals and require all six fields to reproduce the committed values byte-for-byte, nulls included — `camera` null on 1, `lens` on 11, `aperture` on 2, `shutter` on 2, `iso` on 2, `focalLength` on 2. **If any field drifts, the library changed the mapping and OD-12 reverts to A on that evidence** — that is a legitimate outcome, not a failure to be worked around. |
> | **OD-8** | **Option A — GitHub App installation token** via `actions/create-github-app-token`. Short-lived, repo-scoped, and a push with it triggers `push` normally, so the existing `push → CI → Deploy` chain runs unchanged and remains the **only** deploy path. **`user_setup`, and Akhil must provision it:** create the App, install it on `akhil-saxena/portfolio` with `Contents: write`, store `PHOTO_PIPELINE_APP_ID` and `PHOTO_PIPELINE_APP_PRIVATE_KEY` as repository secrets. **The plan must not assume it exists** — without it a photo is committed and never deployed, and criterion 5 is unreachable. Option C was explicitly rejected: adding the photo workflow to `deploy.yml`'s `workflow_run` list would create a second deploy path with only one of the two gated, which is the hazard `deploy.yml`'s header exists to prevent. |

## Open decisions

Twelve forks that measurement could not settle. Each names the plan it blocks. Modelled on
`03-CONTEXT.md` §3: a plan may not pass one of these on an executor's judgement.

---

### OD-1 · The cache-versioning scheme for CONT-05
**Blocks:** the plan that defines the R2 key format — i.e. **the first pipeline plan**, because
every later URL depends on it. Also gates Phase 5's `srcset`.
**Type:** URL shape; changes the manifest for every future photo

Measured: GET returns `cache-control: max-age=14400`; a fresh `?v=` produces MISS→HIT; the R2
object carries no `Cache-Control` of its own; purging cannot reach a browser cache.

- **Option A (recommended)** — content-hashed keys, `photos/<cat>/<slug>-<hash8><suffix>.webp`,
  with `Cache-Control: public, max-age=31536000, immutable` set at PutObject. Bytes at a URL
  never change. Costs: breaks the measured `id === category + "-" + basename` invariant; leaves
  the superseded objects behind.
- **Option B** — keep the path, add `?v=<hash8>`. Measurably works at the edge; smallest diff;
  the `id`↔basename invariant survives; but the object stays mutable.
- **Option C** — purge API. **Ruled out on evidence**: it cannot reach the four-hour browser cache.

**Recommendation: A**, and the roadmap already presumes it (*"settles … the content-hashed key
scheme (CONT-05)"*) — but that is a presumption, not a recorded decision, so it is asked here.
**Blocking sub-measurement:** whether the custom domain re-emits an object's `Cache-Control` is
`[ASSUMED]`, not documented on any first-party page found. Take it with
`wrangler r2 object put … --cache-control … --remote` then a GET, **before** locking A.

---

### OD-2 · Where `alt` comes from for a new photograph
**Blocks:** the plan that defines the `workflow_dispatch` interface — **the first pipeline plan**
**Type:** product + accessibility; determines whether the pipeline can run unattended

`alt` is required, has four content rules, is the entire non-visual experience of the gallery,
and all 39 existing values were human-written and reviewed on 2026-08-23.

- **Option A (recommended)** — `alt` is a **required `workflow_dispatch` input**, validated
  against the same four rules *before* any R2 read, so a bad value costs nothing. This is the
  only option under which criterion 1 is satisfiable by one command, and `gh workflow run -F
  alt=@alt.txt` reads it from a file so length is not a problem.
- **Option B** — the pipeline commits with a placeholder and a human edits it later.
  **Measurably bad**: `alt: "TODO"` passes every rule and would ship; `alt: "[AKHIL-ALT] …"`
  fails the marker rule and reds `main`, blocking the deploy of everything else.
- **Option C** — the pipeline opens a PR instead of committing to `main`; the human fills `alt`
  and merges. Safest, but it makes criterion 1 ("committed to `main`") false as written.
- **Option D** — a VLM generates a draft and a human approves it. Out of scope for this phase and
  it still needs a review step, i.e. C's machinery.

**Recommendation: A.** It keeps the human in the one place a human is genuinely required and
nowhere else. **This is the decision most likely to reshape the phase, so it should be asked first.**

---

### OD-3 · `R2_PUBLIC_URL` — reuse, repoint, or refuse to read it
**Blocks:** the plan that writes the workflow env
**Type:** correctness of every URL the pipeline produces

The secret exists and is dated **2026-03-28**, five months before `images.akhilsaxena.com` was
provisioned. Its value cannot be read from here, and must not be.

- **Option A (recommended)** — **the pipeline never reads `R2_PUBLIC_URL`.** It imports
  `IMAGE_ORIGIN` from `src/lib/image-origin.ts`, whose header says it is the only place the
  hostname is written. The whole failure class disappears: the pipeline structurally cannot emit
  a non-canonical origin. The secret is then deleted, so nothing can drift back to it.
- **Option B** — repoint the secret to `https://images.akhilsaxena.com` and read it. **This is
  the dangerous option**, and precisely because of a Phase 3 finding: `gate:origin` skips
  `.github/**`, and even if it did not, a workflow contains `${{ secrets.R2_PUBLIC_URL }}` — a
  *reference*, not a literal. **No gate in this repository can see a wrong value in that secret.**

**Recommendation: A.** And regardless of the choice, **move `.github/**` from SKIP to SCAN** in
`scripts/assert-no-r2dev-urls.mjs` — 03-01 flagged it in its own summary as *"the rule most
likely to be wrong once Phase 4 lands"*, and Phase 4 has now landed.

---

### OD-4 · What "re-running the same job" should do
**Blocks:** the plan implementing the upsert
**Type:** semantics of idempotence

Legacy exits 1 on a duplicate id. Criterion 2 says only *"adds no duplicate manifest entry"*.

- **Option A (recommended)** — **upsert keyed on `id`, exit 0.** A re-run recomputes the record
  and replaces it in place, preserving the existing `order`/`categoryOrder`. Retry after a
  partial failure is then the ordinary path rather than a manual cleanup.
- **Option B** — detect and no-op, exit 0. Cheaper, but a re-run after a *partial* failure then
  cannot repair the R2 side.
- **Option C** — legacy behaviour: exit 1. Satisfies the criterion literally and makes recovery
  a human job.

**Recommendation: A**, with the caveat that an upsert must **not** renumber `order` — that would
reorder the gallery as a side effect of a retry.

---

### OD-5 · S3 SDK, or `wrangler r2 object`
**Blocks:** the plan that adds dependencies
**Type:** tooling, credentials surface

Both work. Both are verified present/available.

- **Option A (recommended)** — `@aws-sdk/client-s3` with the five existing `R2_*` secrets.
  Nothing new to provision; in-process streams; the legacy code is a working reference.
- **Option B** — `wrangler r2 object get/put/delete` with `CLOUDFLARE_API_TOKEN` +
  `CLOUDFLARE_ACCOUNT_ID`. Drops ~27 packages and collapses two credential systems into one —
  but only if that token already carries **R2 Storage → Edit**, which is unknown from here, and
  it shells out five times per photo.

**Recommendation: A** on the strength of "already provisioned", **unless** OD-6 forces a
Cloudflare API token anyway (it does, for lifecycle) — in which case B becomes the tidier answer
and the five `R2_*` secrets can be retired. **Decide OD-6 first.**

---

### OD-6 · The staging prefix, and who creates the lifecycle rule
**Blocks:** the plan that implements staging
**Type:** `user_setup` prerequisite

`wrangler r2 bucket lifecycle add <bucket> <name> <prefix> --expire-days N` is verified present.
Granularity is days; removal lags up to 24 h; **expiry cannot be observed inside a session.**

- **Option A (recommended)** — prefix `temp/` (matching the legacy `/api/dispatch` contract and
  its `/^temp\/…/` validator), rule `--expire-days 7`, created **once** by Akhil as a
  `checkpoint:human-verify`, and asserted thereafter by
  `wrangler r2 bucket lifecycle list portfolio-photos` matching a **shared constant**.
- **Option B** — the pipeline creates the rule idempotently on every run. Needs a bucket-admin
  token in every job for a one-time act.

**Recommendation: A.** And the gate must compare the rule's prefix to the same constant the
workflow writes with — "a lifecycle rule exists" would pass against a rule on the wrong prefix.

---

### OD-7 · Whether the pipeline commits to `main` at all
**Blocks:** the plan that implements the commit step
**Type:** scope of criterion 1

- **Option A (recommended)** — commit directly to `main` with a bounded **re-derive-and-retry**
  loop (never rebase, never force). Matches criterion 1 verbatim.
- **Option B** — open a PR. Safer against clobbering and gives `alt` a review surface (OD-2 C),
  but criterion 1 says *"committed to `main`"*.

**Recommendation: A**, unless OD-2 resolves to C, in which case B follows automatically and
criterion 1 must be amended in writing rather than quietly reinterpreted.

---

### OD-8 · How a pipeline commit reaches the live site
**Blocks:** the plan that wires the workflow's `permissions` and token
**Type:** deploy topology; **this one has a security dimension**

Verified: a push with `GITHUB_TOKEN` triggers no workflow, and `deploy.yml` deliberately has no
push and no dispatch trigger. So with `GITHUB_TOKEN`, a new photo lands in the manifest and
never deploys — criterion 5 ("serves the new bytes from the CDN") is unreachable.

- **Option A (recommended)** — push with a **GitHub App installation token**
  (`actions/create-github-app-token`). Short-lived, scoped, triggers `push` normally, so the
  existing `push → CI → Deploy` chain runs unchanged and stays the only deploy path.
- **Option B** — a fine-grained PAT, single repo, `contents: write`, with an expiry. Simpler to
  provision; a long-lived credential. Phase 7's admin will need a repo-write credential in the
  Worker regardless, so this is not a new class of secret for the project.
- **Option C** — add the photo workflow to `deploy.yml`'s `workflow_run.workflows` list.
  **Do not do this** without also making the photo workflow run the full gate chain: it would
  create a second deploy path, and only one of the two would be gated — the exact hazard
  `deploy.yml`'s header exists to prevent.
- **Option D** — accept it. The photo is committed and appears at the next human push.
  Honest, and it makes criterion 5 false as written.

**Recommendation: A**, **B as an acceptable, faster alternative.** Either way this is a
`user_setup` item Akhil must provision, and the plan must not assume it exists.

---

### OD-9 · The `private/*-clean.webp` copies
**Blocks:** the plan that defines what the pipeline uploads. **Also a live production issue
independent of this phase.**
**Type:** security

Measured: **39 / 39 unwatermarked 2000 px originals are publicly downloadable** at URLs derived
mechanically from the committed manifest.

- **Option A (recommended)** — **stop writing them.** The source files live on Akhil's disk;
  the bucket is not a backup. One fewer upload per photo.
- **Option B** — move them to a second, non-public R2 bucket.
- **Option C** — keep the bucket and block `/private/*` at the edge with a Cloudflare rule.
  Leaves the objects one misconfiguration from public again.

**Recommendation: A**, and **separately, the existing 39 should be deleted** — that is a
`user_setup` cleanup, not something a Phase 4 plan should do silently. It should also be
recorded in `STATE.md`'s Blockers/Concerns, which is outside this document's write scope.

---

### OD-10 · What `date` means
**Blocks:** the plan implementing the record producer
**Type:** data semantics; affects Phase 5 sort order

Measured: `{"2026-03-28": 38, "2026-04-07": 1}` — every value is an ingestion date. Legacy uses
`new Date().toISOString().split("T")[0]` and never picks `DateTimeOriginal`.

- **Option A** — keep ingestion date. Consistent with all 39 existing records; zero migration.
- **Option B (recommended)** — read EXIF `DateTimeOriginal`, fall back to the ingestion date when
  absent. It is what a viewer would assume `date` means, and the field is already in the file the
  pipeline parses. **But** it makes new records semantically different from the 39 old ones
  unless those are backfilled, which is a change to reviewed data.
- **Option C** — B plus a backfill of all 39 from the R2 originals' EXIF.

**No recommendation — this is a product question**, and it is exactly the shape of OD-5 in Phase
3 (two fields, one meaning) that Akhil has ruled on before. Note that 1 of 39 records has a null
`camera` and 2 have null `iso`/`aperture`, so a `DateTimeOriginal` fallback will fire.

---

### OD-11 · What `dimensions` describes
**Blocks:** the plan implementing the record producer; **gates Phase 5's PUB-05**
**Type:** contract that has never been written down

Measured: `dimensions` is the **source** size. `nature-fairwayreflections` is `4608×3072` in the
manifest while `urls.original` serves `2000×1333`.

- **Option A (recommended)** — declare it: *"`dimensions` is the intrinsic size of the source
  photograph; consumers use it for aspect ratio, never for pixel dimensions."* Write it into
  `src/schemas/photo.ts` as a comment and keep producing source dimensions. Zero data change,
  ratio is preserved (worst measured drift 0.03 %).
- **Option B** — redefine it as the dimensions of `urls.original` and backfill three records.
  Then `width`/`height` attributes are literally correct — but it is a change to reviewed data
  for a benefit CSS `aspect-ratio` already provides.

**Recommendation: A.** Cheap, and it converts an accident into a contract before Phase 5 builds
on it.

---

### OD-12 · `exifr` (unmaintained) or `exif-reader` via sharp
**Blocks:** the plan that adds dependencies
**Type:** dependency health

`exifr@7.1.3` last published **2022-05-01** — four years stale, though `slopcheck` rates it
`[OK]` and it has no known vulnerability. `exif-reader@2.0.3` (2025-12-12) is what `sharp`'s own
documentation pairs with `sharp(...).metadata().exif`.

- **Option A** — keep `exifr`. Zero risk of a mapping regression; the legacy code is a working
  reference for all six fields.
- **Option B (recommended)** — `exif-reader` fed from the buffer `sharp` already produced. Drops
  a stale dependency and a second read of the file.

**Recommendation: B**, and the proof is unusually cheap here: **the 39 committed records are a
ready-made regression corpus.** Re-extract EXIF from the 39 live originals with the new library
and require the six fields to reproduce the committed values byte-for-byte, nulls included
(`camera=1, lens=11, aperture=2, shutter=2, iso=2, focalLength=2` — measured). If they do not
reproduce, the library changed the mapping and A wins on evidence. **A is a perfectly acceptable
answer** if that proof looks like more work than it is worth.

---

## Assumptions log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | The R2 custom domain re-emits an object's `Cache-Control` metadata in place of the zone's `max-age=14400` | §4, OD-1 | **High.** OD-1 option A's `immutable` header would be silently dropped and the browser would keep the 4 h TTL. Measurable in one command once credentials exist — **do not lock OD-1 without it** |
| A2 | `R2_PUBLIC_URL` still holds the `r2.dev` value | §7, OD-3 | Medium. Inferred from its 2026-03-28 timestamp; the value was deliberately not read. OD-3 option A makes it moot |
| A3 | The existing `CLOUDFLARE_API_TOKEN` does **not** carry R2 Storage → Edit | §7, OD-5 | Medium. It was created for `wrangler deploy`. Only Akhil can check |
| A4 | `sharp`, `exifr` and `@aws-sdk/client-s3` are still the right choices | §10 | Low. `[ASSUMED]` per the provenance rule — discovered from this repo's history, which is authoritative about the past, not the present |
| A5 | `temp/` objects currently exist and are accumulating in the bucket | §14 | Low. Cannot enumerate without credentials. If none exist, the lifecycle rule is purely preventive — which is still worth having |
| A6 | The measured `astro sync` timings (1.7 s) scale to `ubuntu-latest` | §5 | Low. Measured on macOS with warm caches; the *ordering* (sync < build < check) is what the design depends on |
| A7 | Every one of the 39 `private/*-clean.webp` objects is genuinely unwatermarked | §3, OD-9 | Low. Verified by content-type, byte size and one 2000×1333 decode; not by pixel inspection of the watermark region. The exposure claim does not depend on it — the objects are public either way |

---

## Sources

### Primary — HIGH confidence (measured in this session)

- The repository itself: `src/schemas/{index,photo,content-set}.ts`, `src/lib/{image-origin,content}.ts`, `src/content.config.ts`, `astro.config.mjs`, `wrangler.jsonc`, `.github/workflows/{ci,deploy}.yml`, `package.json`, `package-lock.json`, `.nvmrc`, `biome.json`, `vitest*.config.ts`, `scripts/{migrate-photo-origin,assert-no-r2dev-urls}.mjs`, `data/portfolio_images.json`
- `legacy/nextjs-portfolio` via `git show` and `git grep`: `scripts/{process-images,action-process,action-process-dispatch}.js`, `.github/workflows/process-photos.yml`, `src/app/api/{upload,dispatch,deploy}/route.ts`, `src/components/admin/DeployButton.tsx`
- Live HTTP against `images.akhilsaxena.com` and `pub-2d90…r2.dev` — cache headers, 39 `private/` probes, served variant dimensions decoded with sharp
- `npx wrangler r2 bucket lifecycle --help`, `… lifecycle add --help`, `… object put --help` on wrangler 4.123.0
- `gh secret list`, `gh variable list`, `gh workflow list`, `gh run list`, `gh workflow run --help` on gh 2.93.0
- `npm view` for sharp / exifr / @aws-sdk/client-s3 / exif-reader; `slopcheck install` (4 OK)
- Planted-violation experiments in a `git clone --no-hardlinks` sandbox: legacy record shape, schema-valid dead-URL record, duplicate append, 40-record suite run, no-env `astro sync`/`build`

### Secondary — MEDIUM/HIGH (official documentation)

- docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow — GITHUB_TOKEN does not trigger workflows
- docs.github.com/en/rest/repos/contents — `sha` = blob SHA, 409 on mismatch
- docs.github.com/en/rest/git/refs — `force` default false, fast-forward guarantee
- docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax — 25 `workflow_dispatch` inputs, 65 535-char payload
- developers.cloudflare.com/r2/buckets/object-lifecycles/ — prefix scoping, days granularity, ~24 h removal, 1 000 rules
- developers.cloudflare.com/r2/api/s3/api/ — PutObject supports `Cache-Control`
- developers.cloudflare.com/r2/platform/limits/ — 5 GiB single-part, 1 024-byte keys, 1 write/s per key
- developers.cloudflare.com/cache/concepts/default-cache-behavior/ — `.webp` cached by default; 120 min default edge TTL on 200
- developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/ — Zone → Cache Purge → Edit token

### Tertiary — LOW (unverified, flagged)

- Third-party claims that R2 custom domains honour object `Cache-Control`. **Not confirmed on any
  first-party page fetched.** → A1, OD-1.

---

## Metadata

**Confidence breakdown**

| Area | Level | Why |
|---|---|---|
| Legacy pipeline spec | **HIGH** | read from source and cross-checked against served bytes |
| Required record shape | **HIGH** | read from the schema and confirmed by planting four violation classes |
| What no gate can see | **HIGH** | measured: exit 0 over four 404s |
| Wave 0 test inventory | **HIGH** | measured: 444/444 control → 15 failures across 4 files, in a real clone |
| Cache behaviour | **HIGH** for the measurements, **MEDIUM** for the fix | the HEAD/GET split and the query-string cache key are measured; object-level `Cache-Control` is A1 |
| Credentials | **HIGH** on names and dates, **LOW** on values | values deliberately not read |
| R2 lifecycle | **HIGH** | CLI surface verified on the installed binary and corroborated by docs |
| Concurrency | **HIGH** on mechanism, **MEDIUM** on design | API semantics cited from GitHub docs; the retry loop is a recommendation, unbuilt |
| `alt` provenance | **LOW** — genuinely unresolved | OD-2 is a product decision no artefact answers |

**Working tree:** unchanged. `slopcheck install` modified `package.json`/`package-lock.json` and
was reverted with `git checkout -- … && npm ci`; both sandboxes were deleted; `git status
--short` is empty.

**Research date:** 2026-08-26
**Valid until:** ~2026-09-09 for the Cloudflare and GitHub behaviours; **A1 expires the moment
someone can run one `wrangler r2 object put`** and should be measured before OD-1 is locked.
