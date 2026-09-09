import { createHash } from 'node:crypto';
import { IMAGE_ORIGIN } from './image-origin.ts';
import { PHOTO_ID_SEPARATOR, VARIANTS } from './photo-variants.ts';

const escapeForRegExp = (literal: string): string => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SLUG_SOURCE = '[a-z0-9-]+';
const SLUG_RE = new RegExp(`^${SLUG_SOURCE}$`);

const quoteForError = (value: unknown): string => {
  const text = typeof value === 'string' ? value : String(value);
  return JSON.stringify(text.length > 200 ? `${text.slice(0, 200)}…` : text);
};

const assertSlugLike = (value: string, label: string): void => {
  if (!SLUG_RE.test(value)) {
    throw new Error(
      `photo-pipeline: ${label} must match ${SLUG_RE.source} — the same slug grammar ` +
        `src/schemas/photo.ts enforces, so a key composed here is a key the schema will ` +
        `accept. Got ${quoteForError(value)}.`
    );
  }
};

export const STAGING_BUCKET = 'portfolio-photos';

export const STAGING_EXPIRE_DAYS = 7;

export const STAGING_PREFIX = 'temp/';

const STAGING_SEGMENT = '[A-Za-z0-9][A-Za-z0-9._-]*';

export const STAGING_KEY_RE = new RegExp(
  `^${escapeForRegExp(STAGING_PREFIX)}${STAGING_SEGMENT}(?:/${STAGING_SEGMENT})*$`
);

export const STAGING_KEY_MAX_LENGTH = 1024;

export function assertStagingKey(key: unknown): asserts key is string {
  if (typeof key !== 'string') {
    throw new Error(
      `photo-pipeline: staging key must be a string beginning with ${JSON.stringify(
        STAGING_PREFIX
      )}. Got ${typeof key}.`
    );
  }
  const byteLength = new TextEncoder().encode(key).length;
  if (byteLength > STAGING_KEY_MAX_LENGTH) {
    throw new Error(
      `photo-pipeline: staging key exceeds ${STAGING_KEY_MAX_LENGTH} UTF-8 bytes, which R2 ` +
        `refuses. Got ${byteLength} bytes.`
    );
  }
  if (!STAGING_KEY_RE.test(key)) {
    throw new Error(
      `photo-pipeline: ${quoteForError(key)} is not a staging key. It must match ` +
        `${STAGING_KEY_RE.source} — rooted at ${JSON.stringify(STAGING_PREFIX)}, with at least ` +
        `one segment after it, every segment starting with an alphanumeric so that "..", a ` +
        `leading "/", a backslash and a different case of the prefix are all unmatchable.`
    );
  }
}

export const PUBLISHED_PREFIX = 'photos/';

export const CONTENT_HASH_BYTES = 4;

export const CONTENT_HASH_HEX_LENGTH = CONTENT_HASH_BYTES * 2;

export const CONTENT_HASH_RE = new RegExp(`^[0-9a-f]{${CONTENT_HASH_HEX_LENGTH}}$`);

export function contentHash(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, CONTENT_HASH_HEX_LENGTH);
}

const assertContentHash = (hash: string): void => {
  if (!CONTENT_HASH_RE.test(hash)) {
    throw new Error(
      `photo-pipeline: hash must match ${CONTENT_HASH_RE.source} — ` +
        `${CONTENT_HASH_HEX_LENGTH} lower-case hex characters, exactly what contentHash() ` +
        `returns. Got ${quoteForError(hash)}. Do not slice contentHash()'s output; ` +
        `CONTENT_HASH_BYTES is a BYTE count, not a character count.`
    );
  }
};

