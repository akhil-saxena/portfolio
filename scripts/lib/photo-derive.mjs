/**
 * THE DERIVER. One uploaded photograph in; four WebP variants, a watermark on each, a 40px
 * inline LQIP, the SOURCE dimensions and four upload descriptors out.
 * (Phase 4, plan 04-07 — PIPE-01, criterion 1.)
 *
 * ---------------------------------------------------------------------------------------------
 * WHERE THIS RUNS — DEPENDENCY TIER (threat T-04-15)
 *
 * ACTIONS RUNNER ONLY, NEVER IN `workerd`. It imports `sharp`, a native binary that cannot load
 * in the Workers runtime at any version. Nothing under `src/` may import this file and this file
 * may not be imported by anything under `src/`. `scripts/lib/photo-record.mjs` is the pure half
 * of the same job — no filesystem, no network, no encoder — and this is the impure half; the
 * split is what lets 04-09 validate a whole candidate manifest before its first side effect.
 *
 * The import of `../../src/lib/photo-pipeline.ts` carries an explicit `.ts` and is resolved by
 * Node 22's built-in type stripping, exactly as `photo-record.mjs` and `git-publish.mjs` already
 * do. The real floor for that is Node 22.18.0; `.nvmrc` pins 22.22.3 and all three workflows read
 * it. (`package.json`'s `engines.node` still says `>=22.12.0` — logged in this phase's
 * `deferred-items.md`, not fixed here.)
 *
 * ---------------------------------------------------------------------------------------------
 * IT OWNS NO NUMBER
 *
 * Every width, every quality and every suffix comes from `VARIANTS` and `THUMB` in
 * `src/lib/photo-pipeline.ts`, which that file's header states is the only place the scheme is
 * written. There is no size table here, no `-lg`, no key prefix and no hostname. 04-07's `done`
 * block greps this file for a re-typed literal in an assignment position; the load-bearing check
 * is `test/pipeline/variants.unit.test.ts`, which decodes every emitted buffer and compares its
 * width against the table.
 *
 * The two ratios below (`0.01` for the mark's size, `0.015` for its inset) are NOT variant
 * numbers — they are the watermark's own geometry, they exist nowhere else, and they are stated
 * here beside the function that uses them rather than in a plan file nobody can evaluate later.
 *
 * ---------------------------------------------------------------------------------------------
 * THE `CLAUDE.md` PROSE ABOUT THE WATERMARK IS WRONG, AND WAS WRONG WHEN IT WAS WRITTEN
 *
 * `CLAUDE.md`'s Architecture section says the legacy pipeline applied the watermark to "original
 * and medium (not thumb)". The legacy code contradicts its own comment: `addWatermark()` is
 * called INSIDE `for (const variant of VARIANTS)`, so it ran on ALL FOUR
 * (`git show legacy/nextjs-portfolio:scripts/process-images.js`). Only the 40px thumb, and the
 * unwatermarked master described below, skipped it. This module implements the CODE's behaviour —
 * all four marked, thumb unmarked — and the tests prove it by comparing decoded pixels rather
 * than by counting calls, because a comment is exactly what could not be trusted here.
 *
 * ---------------------------------------------------------------------------------------------
 * OD-9 · THIS MODULE EMITS NO UNWATERMARKED MASTER. THE ABSENCE IS THE ENFORCEMENT.
 *
 * (Option A, decided by Akhil in review on 2026-08-26; the resolutions block at the head of
 * `04-RESEARCH.md` § Open decisions is the record.)
 *
 * The legacy pipeline uploaded a fifth object per photograph — an unwatermarked 2000px master
 * under a key prefixed with the word "private" — and 04-04 measured all 39 of them returning
 * HTTP 200 with real image bytes to anyone who can derive the URL from the committed manifest.
 * That prefix is a PATH, not a permission: the bucket is fronted by a public custom domain.
 *
 * The exposure is pre-existing and was DEFERRED BY AKHIL to the cutover phase (Phase 8); this
 * module neither fixes it nor enlarges it. Akhil's source files live on his own disk and the
 * bucket was never a backup, so the new pipeline simply stops adding to the pile.
 *
 * There is therefore NO CODE PATH HERE THAT COMPOSES SUCH A KEY, and — the way
 * `src/schemas/photo.ts` says it about `tags` — the absence is the decision. Every key this
 * module emits is composed by `publishedKey()`, which can only produce the published prefix. The
 * assertion that carries the decision lives in the tests: `descriptors.length > 0` first, so an
 * empty list cannot satisfy it, then that no descriptor's key begins with that word.
 *
 * ---------------------------------------------------------------------------------------------
 * ONE LOSSY ENCODE PER VARIANT — A DELIBERATE DEPARTURE FROM THE LEGACY CODE SHAPE
 *
 * Legacy encoded each variant to WebP at the table's quality, then re-opened that WebP,
 * composited the mark and called `.toBuffer()` with no format method — which makes sharp re-encode
 * to WebP at ITS OWN DEFAULT quality. So the bytes actually served for all four live variants are
 * a second-generation encode at the default, and the "q85/85/85/80" in the requirement was never
 * true of the delivered file.
 *
 * Here the resize output is taken as RAW PIXELS, the mark is composited onto those pixels, and
 * WebP is encoded ONCE at the variant's own quality. Same visual specification, one generation of
 * loss instead of two, and the quality column of `VARIANTS` becomes true of the emitted bytes.
 * Raw is also what makes the mark's geometry exact: the SVG has to be the size of the resized
 * image, and `info.height` off the raw buffer is the real height rather than a rounded guess.
 *
 * ---------------------------------------------------------------------------------------------
 * SECURITY: THE BYTES ARE UNTRUSTED (T-04-28, T-04-29)
 *
 * They are whatever a dispatcher put in a staging bucket, and they are handed to a native decoder
 * on a runner that holds write credentials. Two controls, both asserted in the unit suite:
 *
 *   1. `MAX_SOURCE_BYTES` is checked BEFORE `sharp()` sees the buffer. The legacy `/api/upload`
 *      had a 25 MiB cap and an extension allowlist; the dispatch path this phase implements had
 *      NEITHER. The test feeds an oversized buffer that is not a valid image, so a failure naming
 *      the format instead of the limit would prove the order had been swapped.
 *   2. The format is allowlisted from what the DECODER reports, never from a filename. An
 *      extension is a claim; `metadata().format` is a magic-byte reading.
 *
 * `limitInputPixels` is left at sharp's default ON. DO NOT DISABLE IT. It is the only thing
 * standing between a 100-byte crafted header and an allocation of hundreds of megapixels, and a
 * large-image failure is a reason to ask why the image is that large, not a reason to remove the
 * guard.
 */

