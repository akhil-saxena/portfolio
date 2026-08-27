/**
 * THE RECORD PRODUCER, AND WHAT A RE-RUN DOES.  (Phase 4, plan 04-05 — PIPE-01, PIPE-03, CONT-05.)
 *
 * It turns derived image assets plus validated dispatch inputs into ONE record that
 * `src/schemas/photo.ts` accepts and all six referential-integrity rules in
 * `src/schemas/content-set.ts` accept, and it defines what happens when the same job runs twice.
 *
 * ---------------------------------------------------------------------------------------------
 * THIS MODULE IS PURE, AND THE PURITY IS THE POINT
 *
 * No filesystem. No network. No git. No `sharp`. No `child_process`. It takes an assets object and
 * returns a record; it takes a manifest and a record and returns a NEW manifest. It reads nothing
 * and writes nothing.
 *
 * That is not tidiness — it is what makes VALIDATION-BEFORE-SIDE-EFFECTS possible. 04-09 runs the
 * job in ten steps, and steps 1 through 6 have no side effect at all: derive, build the record,
 * upsert into a candidate manifest, write it into a scratch copy, and run `npx astro sync` — the
 * full Phase 3 content gate, measured at 1.7 s, needing no `.env`/`.dev.vars`. Only step 7 uploads
 * and only step 9 commits. So a crash anywhere before step 7 leaves R2 unchanged, `main` unchanged
 * and the manifest unchanged. The legacy dispatch entrypoint did the reverse — it wrote the
 * manifest, THEN deleted the R2 temp object, with no validation between the two — and there was no
 * state it could crash in that was not a mess to recover from.
 *
 * A future edit that reaches for `readFileSync` here has moved the job's first side effect earlier
 * than its only rejection. `04-05-PLAN.md`'s `done` block greps this file for any import of the
 * filesystem, the process spawner, the image encoder or the network, and requires zero matches.
 * The exact alternation lives there rather than being quoted here, and that is a finding worth
 * carrying forward: a file that quotes its own gate's pattern MATCHES ITS OWN DOCUMENTATION, and
 * the gate then reports an impurity that is a comment. Measured here on 2026-08-27 — the first
 * draft of this header quoted the command and the grep returned line 27 of this file.
 *
 * ---------------------------------------------------------------------------------------------
 * IT COMPOSES NOTHING ITSELF
 *
 * Every key, URL, hash and id comes from `src/lib/photo-pipeline.ts`, which that file's header
 * states is the only place the scheme is written. There is no hostname literal here, no
 * `photos/` prefix, no `-lg`, no `${category}-${slug}`. A scheme that could be half-changed is a
 * scheme that will be.
 *
 * The import carries an explicit `.ts` and is resolved by Node 22's built-in type stripping — the
 * same mechanism `scripts/assert-no-r2dev-urls.mjs` already relies on. `src/schemas/photo.ts` is
 * deliberately NOT imported: measured 2026-08-27, it resolves `'../lib/image-origin'`
 * extensionlessly, which Vite resolves and Node's ESM resolver does not, so importing it here
 * would make this module unloadable on the Actions runner. The schema is therefore the authority
 * this module is TESTED against (`test/pipeline/idempotence.unit.test.ts` and, through the real
 * gate, `test/pipeline/record-valid.node.test.ts`) rather than one it calls.
 *
 * ---------------------------------------------------------------------------------------------
 * OD-4 · A RE-RUN IS AN UPSERT KEYED ON `id`, AND IT EXITS 0.  (Option A, decided 2026-08-26.)
 *
 * Criterion 2 says only "a re-run adds no duplicate manifest entry", which three implementations
 * satisfy: upsert, detect-and-no-op, and the legacy `if (existingIds.has(entry.id)) process.exit(1)`.
 * Option A is the upsert, because the common operational event is a re-dispatch after a job died
 * between the R2 upload and the commit — and under A that repair is the ordinary path rather than a
 * manual cleanup. The record is RECOMPUTED and replaced in place: new urls, new hashes, new
 * dimensions, new exif. An upsert that changed nothing would be a no-op wearing a hat, and could
 * not repair the record it exists to repair.
 *
 * THE CAVEAT, WHICH IS IMPLEMENTED AND NOT MERELY NOTED:
 *
 *     AN UPSERT MUST NOT RENUMBER `order` OR `categoryOrder`.
 *
 * Those two fields ARE the gallery sequence — `order` globally, `categoryOrder` within a filter
 * tab. Recomputing them on a retry would silently reorder Akhil's reviewed gallery as a side effect
 * of an operational repair, and it would show up downstream as an ordinary content change with
 * nothing to attribute it to. So `upsertRecord` takes the ranks of the record it is REPLACING and
 * discards the ones the rebuild derived. `test/pipeline/idempotence.unit.test.ts` asserts the
 * preservation byte-for-byte, including the case where the manifest's maxima HAVE moved between
 * the two runs — which is the case a naive implementation gets wrong.
 *
 * THE `id` KEY AND WHAT IT IMPLIES.  `id` is `category + "-" + slug` (`photoIdFor`). So a record's
 * category is recoverable from its id, and two records sharing an id necessarily share a category —
 * which is why `upsertRecord` never has to decide whether a preserved `categoryOrder` still belongs
 * to the right group, and refuses outright if it ever meets a manifest where that is not true. The
 * flip side, recorded rather than glossed: re-dispatching the same photograph under a DIFFERENT
 * category produces a different id and is therefore an INSERT, not a repair. The wrongly-filed
 * record stays until someone deletes it. Deleting records is not this pipeline's job.
 *
 * ---------------------------------------------------------------------------------------------
 * OD-10 IS NOT DECIDED HERE.  `date` is a REQUIRED ARGUMENT.
 *
 * What `date` means — the ingestion date every one of the 39 committed records carries, or EXIF
 * `DateTimeOriginal` with a fallback — is OD-10, and it is 04-07 Task 3's to resolve. Computing a
 * default here would settle it by accident. Taking it as an argument keeps this module independent
 * of that decision and makes its landing a one-line change at the call site instead of a rewrite.
 *
 * ---------------------------------------------------------------------------------------------
 * THE FOUR-CLASS PORTING DELTA THIS CLOSES
 *
 * `04-RESEARCH.md` §6 planted exactly what the legacy `processImage()` returns and measured `npx
 * astro sync` exiting 1 with seven findings in four classes. Each is closed by construction below:
 *
 *   1. `alt` missing            → `alt` is a required input, validated by `assertPublishableAlt`.
 *   2. all four `urls.*` on the retired `r2.dev` origin
 *                               → composed only by `publishedUrl`, which reads `IMAGE_ORIGIN`.
 *   3. `categoryOrder` missing  → derived by `nextCategoryOrder` from the manifest in hand.
 *   4. `tags` present           → refused as an input, naming OD-3, rather than dropped silently.
 *
 * Nothing else about the legacy imaging logic was wrong, and nothing else is changed.
 */