/* ==============================================================================================
 * 3. THE VARIANT TABLE — MOVED, NOT COPIED.  (plan 05-05, Task 1)
 *
 *    `VARIANTS`, `THUMB` and their two types now live in `src/lib/photo-variants.ts`, which has
 *    ZERO `node:` imports, and are RE-EXPORTED from here so every existing importer — the five
 *    `.mjs` Actions scripts, six Phase 4 plans and the contract test — is unaffected and there is
 *    still exactly ONE definition of the numbers.
 *
 *    WHY: prerendered public pages need the table, and importing it from this module drags
 *    `node:crypto` into a page's graph. `05-UI-SPEC.md` §7.4 named this fix and §5.3 assertion 5
 *    requires the boundary to be PROVABLE rather than currently-true. The measurement that
 *    prompted it — the probe DID build, which is the hazard, not the reassurance — is recorded in
 *    `photo-variants.ts`'s header along with the rationale comments, which travelled with the
 *    constants they explain.
 *
 *    The contract test asserts the re-exported objects are REFERENTIALLY IDENTICAL (`toBe`) to the
 *    ones declared there, and that this file re-declares none of them. A second copy would satisfy
 *    `toEqual` and is exactly what the move exists to make impossible.
 * ============================================================================================ */

export type { VariantTable, VariantTableFor } from './photo-variants.ts';
export { PHOTO_ID_SEPARATOR, THUMB, VARIANTS } from './photo-variants.ts';

/** `-lg|-md|-sm|` — longest first so the alternation is greedy, empty suffix last. */
const SUFFIX_ALTERNATION = VARIANTS.map((variant) => variant.suffix)
  .slice()
  .sort((a, b) => b.length - a.length)
  .map(escapeForRegExp)
  .join('|');

const KNOWN_SUFFIXES: readonly string[] = VARIANTS.map((variant) => variant.suffix);

const assertKnownSuffix = (suffix: string): void => {
  if (!KNOWN_SUFFIXES.includes(suffix)) {
    throw new Error(
      `photo-pipeline: ${quoteForError(suffix)} is not a variant suffix. The four are ` +
        `${KNOWN_SUFFIXES.map((s) => JSON.stringify(s)).join(', ')}, from VARIANTS.`
    );
  }
};

/* ==============================================================================================
 * 4. Composing and decomposing a published key.
 * ============================================================================================ */

/** The four fields of a published key. */
export type PublishedKeyParts = {
  readonly category: string;
  readonly slug: string;
  readonly hash: string;
  readonly suffix: string;
};

/**
 * `photos/<category>/<slug>-<hash8><suffix>.webp`  (OD-1 option A.)
 *
 * The one composer. 04-05, 04-07 and 04-09 call this; none of them builds a key from string
 * concatenation, so the scheme cannot be half-changed.
 */
export function publishedKey(parts: PublishedKeyParts): string {
  assertSlugLike(parts.category, 'category');
  assertSlugLike(parts.slug, 'slug');
  assertContentHash(parts.hash);
  assertKnownSuffix(parts.suffix);
  return `${PUBLISHED_PREFIX}${parts.category}/${parts.slug}-${parts.hash}${parts.suffix}.webp`;
}

/**
 * The inverse. Built from the same constants as `publishedKey`, so the pair cannot drift.
 *
 * The `slug` group is `[a-z0-9-]+` and GREEDY, which is what resolves the only real ambiguity:
 * a slug that itself ends in something hash-shaped (`landscape-deadbeef`) or suffix-shaped
 * (`pano-lg`). Greedy means the LAST `-<hash8>` in the basename is read as the hash, which is
 * where `publishedKey` put it.
 */
export const PUBLISHED_KEY_RE = new RegExp(
  `^${escapeForRegExp(PUBLISHED_PREFIX)}(${SLUG_SOURCE})/(${SLUG_SOURCE})-` +
    `([0-9a-f]{${CONTENT_HASH_HEX_LENGTH}})(${SUFFIX_ALTERNATION})\\.webp$`
);

export function parsePublishedKey(key: string): PublishedKeyParts {
  const match = PUBLISHED_KEY_RE.exec(key);
  if (match === null) {
    throw new Error(
      `photo-pipeline: ${quoteForError(key)} is not a published key. It must match ` +
        `${PUBLISHED_KEY_RE.source}.`
    );
  }
  return { category: match[1], slug: match[2], hash: match[3], suffix: match[4] };
}