import sharp from 'sharp';
import {
  contentHash,
  OBJECT_CACHE_CONTROL,
  publishedKey,
  THUMB,
  VARIANTS,
} from '../../src/lib/photo-pipeline.ts';

/**
 * The shapes this module hands to `scripts/lib/photo-record.mjs` and to 04-09's uploader.
 *
 * Written as JSDoc rather than as a `.d.ts`: `astro check` type-checks this file (nothing under
 * `test/` or `scripts/` is excluded from `tsconfig.json`, deliberately — see the comment there),
 * so the consuming test file gets real types without this module ceasing to be plain JavaScript
 * that `node` can load.
 *
 * @typedef {{ width: number, height: number }} Dimensions
 * @typedef {{ bytes: Buffer, hash: string }} VariantAsset
 * @typedef {{ urlKey: string, suffix: string, width: number, height: number, bytes: Buffer }} EmittedVariant
 * @typedef {{ key: string, bytes: Buffer, contentType: string, cacheControl: string }} UploadDescriptor
 */

/* ==============================================================================================
 * 0. Refusals.
 * ============================================================================================ */

/** @param {string} message @returns {never} */
const fail = (message) => {
  throw new Error(`photo-derive: ${message}`);
};

/**
 * The byte cap, checked before the decoder is reached.
 *
 * 25 MiB, chosen because it is the SAME cap the legacy `/api/upload` route enforced
 * (`MAX_BYTES = 25 * 1024 * 1024`). Matching it means a file that could be staged through the
 * admin can also be processed by the pipeline — two different caps on the two halves of one
 * journey is a photograph that uploads and then silently never appears. The dispatch path had no
 * cap at all, which is the gap this closes.
 *
 * Raising it is a one-line change and needs a stated reason: the number is a policy about what a
 * runner is willing to decode, not a property of any camera.
 */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/**
 * What the DECODER must report for the bytes to be processed — never what a filename claims.
 *
 * Raster stills only. `svg` is deliberately absent: it is a document format with a script and an
 * external-entity surface, and nothing about a photograph needs it. `gif` is absent because an
 * animated source would be silently flattened to its first frame, which is a surprise rather than
 * a photograph.
 */