import {
  assertPublishableAlt,
  assertStagingKey,
  CONTENT_HASH_RE,
  contentHash,
  photoIdFor,
  publishedKey,
  publishedUrl,
  THUMB,
  VARIANTS,
} from '../../src/lib/photo-pipeline.ts';

/* ==============================================================================================
 * 0. Two grammars this module has to restate, and why.
 * ============================================================================================ */

/**
 * The six EXIF fields, in the order `PhotoExifSchema` declares them.
 *
 * RESTATED, because there is nowhere to import it from: `src/schemas/photo.ts` cannot be loaded by
 * plain `node` (see the header) and `src/lib/photo-pipeline.ts` does not export the list. A list of
 * six key names is not a rival content shape — `scripts/assert-single-schema-source.mjs` scans
 * `src/` for rival zod objects and `interface Photo` declarations, and this is neither — but it IS
 * a second place the field set is written, so the agreement is asserted rather than assumed: the
 * unit suite checks the produced block against `PhotoSchema`, whose `strictObject` refuses an extra
 * key and whose non-optional fields refuse a missing one. A drift fails there, by name.
 */
const EXIF_FIELDS = ['camera', 'lens', 'aperture', 'shutter', 'iso', 'focalLength'];

/** The `date` grammar, character for character the one `src/schemas/photo.ts` enforces. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Keep a hostile value out of an error message at full length. Same helper photo-pipeline uses. */
const quote = (value) => {
  const text = typeof value === 'string' ? value : String(value);
  return JSON.stringify(text.length > 200 ? `${text.slice(0, 200)}…` : text);
};

const fail = (message) => {
  throw new Error(`photo-record: ${message}`);
};