/** The recoverable half of the NEW id invariant — see `photoIdFor`. */
export function slugFromPublishedKey(key: string): string {
  return parsePublishedKey(key).slug;
}

/**
 * The absolute URL of a published key, composed from `IMAGE_ORIGIN` (OD-3).
 *
 * There is no hostname literal in this file. `PhotoSchema` compares `new URL(value).origin` to
 * `IMAGE_ORIGIN` for EQUALITY rather than by prefix — `https://HOST.evil.test/` and
 * `https://HOST@evil.test/` both defeat a `startsWith` — and the contract test asserts this
 * function's output satisfies that comparison, not merely that it starts with the right
 * characters.
 */
export function publishedUrl(key: string): string {
  parsePublishedKey(key);
  return `${IMAGE_ORIGIN}/${key}`;
}

/**
 * What a published object's `Cache-Control` is set to at PutObject (OD-1 option A).
 *
 * A1 CAVEAT, and it does not block OD-1 A: whether the R2 custom domain RE-EMITS an object's
 * own `Cache-Control` in place of the zone's `max-age=14400` is `[ASSUMED]` — it is not stated
 * on any first-party page found. 04-10 measures it with one `wrangler r2 object put
 * --cache-control` followed by a GET (never a HEAD: HEAD returns `DYNAMIC` with no
 * `cache-control` at all and will mislead). Option A is correct either way, because the URL
 * itself changes when the bytes change; only the `immutable` claim is provisional until that
 * measurement lands.
 */
export const OBJECT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/* ==============================================================================================
 * 5. The record id — two eras, both written down.
 * ============================================================================================ */

/**
 * `id === category + "-" + slug`.
 *
 * THE OLD INVARIANT, measured true on 39/39 pre-hash records and asserted NOWHERE:
 *     id === category + "-" + basename(urls.original, ".webp")
 * OD-1 option A breaks it on purpose — a hashed basename is `<slug>-<hash8>`, so the old
 * derivation would produce `landscape-riverbend-a1b2c3d4`.
 *
 * THE NEW INVARIANT, which replaces it:
 *     id === category + "-" + slug,  where slug is recoverable via slugFromPublishedKey()
 * Both are recorded here so that nobody, reading one era's data, re-derives the other era's
 * rule. `id` still has to satisfy `/^[a-z0-9-]+$/` in `src/schemas/photo.ts`, which is why
 * `category` and `slug` are both asserted against that grammar before they are joined.
 *
 * `PHOTO_ID_SEPARATOR` itself is DECLARED in `src/lib/photo-variants.ts` and re-exported from §3,
 * because the public routes have to run this join BACKWARDS — `PhotoSchema` has no `slug` field,
 * so `/photography/<category>/<slug>` is derived from the id at prerender time, in workerd, where this
 * module cannot go. That inverse is `photoSlug` in `src/lib/photo-srcset.ts` and it reads the same
 * separator constant, so the two directions cannot disagree.
 */
export function photoIdFor(parts: { readonly category: string; readonly slug: string }): string {
  assertSlugLike(parts.category, 'category');
  assertSlugLike(parts.slug, 'slug');
  return `${parts.category}${PHOTO_ID_SEPARATOR}${parts.slug}`;
}

/* ==============================================================================================
 * 6. THE DISPATCH INTERFACE.  (OD-2, OD-2b)
 * ============================================================================================ */

export type DispatchInput = {
  readonly name: string;
  readonly required: boolean;
  readonly description: string;
};

/**
 * The `workflow_dispatch` interface, in declaration order.
 *
 * 04-08 GENERATES the workflow's `inputs:` block from this array and asserts the parsed YAML's
 * key order equals `DISPATCH_INPUTS.map(i => i.name)`; 04-09's entrypoint reads argv against the
 * same array. Neither can drift from the other, because neither owns the list.
 *
 * `alt` is required (OD-2 A) and validated by `altRefusalReason` BEFORE any R2 read, so a bad
 * value costs one workflow start and no bytes.
 */
