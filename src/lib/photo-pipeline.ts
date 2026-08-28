/**
 * The ONE definition of how a photograph becomes a URL, and of how the pipeline is asked to
 * make one. (Phase 4, plan 04-02 — the interface-first plan.)
 *
 * Modelled on `src/lib/image-origin.ts`: this file is the only place in the repository that
 * says
 *
 *   - what the STAGING prefix and bucket are (`STAGING_PREFIX`, `STAGING_BUCKET`),
 *   - what a PUBLISHED object key looks like (`PUBLISHED_PREFIX`, `publishedKey`),
 *   - what `Cache-Control` a published object carries (`OBJECT_CACHE_CONTROL`),
 *   - what the `workflow_dispatch` interface is called (`DISPATCH_INPUTS`),
 *   - what a publishable `alt` may not be (`altRefusalReason`),
 *   - where the pipeline commits and how often it retries (`PUBLISH_BRANCH`,
 *     `PUBLISH_RETRY_LIMIT`).
 *
 * ONE THING IT NO LONGER SAYS ITSELF, and the amendment is the point rather than a footnote.
 * **The variant table is no longer declared here.** `VARIANTS`, `THUMB`, `PHOTO_ID_SEPARATOR` and
 * the two `VariantTable*` types moved DOWN into `src/lib/photo-variants.ts`, a module with zero
 * `node:` imports, and are RE-EXPORTED from §3 below. So this file is still the one definition of
 * everything EXCEPT the table — of which there is still exactly one definition, one file down.
 *
 * WHY, since nothing here was broken: prerendered public pages need those numbers, and importing
 * them from this module puts `node:crypto` in a page's module graph. `05-UI-SPEC.md` §7.4 named
 * the fix ("never a second copy of the numbers") and §5.3 assertion 5 requires that boundary to be
 * PROVABLE rather than currently-true. Plan 05-05 measured it first: a probe page importing
 * `VARIANTS` from here BUILT CLEANLY and shipped no `node:crypto` to `dist/client`. That is the
 * hazard, not the reassurance — `wrangler.jsonc` sets `nodejs_compat`, so the mistake this header
 * warns about two paragraphs down would succeed quietly. The full measurement is in
 * `photo-variants.ts`'s header, with the OD-1 / OD-11 rationale that travelled with the constants.
 *
 * Plans 04-05, 04-06, 04-07, 04-08, 04-09 and 04-10 IMPORT from here. None of them re-derives
 * any of it. A constant whose rationale lives in a plan file is one nobody can evaluate in two
 * years, so every decision below carries its OD number and the measurement behind it, here, in
 * the file.
 *
 * ---------------------------------------------------------------------------------------------
 * THE DECISIONS THIS MODULE ENCODES  (all taken by Akhil in review on 2026-08-26; the
 * resolutions block at the head of `04-RESEARCH.md` § Open decisions is the record)
 *
 * OD-1 · CACHE VERSIONING = CONTENT-HASHED KEYS (option A).
 *   Measured in 04-RESEARCH §4: a GET of an existing photo returns `cf-cache-status: HIT` with
 *   `cache-control: max-age=14400` — a FOUR-HOUR BROWSER cache injected by the zone, not by the
 *   R2 object (the object carries no `Cache-Control` of its own). No server-side purge can reach
 *   a browser cache that already holds that. So the only fix that works is a URL that changes
 *   when the bytes do: `photos/<category>/<slug>-<hash8><suffix>.webp`. This is also the PIPE-04
 *   half of the argument — bytes at a URL never change, so a re-run cannot half-overwrite an
 *   object a live page is reading.
 *   Costs, recorded rather than glossed: superseded objects stay in the bucket on a re-upload,
 *   and the OLD id invariant breaks (see PHOTO_ID_SEPARATOR, re-exported in §3 below and
 *   declared in `photo-variants.ts`).
 *
 * OD-2 · `alt` IS A REQUIRED `workflow_dispatch` INPUT (option A), validated BEFORE any R2 read
 *   so a bad value costs nothing. `alt` cannot be machine-generated: all 39 existing values were
 *   written from viewing the photographs and reviewed on 2026-08-23, and the public gallery ships
 *   zero framework JS, so `alt` is the entire non-visual experience of the gallery.
 *   `gh workflow run -F alt=@alt.txt` reads the value from a file, so length is not a constraint.
 *
 * OD-2b · PLACEHOLDER-SHAPED `alt` IS REFUSED. New requirement, asked for explicitly in the same
 *   review, and it closes a MEASURED gap rather than a hypothetical one: `alt: "TODO"` passes
 *   `min(1)` and all four of `PhotoSchema`'s `superRefine` rules (04-08 Task 3 asserts exactly
 *   that), so without this refusal a hurried dispatch ships a photograph announced to a screen
 *   reader as "TODO" and nothing else in the phase stops it. See `altRefusalReason`, whose
 *   comment carries the false-positive reasoning — a refusal that rejects real alt text would be
 *   worse than no refusal at all.
 *
 * OD-3 · THE PIPELINE NEVER READS `R2_PUBLIC_URL` (option A). It imports `IMAGE_ORIGIN` from
 *   `src/lib/image-origin.ts`, whose header states it is the only place the hostname is written,
 *   so this module structurally CANNOT emit a non-canonical origin — there is no hostname literal
 *   in this file, and plan 04-02's `done` greps for its absence — the hostname is not even spelled
 *   in the paragraph you are reading, because the contract test asserts its absence from the whole
 *   file rather than from the code half. The secret is dated 2026-03-28, five months before the
 *   custom image domain was provisioned, so it very likely still holds the legacy value; and no
 *   gate in this repository can see a wrong value INSIDE a secret, because a workflow contains a
 *   reference, not a literal. Whether the secret is deleted is a `user_setup` item in 04-10, not
 *   something this module can do.
 *
 * OD-6 · STAGING PREFIX = `temp/` (option A), matching the legacy `/api/dispatch` contract. The
 *   lifecycle rule (`--expire-days STAGING_EXPIRE_DAYS`) is created ONCE by Akhil in 04-10 and
 *   asserted thereafter by comparing the rule's prefix to `STAGING_PREFIX` byte-for-byte. R2
 *   lifecycle granularity is DAYS and removal lags up to 24 h, so expiry cannot be observed
 *   inside a session; "a lifecycle rule exists" would pass against a rule scoped to the wrong
 *   prefix, which is why the assertion is on the prefix and never on a deletion.
 *
 * OD-7 · THE PIPELINE COMMITS DIRECTLY TO `main` (option A) with a bounded
 *   re-derive-and-retry — never a rebase, never a force. A textual rebase of an appended JSON
 *   array element is a conflict waiting to happen and resolves `order` incorrectly even when it
 *   succeeds. See `PUBLISH_BRANCH` / `PUBLISH_RETRY_LIMIT`; the loop itself is 04-06's.
 *
 * OD-11 · `dimensions` IS THE INTRINSIC SIZE OF THE SOURCE, not of `urls.original`. The contract
 *   is written where the field is declared — `src/schemas/photo.ts`, above
 *   `PhotoDimensionsSchema` — because that is where a reader looks for it.
 *
 * ---------------------------------------------------------------------------------------------
 * WHERE THIS MODULE RUNS, AND WHY THAT CONSTRAINS ITS IMPORTS
 *
 * It runs on a NODE RUNNER inside GitHub Actions, imported from `scripts/**` the same way
 * `scripts/assert-no-r2dev-urls.mjs` already imports `src/lib/image-origin.ts` — by relative path
 * WITH the `.ts` extension, resolved by Node 22's built-in type stripping, no bundler involved.
 *
 * That is why the import below carries `.ts`, and it is also why this file does NOT import from
 * `src/schemas/photo.ts`. MEASURED 2026-08-27, plain `node` against this repository:
 *
 *     import { PhotoUrlsSchema } from 'src/schemas/photo.ts'
 *     → ERR_MODULE_NOT_FOUND: .../src/lib/image-origin
 *
 * `photo.ts` imports the origin EXTENSIONLESS (`'../lib/image-origin'`), which Vite and
 * `astro check` resolve and Node's ESM resolver does not. So an import of `photo.ts` from here
 * would make every wave-5 Actions script unloadable, and adding the extension inside `photo.ts`
 * would break `test/content/schemas.unit.test.ts`'s assertion that the import path ends at
 * `lib/image-origin`. The thumb-prefix agreement is therefore asserted in the CONTRACT TEST,
 * which runs under Vitest and can import both sides — see `THUMB` and plan 04-02's SUMMARY.
 *
 * `node:crypto` is imported here and nowhere else under `src/`. Nothing under `src/` imports this
 * module — `photo-variants.ts` is a LEAF that this file imports, never the reverse, which is what
 * lets a prerendered page reach the table without reaching this file — so it never enters the
 * Worker bundle; the contract test asserts that boundary, because
 * `wrangler.jsonc` sets `nodejs_compat`, which means an accidental import would NOT fail loudly —
 * it would just quietly ship the pipeline into the Worker.
 */