const assertArray = (manifest, who) => {
  if (!Array.isArray(manifest)) {
    fail(
      `${who} needs the manifest it is ranking against, as an array. Got ${
        manifest === null ? 'null' : typeof manifest
      }. The ranks are a function of the array in hand and never of a cached read — two runs that ` +
        'both remembered `maxOrder = 39` both wrote `order: 40` (pitfall P-5).'
    );
  }
};

const assertNonEmptyString = (value, label) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label} must be a non-empty string. Got ${quote(value)}.`);
  }
  return value.trim();
};

/**
 * Read a rank off a record, refusing anything that is not a positive integer.
 *
 * `Math.max` over a bad value yields `NaN`, and `NaN + 1` is `NaN`, which would be written into the
 * manifest and rejected far away from its cause. `PhotoSchema` requires a positive int; this
 * refuses the same thing at the point the value is read.
 */
const rankOf = (record, field, index) => {
  const value = record === null || typeof record !== 'object' ? undefined : record[field];
  if (!Number.isInteger(value) || value < 1) {
    fail(
      `manifest[${index}].${field} must be a positive integer — it is a rank, and ` +
        `PhotoSchema refuses anything else. Got ${quote(value)}.`
    );
  }
  return value;
};

/* ==============================================================================================
 * 1. RANKING.  Derived from the manifest passed in. Never cached, never global.
 * ============================================================================================ */

/**
 * `max(order) + 1` over the manifest given, or 1 over an empty one.
 *
 * The empty case is spelled out rather than left to `Math.max(...[])`, which is `-Infinity` and
 * would produce `order: -Infinity`. Schema-invalid, but only discovered later and elsewhere.
 */
export function nextOrder(manifest) {
  assertArray(manifest, 'nextOrder');
  let max = 0;
  manifest.forEach((record, index) => {
    const order = rankOf(record, 'order', index);
    if (order > max) max = order;
  });
  return max + 1;
}

/**
 * `max(categoryOrder within `category`) + 1`, or 1 when no record is filed under it.
 *
 * PER GROUP, deliberately: every category restarts at 1 in the committed data, and RI-6 checks
 * uniqueness WITHIN a category rather than globally. A first photograph in a new category
 * legitimately gets 1.
 */
export function nextCategoryOrder(manifest, category) {
  assertArray(manifest, 'nextCategoryOrder');
  assertNonEmptyString(category, 'category');
  let max = 0;
  manifest.forEach((record, index) => {
    if (record === null || typeof record !== 'object' || record.category !== category) return;
    const rank = rankOf(record, 'categoryOrder', index);
    if (rank > max) max = rank;
  });
  return max + 1;
}

/* ==============================================================================================
 * 2. THE RECORD.
 * ============================================================================================ */

/** `YYYY-MM-DD`, and a date that exists — the regex alone accepts `2026-02-31`. */
const assertIsoDate = (date) => {
  if (typeof date !== 'string' || !ISO_DATE_RE.test(date)) {
    fail(
      `date must be a YYYY-MM-DD string, the grammar src/schemas/photo.ts enforces. Got ` +
        `${quote(date)}. It is an explicit argument on purpose: what \`date\` MEANS — the ` +
        'ingestion date all 39 committed records carry, or EXIF DateTimeOriginal — is OD-10, ' +
        'and 04-07 owns it. Defaulting here would settle it by accident.'
    );
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    fail(`date ${quote(date)} matches YYYY-MM-DD but is not a date that exists.`);
  }
  return date;
};

/**
 * The six-key EXIF block, always complete.
 *
 * `PhotoExifSchema` is a `strictObject` whose six fields are NULLABLE and NOT optional, so a file
 * with no EXIF at all still needs all six keys. The legacy pipeline had the same behaviour —
 * `extractExif` returned `null` on any throw and the caller substituted an all-null object — and
 * it is preserved here: `assets.exif` absent means six nulls, not an absent block.
 *
 * A FALSY STRING BECOMES `null`. `PhotoExifSchema` puts `.min(1)` on the five string fields, so an
 * empty `Make` tag would fail the schema; an empty tag means the camera wrote nothing, which is
 * exactly what `null` says. This mirrors the legacy `FNumber ? \`f/${FNumber}\` : null` shape.
 */