export const DISPATCH_INPUTS = [
  {
    name: 'temp_key',
    required: true,
    description:
      'R2 key of the staged upload, rooted at the staging prefix. Validated by ' +
      'assertStagingKey before any object is read.',
  },
  {
    name: 'category',
    required: true,
    description:
      'Existing category id from data/site_config.json. A lowercase slug; it is compared to ' +
      'the real id set with no case transform on either side.',
  },
  {
    name: 'title',
    required: true,
    description: 'Human title for the photograph, as it appears in the gallery.',
  },
  {
    name: 'alt',
    required: true,
    description:
      'Alt text, written from looking at the photograph. The entire non-visual experience of ' +
      'the gallery — the public pages ship no JavaScript, so nothing else can supply a ' +
      'description later. Placeholder-shaped values are refused (OD-2b). Pass it from a file ' +
      'with `-F alt=@alt.txt` if it is long.',
  },
  {
    name: 'place',
    required: false,
    description: 'Optional place name. Omitted rather than empty when unknown.',
  },
] as const satisfies readonly DispatchInput[];

/* ---------------------------------------------------------------------------------------------
 * OD-2b — the placeholder refusal.
 * ------------------------------------------------------------------------------------------- */

/**
 * The floor on `alt` length, in characters after trimming.
 *
 * MEASURED on the 39 reviewed values (2026-08-27): the SHORTEST real `alt` is 83 characters and
 * the longest is 159. So this floor sits ~5.5x below the shortest string a human has actually
 * written for this gallery — chosen to catch `TODO`-class stubs and typo fragments, not to
 * legislate a house style. It is deliberately not raised to anywhere near 83: a future short but
 * genuine caption must not be refused by a rule tuned to today's corpus.
 */
export const ALT_MIN_LENGTH = 15;

/**
 * Refused when the WHOLE trimmed, lower-cased value equals one of these.
 *
 * WHOLE-VALUE, NEVER SUBSTRING, and that is the entire reason this rule is safe: `photo`,
 * `image`, `picture` and `alt` are ordinary English words that appear inside legitimate captions
 * ("Photo taken from the fort wall at dusk"; "Altocumulus banked over the ridge"). A substring
 * test would reject real alt text, and a refusal that rejects real alt text is worse than no
 * refusal at all. The contract test proves those captions PASS.
 */
export const ALT_PLACEHOLDER_EXACT: readonly string[] = [
  'todo',
  'tbd',
  'fixme',
  'xxx',
  '???',
  'alt',
  'photo',
  'image',
  'picture',
];

/**
 * Refused when the value OPENS with one of these AND the next thing is punctuation — i.e.
 * `TODO:`, `TBD -`, `FIXME —`, `XXX/`, with optional whitespace before the mark.
 *
 * WHY ONLY THESE FOUR, AND WHY ONLY BEFORE PUNCTUATION. Two boundaries, both found by trying to
 * walk through this rule rather than by imagining how it might fail:
 *
 *   1. `photo`, `image`, `picture` and `alt` are NOT here, only in the exact list, because a
 *      caption may legitimately OPEN with any of them: "Photo taken from the fort wall at dusk".
 *   2. The punctuation requirement exists because "Todo el mundo crowds the square at sunset"
 *      is a legitimate caption that opens with the letters `todo` followed by a SPACE. Refusing
 *      token-then-space would reject it, and a refusal that rejects real alt text is worse than
 *      no refusal at all.
 *
 * RESIDUAL HOLE, RECORDED RATHER THAN PAPERED OVER: `"TODO add real alt text here"` — a marker
 * token, a space, a letter, and 27 characters — is invisible to this rule. Closing it means
 * refusing "Todo el mundo …", which is the trade above. Tier 1 still catches the overwhelmingly
 * common form (the bare token), `ALT_MIN_LENGTH` catches short fragments, and `PhotoSchema` is
 * the last line on the committed record.
 *
 * MEASURED 2026-08-27: no value among the 39 reviewed `alt` strings opens with any of these four.
 */
export const ALT_PLACEHOLDER_LEADING: readonly string[] = ['todo', 'tbd', 'fixme', 'xxx'];