import { createHash } from 'node:crypto';
import { IMAGE_ORIGIN } from './image-origin.ts';
import { PHOTO_ID_SEPARATOR, VARIANTS } from './photo-variants.ts';

/* ==============================================================================================
 * 0. Small shared helpers. Regexes are BUILT from the constants below rather than typed out, so
 *    a constant and the pattern that validates it cannot disagree.
 * ============================================================================================ */

/** Escape a literal for inclusion in a `RegExp` source. */
const escapeForRegExp = (literal: string): string => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The slug grammar, character for character the one `src/schemas/photo.ts` enforces on `id`,
 * `category` and (through them) `slug`. It is spelled here as a SOURCE FRAGMENT because these
 * patterns are composed into the published-key pattern; the schema stays the authority on the
 * committed record, and the contract test asserts the two agree rather than assuming it.
 */
const SLUG_SOURCE = '[a-z0-9-]+';
const SLUG_RE = new RegExp(`^${SLUG_SOURCE}$`);

/** Keep a hostile value out of an error message at full length. */
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

/* ==============================================================================================
 * 1. STAGING — where an upload waits before the pipeline reads it.  (OD-6)
 * ============================================================================================ */

/**
 * The R2 bucket both halves of the pipeline use. Its single other source is `wrangler.jsonc`
 * (`"r2_buckets": [{ "binding": "PORTFOLIO_BUCKET", "bucket_name": … }]`) and the contract test
 * reads that file and asserts the two are byte-equal — so this is a shared constant, not a second
 * source of truth. Exported in WAVE 1 on purpose: 04-10 needs it, and a wave-5 plan adding an
 * export to a wave-1 file would be a backwards dependency.
 */