function buildExif(source) {
  if (source !== undefined && source !== null && typeof source !== 'object') {
    fail(`assets.exif must be an object or absent. Got ${quote(source)}.`);
  }
  const input = source ?? {};
  const unknown = Object.keys(input).filter((key) => !EXIF_FIELDS.includes(key));
  if (unknown.length > 0) {
    fail(
      `assets.exif carries ${unknown.map(quote).join(', ')}, which PhotoExifSchema (a ` +
        `strictObject) refuses. The six fields are ${EXIF_FIELDS.join(', ')}.`
    );
  }

  const exif = {};
  for (const field of EXIF_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null || value === '') {
      exif[field] = null;
      continue;
    }
    if (field === 'iso') {
      if (!Number.isInteger(value) || value < 1) {
        fail(`assets.exif.iso must be a positive integer or null. Got ${quote(value)}.`);
      }
      exif[field] = value;
      continue;
    }
    if (typeof value !== 'string') {
      fail(`assets.exif.${field} must be a string or null. Got ${quote(value)}.`);
    }
    exif[field] = value;
  }
  return exif;
}

/** `{ width, height }`, both positive integers. OD-11: the SOURCE size, never a variant size. */
function buildDimensions(source) {
  if (source === null || typeof source !== 'object') {
    fail(
      `assets.dimensions must be { width, height } — the INTRINSIC SIZE OF THE SOURCE (OD-11), ` +
        `read before any resize. Got ${quote(source)}.`
    );
  }
  for (const axis of ['width', 'height']) {
    if (!Number.isInteger(source[axis]) || source[axis] < 1) {
      fail(`assets.dimensions.${axis} must be a positive integer. Got ${quote(source[axis])}.`);
    }
  }
  return { width: source.width, height: source.height };
}

/**
 * The four remote URLs plus the LQIP.
 *
 * EACH VARIANT IS HASHED FROM ITS OWN EMITTED BUFFER. Hashing the source once and stamping that
 * hash on all four keys looks correct and defeats the point for three of them: a re-encode at a new
 * quality changes `-lg` and `-sm` while the source stays byte-identical, so those two would keep
 * their old URLs and keep serving old bytes behind the zone's measured four-hour browser cache.
 * That is CONT-05's entire mechanism, and `test/pipeline/versioned-key.unit.test.ts` §3 is the
 * assertion that a source-derived hash fails.
 *
 * A CALLER-SUPPLIED `hash` IS CHECKED, NEVER TRUSTED. 04-09's uploader addresses an object by a key
 * it composed from a hash it computed. If that hash and the record's ever disagreed, the manifest
 * would point at four objects that were never written — the exact lie only
 * `scripts/verify-photo-urls.mjs` can see, caught here instead, before a single byte is uploaded.
 */
function buildUrls({ category, slug, variants, thumb }) {
  if (variants === null || typeof variants !== 'object') {
    fail(`assets.variants must be an object keyed by url key. Got ${quote(variants)}.`);
  }

  const expected = VARIANTS.map((variant) => variant.urlKey);
  const extra = Object.keys(variants).filter((key) => !expected.includes(key));
  if (extra.length > 0) {
    fail(
      `assets.variants carries ${extra.map(quote).join(', ')}, which is not one of the four ` +
        `VARIANTS (${expected.join(', ')}). PhotoUrlsSchema is a strictObject.`
    );
  }

  const urls = {};
  for (const variant of VARIANTS) {
    const entry = variants[variant.urlKey];
    if (entry === undefined || entry === null || typeof entry !== 'object') {
      fail(
        `assets.variants.${variant.urlKey} is missing. All four VARIANTS are required — a record ` +
          'with three URLs is a gallery that 404s at one breakpoint and nowhere else.'
      );
    }
    const { bytes } = entry;
    if (!(bytes instanceof Uint8Array) && typeof bytes !== 'string') {
      fail(
        `assets.variants.${variant.urlKey}.bytes must be the EMITTED buffer for that variant ` +
          `(Uint8Array or string). Got ${quote(bytes)}. The hash is taken from these bytes, so ` +
          'passing the source buffer for every variant would give all four the same version.'
      );
    }

    const hash = contentHash(bytes);
    if (entry.hash !== undefined && entry.hash !== hash) {
      fail(
        `assets.variants.${variant.urlKey}.hash is ${quote(entry.hash)} but its own bytes hash ` +
          `to ${quote(hash)}. The uploader and the record would then address different objects. ` +
          `A supplied hash must match ${CONTENT_HASH_RE.source}, and must be the hash of the ` +
          'bytes beside it.'
      );
    }

    urls[variant.urlKey] = publishedUrl(
      publishedKey({ category, slug, hash, suffix: variant.suffix })
    );
  }

  if (typeof thumb !== 'string' || !thumb.startsWith(THUMB.dataUriPrefix)) {
    fail(
      `assets.thumb must be the inline LQIP data URI beginning ${quote(THUMB.dataUriPrefix)} — ` +
        'it carries no hostname, which is why an origin migration never rewrites it. Got ' +
        `${quote(thumb)}.`
    );
  }
  urls.thumb = thumb;

  return urls;
}