export const ALLOWED_SOURCE_FORMATS = Object.freeze([
  'jpeg',
  'png',
  'webp',
  'tiff',
  'avif',
  'heif',
]);

/** `image/webp` for every emitted object — `publishedKey` can only end in `.webp`. */
const PUBLISHED_CONTENT_TYPE = 'image/webp';

/** @param {Uint8Array} bytes @returns {Buffer} */
const toBuffer = (bytes) => (Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));

/**
 * Size and emptiness, BEFORE `sharp()` is called. Order is the control, not the cap alone.
 *
 * @param {unknown} bytes
 * @returns {Uint8Array}
 */
export function assertSourceBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    fail(
      `the source must be the staged object's bytes as a Uint8Array or Buffer. Got ${
        bytes === null ? 'null' : typeof bytes
      }.`
    );
  }
  if (bytes.length === 0) {
    fail('the source buffer is empty — zero bytes cannot be a photograph.');
  }
  if (bytes.length > MAX_SOURCE_BYTES) {
    fail(
      `the source is ${bytes.length} bytes, over the ${MAX_SOURCE_BYTES} byte cap. This is ` +
        'checked before the decoder is reached, so a crafted header cannot spend a runner on a ' +
        'decompression bomb. Raising the cap needs a stated reason.'
    );
  }
  return bytes;
}

/**
 * `YYYY-MM-DD`, and a day that exists.
 *
 * The grammar is RESTATED here rather than imported, because `scripts/lib/photo-record.mjs`
 * keeps its copy private and `src/schemas/photo.ts` cannot be loaded by plain `node` (its
 * extensionless import of `../lib/image-origin` resolves under Vite and not under Node's ESM
 * resolver — measured by 04-05). The duplication is safe in the direction that matters: this
 * check is strictly the same shape, and `buildRecord` re-asserts it as the last thing before a
 * commit, so a drift here can only be caught, never let through.
 *
 * Checked at the TOP of `deriveAssets`, before a single byte is decoded, for the reason this
 * whole half of the pipeline is arranged around: a value that will be refused later should be
 * refused before it has cost four encodes and four uploads.
 *
 * @param {unknown} date
 * @returns {string}
 */
export function assertIngestionDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(
      `ingestionDate must be a YYYY-MM-DD string — it is OD-10's FALLBACK, the value \`date\` ` +
        'takes when the source carries no EXIF capture date. Got ' +
        `${JSON.stringify(date ?? null)}.`
    );
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    fail(`ingestionDate ${JSON.stringify(date)} matches YYYY-MM-DD but is not a day that exists.`);
  }
  return date;
}

/* ==============================================================================================
 * 1. Reading the source once.
 * ============================================================================================ */

/**
 * Decode the header, allowlist the format and return the intrinsic size.
 *
 * The returned `dimensions` is the SOURCE size and is what a record carries (OD-11, written into
 * `src/schemas/photo.ts` by 04-02). It is deliberately NOT the size of the `original` variant:
 * `nature-fairwayreflections` is 4608x3072 in the committed manifest while its `original` serves
 * 2000x1333, and Phase 5 reserves layout space from the record.
 *
 * @param {Uint8Array} bytes
 * @returns {Promise<{ metadata: import('sharp').Metadata, format: string, dimensions: Dimensions }>}
 */
export async function readSource(bytes) {
  assertSourceBytes(bytes);

  let metadata;
  try {
    metadata = await sharp(toBuffer(bytes)).metadata();
  } catch (cause) {
    fail(
      `the source is not a decodable image — sharp refused it (${cause?.message ?? cause}). The ` +
        'format is read from the bytes, never from a filename.'
    );
  }

  const format = metadata?.format;
  if (!ALLOWED_SOURCE_FORMATS.includes(format)) {
    fail(
      `the source decodes as ${JSON.stringify(format ?? null)}, which is not one of the ` +
        `permitted formats (${ALLOWED_SOURCE_FORMATS.join(', ')}). This is an allowlist read ` +
        'from the decoder, not from an extension.'
    );
  }

  const { width, height } = metadata;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    fail(
      `the source reports intrinsic size ${JSON.stringify({ width, height })}, which cannot be ` +
        'ranked, resized or reserved for. A record needs two positive integers.'
    );
  }

  return { metadata, format, dimensions: { width, height } };
}