export const STAGING_BUCKET = 'portfolio-photos';

/**
 * The staging TTL, in days, that 04-10's lifecycle assertion compares against — so the assertion
 * reads a constant rather than an unsourced `7`. Granularity is days and removal lags up to 24 h
 * (see OD-6 in the header): the rule's PREFIX is what is asserted, never a deletion.
 */
export const STAGING_EXPIRE_DAYS = 7;

/**
 * The staging prefix. The workflow, the input validator, the delete step and the lifecycle
 * assertion all read THIS string. Nothing else may spell it.
 */
export const STAGING_PREFIX = 'temp/';

/**
 * One path segment of a staging key: it must START with an alphanumeric, which is what makes a
 * `..` segment (and a bare `.`, and a leading-dot dotfile) unmatchable rather than blocklisted.
 * Backslashes are absent from the class, so a Windows-style separator is refused too.
 */
const STAGING_SEGMENT = '[A-Za-z0-9][A-Za-z0-9._-]*';

/**
 * Anchored at BOTH ends and rooted at `STAGING_PREFIX`, so `/temp/x`, `../temp/x`, `Temp/x`
 * (case), `temp/` (empty remainder) and `temp/../secrets` all fail.
 *
 * Deliberately STRICTER than the legacy `/api/dispatch` validator, which was
 * `/^temp\/[a-zA-Z0-9._\/-]+$/` — that pattern accepts `temp/../secrets`, because `.` and `/`
 * are both in its character class. This is threat T-04-04: `temp_key` is caller-supplied text
 * that becomes a key in a bucket the pipeline holds write credentials for.
 */
export const STAGING_KEY_RE = new RegExp(
  `^${escapeForRegExp(STAGING_PREFIX)}${STAGING_SEGMENT}(?:/${STAGING_SEGMENT})*$`
);

/** R2's documented object-key ceiling, in UTF-8 bytes. A longer key is a rejected PUT, not a key. */
export const STAGING_KEY_MAX_LENGTH = 1024;

/**
 * Refuse anything that is not a staging key, naming `STAGING_PREFIX` and the offending value.
 *
 * An assertion signature rather than a `boolean` return, so a caller that has narrowed
 * `process.argv[2]` from `unknown` keeps the narrowing instead of casting it back.
 */