/**
 * Build one manifest record.
 *
 * @param {object} args
 * @param {{ temp_key: string, category: string, title: string, alt: string, place?: string }} args.inputs
 *   The VALIDATED `workflow_dispatch` values (`DISPATCH_INPUTS`). They are re-asserted here anyway:
 *   this function is the last thing between a caller's text and a file on `main`, and every check
 *   below is cheaper than the upload it precedes.
 * @param {{ slug: string, variants: Record<string, { bytes: Uint8Array|string, hash?: string }>,
 *           thumb: string, dimensions: { width: number, height: number },
 *           exif?: Record<string, string|number|null> }} args.assets
 *   What 04-07's deriver returns. This function re-derives NOTHING from an image; if it needs a
 *   value, that value is an input.
 * @param {string} args.date  `YYYY-MM-DD`. OD-10 is 04-07's; see `assertIsoDate`.
 * @param {readonly object[]} args.manifest  The manifest the ranks are derived from.
 * @returns {object} a record satisfying `PhotoSchema`, keyed in the committed field order.
 */
export function buildRecord({ inputs, assets, date, manifest } = {}) {
  if (inputs === null || typeof inputs !== 'object') {
    fail(`inputs must be the validated dispatch values object. Got ${quote(inputs)}.`);
  }
  if (assets === null || typeof assets !== 'object') {
    fail(`assets must be the derived-assets object 04-07 produces. Got ${quote(assets)}.`);
  }

  // OD-3, refused rather than dropped. Someone will pass this believing it was an oversight.
  if ('tags' in inputs) {
    fail(
      'inputs.tags is refused. OD-3 dropped `tags`: it was empty on all 39 records and nothing ' +
        'renders it, the gallery filters by category, and `PhotoSchema` declares it ' +
        '`z.never().optional()` so the refusal carries the decision. Silently discarding it here ' +
        'would let a caller believe it had been stored.'
    );
  }

  // T-04-04. `temp_key` is caller-supplied text naming an object in a bucket the pipeline holds
  // write credentials for. It does not appear in the record; it is asserted because a caller that
  // reached this function with an unvalidated key never validated anything else either.
  assertStagingKey(inputs.temp_key);

  const category = assertNonEmptyString(inputs.category, 'inputs.category');
  const title = assertNonEmptyString(inputs.title, 'inputs.title');

  // OD-2 / OD-2b, and it runs BEFORE any byte is touched so a bad value costs nothing. The
  // placeholder rules are strictly narrower than `PhotoSchema`'s four, so this can only refuse
  // things the schema would also refuse, plus the `TODO`-class stubs the schema measurably accepts.
  assertPublishableAlt({ alt: inputs.alt, title });
  const alt = inputs.alt.trim();

  assertIsoDate(date);

  // TRIMMED, all three. `gh workflow run -F alt=@alt.txt` reads the value from a file, and a file
  // ends with a newline; storing it would put a trailing "\n" into reviewed content.
  const place =
    inputs.place === undefined ? undefined : assertNonEmptyString(inputs.place, 'inputs.place');

  const slug = assertNonEmptyString(assets.slug, 'assets.slug');
  // Asserts BOTH slug grammars — the same `/^[a-z0-9-]+$/` src/schemas/photo.ts puts on `id` and
  // `category` — and is the ONE composer of the id. This module never joins them itself.
  const id = photoIdFor({ category, slug });

  const urls = buildUrls({ category, slug, variants: assets.variants, thumb: assets.thumb });
  const exif = buildExif(assets.exif);
  const dimensions = buildDimensions(assets.dimensions);

  const order = nextOrder(manifest);
  const categoryOrder = nextCategoryOrder(manifest, category);

  // Assembled key by key, in the order the 39 committed records already use, so a pipeline write
  // is a one-record diff rather than a reshuffle of the file. `place` sits after `alt`, where the
  // committed records that have one put it. `tags` and `focalPoint` are absent: `focalPoint` is an
  // editorial crop, which is Phase 7's admin to set and not something a pipeline can know.
  const record = { id, title, alt };
  if (place !== undefined) record.place = place;
  record.category = category;
  record.date = date;
  record.exif = exif;
  record.urls = urls;
  record.order = order;
  record.categoryOrder = categoryOrder;
  record.dimensions = dimensions;
  return record;
}