/* ==============================================================================================
 * 2. The watermark.
 * ============================================================================================ */

/** The mark itself. Lower case, and the same string the 39 live photographs carry. */
export const WATERMARK_TEXT = 'akhil saxena';

/**
 * `max(10, min(24, round(w * 0.01)))` — 20 at 2000 wide, floored to 10 from 800 down.
 *
 * The upper clamp is unreachable through `VARIANTS` (nothing is emitted wider than 2000) and is
 * kept anyway, because the rule belongs to the mark rather than to today's table. The unit suite
 * asserts it directly at 3000 so the whole rule is proven, not just the part the table exercises.
 *
 * @param {number} imageWidth @returns {number}
 */
export function watermarkFontSize(imageWidth) {
  return Math.max(10, Math.min(24, Math.round(imageWidth * 0.01)));
}

/**
 * `round(w * 0.015)` on both axes, from the bottom-right corner.
 *
 * @param {number} imageWidth @returns {number}
 */
export function watermarkInset(imageWidth) {
  return Math.round(imageWidth * 0.015);
}

/**
 * The overlay, sized to the WHOLE image so that a `gravity: 'center'` composite lands the text
 * exactly where the coordinates put it. Anchored bottom-right by `text-anchor="end"` plus the
 * inset, so the same SVG works at every variant width without a second layout rule.
 *
 * @param {number} imageWidth @param {number} imageHeight @returns {Buffer}
 */
export function watermarkSvg(imageWidth, imageHeight) {
  const size = watermarkFontSize(imageWidth);
  const inset = watermarkInset(imageWidth);
  return Buffer.from(
    `<svg width="${imageWidth}" height="${imageHeight}">` +
      `<text x="${imageWidth - inset}" y="${imageHeight - inset}" ` +
      `font-family="monospace" font-size="${size}" font-weight="400" ` +
      'fill="rgba(255,255,255,0.20)" text-anchor="end" dominant-baseline="auto" ' +
      `letter-spacing="0.08em">${WATERMARK_TEXT}</text></svg>`,
    'utf8'
  );
}

/**
 * Composite the mark onto a sharp pipeline and return the pipeline.
 *
 * PIPELINE IN, PIPELINE OUT — deliberately, and it is the whole reason a variant costs one lossy
 * encode instead of two. Taking a buffer would force this function to decode and the caller to
 * re-encode. The caller decides the output format and quality; this decides only what the image
 * looks like.
 *
 * @template {{ composite: (arg: object[]) => T }} T
 * @param {T} pipeline
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {T}
 */
export function addWatermark(pipeline, imageWidth, imageHeight) {
  return pipeline.composite([{ input: watermarkSvg(imageWidth, imageHeight), gravity: 'center' }]);
}

/* ==============================================================================================
 * 3. The four variants, and the LQIP.
 * ============================================================================================ */

/**
 * One entry per row of `VARIANTS`, in that order.
 *
 * `withoutEnlargement: true` AND `Math.min(maxWidth, sourceWidth)` — both, as legacy had them.
 * Either alone is enough today; together they mean a source narrower than the smallest variant
 * comes back at its own width from four different directions rather than one.
 *
 * `watermark: false` exists so the unit suite can derive the same variant twice and compare the
 * BYTES. It is a test seam with one honest use, and the name says what it does.
 *
 * `.toColourspace('srgb')` before `.raw()` is not decoration: a CMYK source would otherwise hand
 * back four raw bands that the re-open would read as RGBA.
 *
 * @param {Uint8Array} bytes  the SOURCE bytes, read once by the caller
 * @param {number} sourceWidth  the source's intrinsic width, from `readSource`
 * @param {{ watermark?: boolean }} [options]
 * @returns {Promise<EmittedVariant[]>}
 */
