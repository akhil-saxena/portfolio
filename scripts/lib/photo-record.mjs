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

const EXIF_FIELDS = ['camera', 'lens', 'aperture', 'shutter', 'iso', 'focalLength'];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export function nextOrder(manifest) {
  assertArray(manifest, 'nextOrder');
  let max = 0;
  manifest.forEach((record, index) => {
    const order = rankOf(record, 'order', index);
    if (order > max) max = order;
  });
  return max + 1;
}

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

  if ('tags' in inputs) {
    fail(
      'inputs.tags is refused. OD-3 dropped `tags`: it was empty on all 39 records and nothing ' +
        'renders it, the gallery filters by category, and `PhotoSchema` declares it ' +
        '`z.never().optional()` so the refusal carries the decision. Silently discarding it here ' +
        'would let a caller believe it had been stored.'
    );
  }

  assertStagingKey(inputs.temp_key);

  const category = assertNonEmptyString(inputs.category, 'inputs.category');
  const title = assertNonEmptyString(inputs.title, 'inputs.title');

  assertPublishableAlt({ alt: inputs.alt, title });
  const alt = inputs.alt.trim();

  assertIsoDate(date);

  const place =
    inputs.place === undefined ? undefined : assertNonEmptyString(inputs.place, 'inputs.place');

  const slug = assertNonEmptyString(assets.slug, 'assets.slug');
  const id = photoIdFor({ category, slug });

  const urls = buildUrls({ category, slug, variants: assets.variants, thumb: assets.thumb });
  const exif = buildExif(assets.exif);
  const dimensions = buildDimensions(assets.dimensions);

  const order = nextOrder(manifest);
  const categoryOrder = nextCategoryOrder(manifest, category);

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

  if (existing.category !== record.category) {
    fail(
      `manifest[${index}] has id ${quote(record.id)} but category ${quote(existing.category)}, ` +
        `while the record being upserted claims category ${quote(record.category)}. An id is ` +
        '`category + "-" + slug`, so this manifest disagrees with itself. Refusing rather than ' +
        'carrying a categoryOrder across a group it does not rank in.'
    );
  }

  const preserved = { ...record, order: existing.order, categoryOrder: existing.categoryOrder };

  const next = manifest.slice();
  next[index] = preserved;
  return next;
}

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