/* ==============================================================================================
 * 3. THE UPSERT.  OD-4 option A.
 * ============================================================================================ */

/** The minimum shape `upsertRecord` needs to key and rank. The full check is `PhotoSchema`'s. */
const assertRecordShape = (record) => {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    fail(`upsertRecord needs a record object. Got ${quote(record)}.`);
  }
  assertNonEmptyString(record.id, 'record.id');
  assertNonEmptyString(record.category, 'record.category');
  for (const field of ['order', 'categoryOrder']) {
    if (!Number.isInteger(record[field]) || record[field] < 1) {
      fail(
        `record.${field} must be a positive integer before the record can be upserted — it is a ` +
          `rank, and PhotoSchema refuses anything else. Got ${quote(record[field])}.`
      );
    }
  }
};

/**
 * Insert `record`, or replace the existing record with the same `id` — and in the replace case
 * KEEP THE EXISTING `order` AND `categoryOrder`.  (OD-4 option A, with its caveat.)
 *
 * Returns a NEW array. It never mutates the array it was given, and never mutates any record object
 * inside it: the committed manifest is read at module scope by several test files, and a shared
 * mutation would make one file's assertions depend on another file's execution order.
 *
 * Everything ELSE is taken from the rebuilt record — urls, hashes, dimensions, exif, title, alt,
 * place — because that is what makes a re-dispatch a REPAIR. An upsert that preserved everything
 * would be a no-op, which is option B, which cannot fix a manifest whose four R2 objects were never
 * written.
 *
 * @param {readonly object[]} manifest
 * @param {object} record
 * @returns {object[]} a new manifest
 */
export function upsertRecord(manifest, record) {
  assertArray(manifest, 'upsertRecord');
  assertRecordShape(record);

  const index = manifest.findIndex(
    (existing) => existing !== null && typeof existing === 'object' && existing.id === record.id
  );

  if (index === -1) return [...manifest, record];

  const existing = manifest[index];

  // Impossible under the id invariant (`id === category + "-" + slug`), and worth refusing rather
  // than resolving: a preserved `categoryOrder` ranks within a group, and if the group had changed
  // the preserved value would be a rank in the wrong gallery. RI-6 would eventually catch the
  // collision; this names the cause instead of the symptom.
  if (existing.category !== record.category) {
    fail(
      `manifest[${index}] has id ${quote(record.id)} but category ${quote(existing.category)}, ` +
        `while the record being upserted claims category ${quote(record.category)}. An id is ` +
        '`category + "-" + slug`, so this manifest disagrees with itself. Refusing rather than ' +
        'carrying a categoryOrder across a group it does not rank in.'
    );
  }

  // The spread FIRST and the ranks LAST: overriding an existing key keeps its position, so the
  // record's field order is the rebuilt one and the two rank VALUES are the preserved ones.
  const preserved = { ...record, order: existing.order, categoryOrder: existing.categoryOrder };

  const next = manifest.slice();
  next[index] = preserved;
  return next;
}

/* ==============================================================================================
 * 4. SERIALISATION.  The trailing newline is a contract, not a formatting preference.
 * ============================================================================================ */

/**
 * `JSON.stringify(manifest, null, 2)` PLUS A TRAILING NEWLINE.
 *
 * MEASURED: the committed `data/portfolio_images.json` is 57,345 bytes WITH the newline 03-01
 * added. The legacy writer emitted `JSON.stringify(merged, null, 2)` and nothing else, so a
 * legacy-shaped write would revert that fix and produce a spurious one-line diff on the closing
 * `]` on every single pipeline run — noise in a reviewed file, forever, from one missing byte.
 *
 * `test/pipeline/idempotence.unit.test.ts` asserts this function reproduces the committed 39-record
 * file BYTE-FOR-BYTE, which is checkable today; 04-06 asserts the same property on the retry write
 * path, where the failure would be a conflict rather than a diff. Both are needed: this one proves
 * the function, that one proves the call site.
 *
 * @param {readonly object[]} manifest
 * @returns {string}
 */
export function serialiseManifest(manifest) {
  assertArray(manifest, 'serialiseManifest');
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