export function assertStagingKey(key: unknown): asserts key is string {
  if (typeof key !== 'string') {
    throw new Error(
      `photo-pipeline: staging key must be a string beginning with ${JSON.stringify(
        STAGING_PREFIX
      )}. Got ${typeof key}.`
    );
  }
  // TextEncoder, not Buffer: the byte count is what R2 limits, and `Buffer` is a Node global
  // this module has no other reason to reach for.
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

/* ==============================================================================================
 * 2. THE PUBLISHED KEY.  (OD-1, OD-3)
 * ============================================================================================ */

/** Everything the pipeline publishes lives under this prefix. There is no `private/` counterpart
 * here, deliberately: T-04-09 (the 39 unwatermarked masters currently readable at
 * `private/<category>/<slug>-clean.webp`) is DEFERRED TO PHASE 8, and defining a helper for that
 * path here would let a later plan compose one from this contract while the hole is still open.
 * What a new run uploads is OD-9, decided in 04-07. */
export const PUBLISHED_PREFIX = 'photos/';

/**
 * Bytes of the sha256 digest kept in a key. FOUR BYTES = 32 bits = eight hex characters.
 *
 * READ THE UNIT. This constant is a BYTE count; the key carries `CONTENT_HASH_HEX_LENGTH`
 * CHARACTERS, which is twice it. `contentHash()` already returns a string of exactly that
 * length, so nothing downstream should ever slice its output — and `publishedKey` refuses a hash
 * that is not `CONTENT_HASH_RE`, so a `hash.slice(0, CONTENT_HASH_BYTES)` mistake fails loudly
 * at the first key composition instead of silently shortening every URL in the manifest.
 *
 * COLLISION REASONING, since 32 bits sounds small: the hash is scoped to ONE slug in ONE
 * category, so a collision requires two different byte sequences for the SAME photograph. The
 * failure mode of that collision is a re-upload continuing to serve the old bytes — the same
 * outcome as not versioning at all, never a wrong photograph at a right URL. sha256 comes from
 * `node:crypto`; it is never hand-rolled (ASVS V6).
 */
export const CONTENT_HASH_BYTES = 4;

/** Hex characters of `contentHash` output, and of the `<hash8>` field in a published key. */
export const CONTENT_HASH_HEX_LENGTH = CONTENT_HASH_BYTES * 2;

/** Lower-case hex, exactly `CONTENT_HASH_HEX_LENGTH` characters. Built from the constant. */
export const CONTENT_HASH_RE = new RegExp(`^[0-9a-f]{${CONTENT_HASH_HEX_LENGTH}}$`);

/**
 * Content-address a byte sequence. Deterministic by construction: identical bytes give an
 * identical hash, so a re-run is reproducible and idempotent (PIPE-03), and two different byte
 * sequences give two different keys, which IS the CONT-05 mechanism.
 */
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
 * a slug that itself ends in something hash-shaped (`nature-deadbeef`) or suffix-shaped
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
 * derivation would produce `nature-riverbend-a1b2c3d4`.
 *
 * THE NEW INVARIANT, which replaces it:
 *     id === category + "-" + slug,  where slug is recoverable via slugFromPublishedKey()
 * Both are recorded here so that nobody, reading one era's data, re-derives the other era's
 * rule. `id` still has to satisfy `/^[a-z0-9-]+$/` in `src/schemas/photo.ts`, which is why
 * `category` and `slug` are both asserted against that grammar before they are joined.
 *
 * `PHOTO_ID_SEPARATOR` itself is DECLARED in `src/lib/photo-variants.ts` and re-exported from §3,
 * because the public routes have to run this join BACKWARDS — `PhotoSchema` has no `slug` field,
 * so `/photos/<category>/<slug>` is derived from the id at prerender time, in workerd, where this
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

/** The throwing form of `altRefusalReason`, for a call site that has nowhere to put a reason. */
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

/* ==============================================================================================
 * 7. PUBLISHING.  (OD-7)
 * ============================================================================================ */

/** The pipeline commits here directly — criterion 1, verbatim. */
export const PUBLISH_BRANCH = 'main';

/**
 * Attempts at the re-derive-and-retry loop before it fails loudly (04-06 owns the loop).
 *
 * NEVER a rebase and never a force: a textual rebase of an appended JSON array element is a
 * conflict waiting to happen, and resolves `order` incorrectly even when it succeeds. Recovery is
 * fetch → re-read the fetched manifest → re-run the upsert against the NEW maxima → re-validate
 * → commit → push.
 */
export const PUBLISH_RETRY_LIMIT = 3;