/** What must follow a leading marker token for it to be a marker rather than a word. */
const MARKER_DELIMITER = /^\s*[:\-–—/.!,;)\]]/;

/** Collapse for comparison only. The submitted value is never rewritten. Mirrors the
 * normalisation `src/schemas/photo.ts` applies for its own alt rules; that module stays the
 * authority on the committed record, and this is a pre-flight whose only job is to fail earlier
 * and cheaper — before an R2 read, before a commit, before CI goes red on `main`. */
const normaliseAlt = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** Strip trailing punctuation so `TODO.` and `TBD!` are not a way through tier 1. */
const stripEdgePunctuation = (value: string): string =>
  value.replace(/^[\s.,:;!]+|[\s.,:;!]+$/g, '');

/**
 * `null` when `alt` is publishable; otherwise ONE sentence naming what was wrong, for the
 * workflow to print. A pure function returning the reason (rather than only throwing) so the
 * validator can report every bad input in one pass, and so this rule is testable without
 * try/catch. `assertPublishableAlt` is the throwing form.
 *
 * `filename` and `title` are compared because both are the values a hurried dispatch pastes into
 * the `alt` field. The title comparison DUPLICATES a `PhotoSchema` rule on purpose: the schema
 * catches it after the bytes are derived and the manifest is written, and this catches it before
 * anything is read. Duplication in the safe direction — this refusing something the schema would
 * accept is impossible by construction, since every rule here is strictly narrower.
 */
export function altRefusalReason(candidate: {
  readonly alt: unknown;
  readonly title?: string;
  readonly filename?: string;
}): string | null {
  if (typeof candidate.alt !== 'string') {
    return `alt is required and must be a string; got ${typeof candidate.alt}.`;
  }

  const trimmed = candidate.alt.trim();
  if (trimmed.length === 0) {
    return 'alt is empty or whitespace only — a screen reader announces nothing.';
  }

  const normalised = normaliseAlt(trimmed);
  const bare = stripEdgePunctuation(normalised);

  if (ALT_PLACEHOLDER_EXACT.includes(bare)) {
    return (
      `alt is the placeholder ${JSON.stringify(trimmed)}. A screen reader would announce ` +
      `exactly that. Write what the photograph shows (OD-2b).`
    );
  }

  for (const token of ALT_PLACEHOLDER_LEADING) {
    if (bare.startsWith(token) && MARKER_DELIMITER.test(bare.slice(token.length))) {
      return (
        `alt opens with the placeholder marker "${token}" — ${JSON.stringify(trimmed)} is a ` +
        `note to yourself, not a description of the photograph (OD-2b).`
      );
    }
  }

  if (trimmed.length < ALT_MIN_LENGTH) {
    return (
      `alt is ${trimmed.length} characters; the floor is ${ALT_MIN_LENGTH}. The 39 reviewed ` +
      `values run 83–159 characters, so a value this short is a stub rather than a short ` +
      `description (OD-2b).`
    );
  }

  if (candidate.title !== undefined && normalised === normaliseAlt(candidate.title)) {
    return (
      `alt duplicates the title ${JSON.stringify(candidate.title)}. Compared case- and ` +
      `whitespace-insensitively, because "Into The Mist" and "into the mist" are the same ` +
      `non-description. src/schemas/photo.ts refuses this too, later and more expensively.`
    );
  }

  if (candidate.filename !== undefined) {
    const stem = candidate.filename.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
    if (normalised === normaliseAlt(candidate.filename) || normalised === normaliseAlt(stem)) {
      return (
        `alt is the file name ${JSON.stringify(candidate.filename)}. A camera's file name ` +
        `describes nothing (OD-2b).`
      );
    }
  }

  return null;
}

export function assertPublishableAlt(candidate: {
  readonly alt: unknown;
  readonly title?: string;
  readonly filename?: string;
}): void {
  const reason = altRefusalReason(candidate);
  if (reason !== null) {
    throw new Error(`photo-pipeline: ${reason}`);
  }
}

export const PUBLISH_BRANCH = 'main';

export const PUBLISH_RETRY_LIMIT = 3;