export async function buildVariants(bytes, sourceWidth, options = {}) {
  const watermark = options.watermark !== false;
  const source = toBuffer(bytes);
  /** @type {EmittedVariant[]} */
  const emitted = [];

  for (const variant of VARIANTS) {
    const target = Math.min(variant.maxWidth, sourceWidth);
    const { data, info } = await sharp(source)
      .resize({ width: target, withoutEnlargement: true })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const decoded = sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    });
    const composed = watermark ? addWatermark(decoded, info.width, info.height) : decoded;

    emitted.push({
      urlKey: variant.urlKey,
      suffix: variant.suffix,
      width: info.width,
      height: info.height,
      bytes: await composed.webp({ quality: variant.quality }).toBuffer(),
    });
  }

  return emitted;
}

/**
 * The LQIP, as the inline data URI `PhotoUrlsSchema` enforces. NO WATERMARK — at `THUMB.width`
 * the mark would be an illegible smear over most of the image, and the thumb is a blur placeholder
 * rather than a published asset. It carries no hostname, which is why an origin migration never
 * has to rewrite it.
 *
 * @param {Uint8Array} bytes
 * @returns {Promise<string>} the `data:image/webp;base64,…` URI
 */
export async function buildThumb(bytes) {
  const encoded = await sharp(toBuffer(bytes))
    .resize({ width: THUMB.width, withoutEnlargement: true })
    .webp({ quality: THUMB.quality })
    .toBuffer();
  return `${THUMB.dataUriPrefix}${encoded.toString('base64')}`;
}

/* ==============================================================================================
 * 4. The whole derivation.
 * ============================================================================================ */

/**
 * Everything `scripts/lib/photo-record.mjs` needs from an image, from ONE read of the bytes.
 *
 * Returns `{ slug, category, dimensions, variants, thumb, descriptors }`:
 *
 *   - `variants` is keyed by `urlKey` with `{ bytes, hash }`, the shape `buildRecord` consumes.
 *     EACH HASH IS TAKEN FROM ITS OWN EMITTED BUFFER. Hashing the source once and stamping it on
 *     all four looks right and defeats CONT-05 for three of them: a re-encode at a new quality
 *     changes `-lg` and `-sm` while the source stays byte-identical, so those two would keep
 *     their old URLs behind the zone's measured four-hour browser cache.
 *   - `descriptors` is what 04-09 uploads: `{ key, bytes, contentType, cacheControl }` per
 *     variant, keys composed only by `publishedKey`. The record and the uploader therefore
 *     address the same objects by construction.
 *
 * A source narrower than the smallest variant produces four variants of identical bytes, so three
 * of the four hashes COINCIDE. That is correct and not a collision to fix: the keys still differ
 * by suffix, so the four URLs are distinct and each resolves to the object written under it.
 *
 * @param {{ bytes?: Uint8Array, category?: string, slug?: string, ingestionDate?: string }} args
 * @returns {Promise<{ slug: string, category: string, ingestionDate: string,
 *   dimensions: Dimensions, variants: Record<string, VariantAsset>, thumb: string,
 *   descriptors: UploadDescriptor[] }>}
 */
export async function deriveAssets({ bytes, category, slug, ingestionDate } = {}) {
  if (typeof category !== 'string' || category.length === 0) {
    fail(`category must be a non-empty string. Got ${JSON.stringify(category ?? null)}.`);
  }
  if (typeof slug !== 'string' || slug.length === 0) {
    fail(`slug must be a non-empty string. Got ${JSON.stringify(slug ?? null)}.`);
  }
  assertIngestionDate(ingestionDate);

  const { dimensions } = await readSource(bytes);
  const emitted = await buildVariants(bytes, dimensions.width);
  const thumb = await buildThumb(bytes);

  /** @type {Record<string, VariantAsset>} */
  const variants = {};
  /** @type {UploadDescriptor[]} */
  const descriptors = [];
  for (const variant of emitted) {
    const hash = contentHash(variant.bytes);
    variants[variant.urlKey] = { bytes: variant.bytes, hash };
    descriptors.push({
      key: publishedKey({ category, slug, hash, suffix: variant.suffix }),
      bytes: variant.bytes,
      contentType: PUBLISHED_CONTENT_TYPE,
      cacheControl: OBJECT_CACHE_CONTROL,
    });
  }

  return { slug, category, ingestionDate, dimensions, variants, thumb, descriptors };
}
