/**
 * The byte-identity proof for the 00-PHOTO-CONTENT.md → data/portfolio_images.json merge
 * (CONT-01, plan 03-04).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * The 39 `alt` strings were written by looking at every photograph and reviewed with Akhil on
 * 2026-08-23. The public gallery ships zero framework JS, so `alt` is delivered on the `<img>`
 * element and is the entire non-visual experience of 39 images — there is no hover, no tooltip
 * and no later interaction that could supply a description, because there is no JavaScript on
 * the page to implement one. A string that was re-wrapped, curly-quote-normalised, truncated or
 * "improved" in transit is no longer the string that was reviewed, and a diff of 55 added lines
 * of prose is not evidence that it survived: nobody proof-reads 39 sentences against a markdown
 * table by eye. So this file compares them character for character.
 *
 * WHY IT PARSES THE BRIEF ITSELF
 * ------------------------------
 * It does NOT import `scripts/merge-photo-content.mjs`, and the duplicated parser below is
 * deliberate rather than an oversight. Importing the merge's own parser would make this file
 * assert that the merge agrees with itself — green for any consistent misreading of the table,
 * including one that dropped a column or mistook a header for a row. Two independent parsers
 * that disagree about where a cell ends is exactly the failure worth catching.
 *
 * WHAT IT CANNOT SEE
 * ------------------
 * Nothing here can check whether an alt value is TRUE OF THE PHOTOGRAPH. That is what the
 * 2026-08-23 review was for and no gate replaces it. Nor can it see whether `alt` ever reaches a
 * rendered `<img>`: no page renders a photo until Phase 5, so today this is a string in a JSON
 * file. Phase 5 must assert the attribute on rendered HTML.
 *
 * THE THREE CLASSES, AND WHY THIS FILE NO LONGER HOLDS A LITERAL 39 (plan 04-01)
 * ------------------------------------------------------------------------------
 * Phase 4 builds a pipeline that APPENDS records to `data/portfolio_images.json`. Measured on
 * 2026-08-27: appending one schema-valid 40th record turned 9 assertions in this file red while
 * `astro sync` stayed green at `40 photo(s)`. Bumping 39 → 40 would have been the wrong repair,
 * and the block at `categoryOrder agrees with the global order it was derived from` said so in
 * its own failure message: *"re-scope or retire this block rather than weakening it."*
 *
 * So every count-shaped assertion here now declares which of three things it is, beside itself:
 *
 *   COHORT     It proves something about the 39 photographs the 03-04 merge moved. A photograph
 *              published afterwards was never in scope, so the claim is iterated over the BRIEF's
 *              row set — never over `manifest` — and a 40th record cannot falsify it.
 *   FLOOR      It exists only to stop the corpus silently emptying. Spelled
 *              `toBeGreaterThanOrEqual(COHORT.size)`, the shape `scripts/assert-no-r2dev-urls.mjs`
 *              already uses at its `manifest.length < EXPECTED_RECORDS` guard.
 *   INVARIANT  It is true of every record the schema will ever accept. Iterated over the WHOLE
 *              manifest, always paired with the floor so an emptied file still fails.
 *
 * THE DIRECTION OF DERIVATION IS THE WHOLE POINT. `COHORT` comes from the brief. Deriving it from
 * `manifest` instead would make every cohort assertion below circular — it would compare the
 * manifest against a set computed from the manifest, and renaming a record would silently rename
 * the thing checking it. Proof step 4 of plan 04-01 is exactly that walk-through attempt: rename
 * one cohort id and the cohort blocks must fail naming the id that went missing.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MANIFEST_PATH = `${REPO_ROOT}data/portfolio_images.json`;
const BRIEF_PATH = `${REPO_ROOT}.planning/phases/00-design-ideation/00-PHOTO-CONTENT.md`;

/** The pending-value markers. A marker that reached the manifest is the failure, not the fix. */
const ALT_MARKER = '[AKHIL-ALT]';
const OPT_MARKER = '[AKHIL-OPT]';
/** Matched as a PREFIX so a marker that was mangled on the way in still fails. */
const MARKER_PREFIX = '[AKHIL-';

/** The brief's table header, in order. Every data row must produce exactly this many cells. */
const COLUMNS = ['id', 'title', 'category', 'date', 'alt', 'place', 'description', 'tags'] as const;

/** Brief rule 3: a screen reader announces the role before it reads the string. */
const ROLE_PREFIXES = ['image of', 'photo of', 'picture of'];

/**
 * EXPECTED_PLACES — COHORT. 16 OF THE 39 COHORT RECORDS carry a `place`, because 16 brief rows
 * filled that cell. It is not a fact about the manifest: a photograph the pipeline publishes may
 * carry a place, or not, without making this wrong. The complement is COMPUTED as
 * `COHORT.size - EXPECTED_PLACES` below rather than written out as 23, so the two figures cannot
 * drift apart.
 */
const EXPECTED_PLACES = 16;

/**
 * COHORT_BASELINE — DATED BASELINE, pinned to a frozen document. `00-PHOTO-CONTENT.md` lives under
 * `.planning/` and describes a review that happened on 2026-08-23; it does not change. So the
 * number of rows in it is a constant, and asserting it once (in the first `it` below) is what stops
 * a parser regression from shrinking the cohort silently. It is deliberately NOT compared against
 * `manifest.length`: that equality is what broke at 40 records, and it was never the claim.
 */
const COHORT_BASELINE = 39;

interface Photo {
  id: string;
  title: string;
  alt?: unknown;
  place?: unknown;
  category: string;
  order: number;
  categoryOrder?: unknown;
  focalPoint?: unknown;
}

type BriefRow = Record<(typeof COLUMNS)[number], string>;

/**
 * Parse the brief's seven tables. Row-level split on `|`, then trim the markdown cell padding —
 * and nothing else. Deliberately NOT a CSV parse and NOT a whole-file regex: the alt strings are
 * real sentences full of commas, parentheses, em dashes and apostrophes, every one of which
 * breaks a naive `\|(.*?)\|` sweep, and a parser that silently loses a row would make the
 * comparison below pass on the rows that survived.
 */
function parseBrief(text: string): BriefRow[] {
  const rows: BriefRow[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length < 2 || !trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    if (cells.length !== COLUMNS.length) continue;
    if (cells.every((c, i) => c === COLUMNS[i])) continue; // header
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator
    const row = Object.fromEntries(COLUMNS.map((name, i) => [name, cells[i]])) as BriefRow;
    row.id = row.id.replace(/^`(.*)`$/, '$1');
    rows.push(row);
  }
  return rows;
}

/** An optional cell is "absent" when it is empty or still holds a pending marker. */
const isAbsent = (cell: string) => cell === '' || cell === OPT_MARKER || cell === ALT_MARKER;

/** Case- and whitespace-insensitive comparison key, matching check-photo-content.mjs's `norm`. */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const manifest: Photo[] = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const rows = parseBrief(readFileSync(BRIEF_PATH, 'utf8'));
const rowById = new Map(rows.map((r) => [r.id, r]));

/**
 * THE COHORT: the id set the 03-04 merge moved, read from the brief and from nowhere else.
 *
 * Every assertion tagged COHORT below iterates this set or `rows`. None of them may be derived
 * from `manifest`, for the reason spelled out in the header — a cohort computed from the manifest
 * cannot detect a manifest that changed.
 */
const COHORT: ReadonlySet<string> = new Set(rows.map((r) => r.id));

/** Manifest ids the frozen brief never described — the pipeline's output, and out of every COHORT claim. */
const outOfCohortIds = (): string[] => manifest.filter((p) => !COHORT.has(p.id)).map((p) => p.id);

/**
 * Print a line that a PASSING run actually shows. `process.stdout.write`, not `console.log`.
 *
 * MEASURED, 2026-08-27, `vitest 4.1.10`, `--project unit`: a throwaway test emitting all three of
 * `console.log`, `console.info` and `process.stdout.write` printed ONLY the last one. The first
 * draft of the out-of-cohort report below used `console.info` and produced nothing at all — an
 * exclusion whose justification was written down and then never displayed, which is the same
 * failure as one that lives in a plan file. Do not "tidy" this back to `console.log`: run the probe
 * again first.
 *
 * This is a REPORT, not an assertion. Records outside the cohort are legitimate — they are what
 * Phase 4's pipeline produces — so they must be visible without being a failure.
 */
const report = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

describe('the merge read something', () => {
  /**
   * The vacuous-pass guard, and the reason it is first. Every assertion in this file is a loop
   * over `rows`, over `COHORT`, or over `manifest`; a parser that matched nothing, or a manifest
   * that failed to load, would make all of them iterate zero times and report green. This project
   * has shipped that failure before, so the sizes are asserted before anything is compared.
   */
  it('parses exactly the cohort the frozen brief describes, and it is not zero', () => {
    // COHORT + DATED BASELINE. `manifest.length` is deliberately absent: the brief's row count and
    // the manifest's record count were equal on 2026-08-23 and Phase 4 makes them diverge on
    // purpose. Asserting the equality would have been asserting the corpus can never grow.
    expect(rows.length).toBe(COHORT_BASELINE);
    expect(rowById.size).toBe(COHORT_BASELINE); // no duplicate ids collapsing the map
    expect(COHORT.size).toBe(COHORT_BASELINE);
    // ANTI-VACUITY. Every COHORT loop below is over this set. Zero is never a pass.
    expect(COHORT.size).toBeGreaterThan(0);
  });

  it('has a manifest record for every brief row, and names the records outside the cohort', () => {
    const manifestIds = new Set(manifest.map((p) => p.id));

    // COHORT BIJECTION, ONE DIRECTION. A brief row with no manifest record is a reviewed
    // photograph that was lost, which is a failure in any phase.
    expect(rows.filter((r) => !manifestIds.has(r.id)).map((r) => r.id)).toEqual([]);

    // …and the same claim stated on the manifest side, so a duplicate id cannot satisfy the
    // direction above while the manifest holds two records for one brief row.
    expect(manifest.filter((p) => COHORT.has(p.id))).toHaveLength(COHORT.size);

    // THE REVERSE DIRECTION IS REPORTED, NOT FAILED. Phase 4's pipeline appends records the frozen
    // brief never described; that is the feature, not a defect. The partition identity below is
    // what keeps the report honest — it fails if the two halves do not account for every record.
    const outside = outOfCohortIds();
    expect(COHORT.size + outside.length).toBe(manifest.length);
    if (outside.length > 0) {
      report(
        `photo-enrichment: ${outside.length} manifest record(s) are outside the 03-04 cohort and ` +
          `so out of scope for every COHORT assertion in this file: ${outside.join(', ')}`
      );
    }
  });
});

describe('alt survived the crossing byte for byte', () => {
  it('every cohort record carries the brief cell for its id, character for character', () => {
    // COHORT. The loop is over `rows`, not over `manifest`: the brief holds no cell for a
    // photograph published after 2026-08-23, so a byte-comparison against it is not a claim that
    // exists for such a record. Reversing the iteration is what makes the block survive growth
    // without losing a single character of what it checked.
    let compared = 0;
    for (const row of rows) {
      const photo = manifest.find((p) => p.id === row.id);
      expect(photo, `no manifest record for cohort id ${row.id}`).toBeDefined();
      // toBe on strings is === : no normalisation, no trim, no case folding. An en dash that
      // became a hyphen, or a curly apostrophe that became straight, fails here.
      expect((photo as Photo).alt, `alt mismatch on ${row.id}`).toBe(row.alt);
      compared += 1;
    }
    expect(compared).toBe(COHORT.size);
    expect(compared).toBeGreaterThan(0); // ANTI-VACUITY
  });

  it('has a non-empty alt on every record in the manifest', () => {
    // INVARIANT. `PhotoSchema.alt` is `z.string().min(1)` plus a whitespace-only superRefine, so
    // this is true of every record the schema will ever accept — the pipeline's output included.
    const missing = manifest
      .filter((p) => typeof p.alt !== 'string' || (p.alt as string).trim() === '')
      .map((p) => p.id);
    expect(missing).toEqual([]);
    expect(manifest.filter((p) => typeof p.alt === 'string' && p.alt.trim() !== '')).toHaveLength(
      manifest.length
    );
    // FLOOR. Without this, an emptied manifest satisfies the two assertions above trivially.
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size);
  });

  it('contains no pending marker anywhere in the manifest, in any field', () => {
    // INVARIANT. Whole-record serialisation rather than a per-field check: a marker that landed in
    // `description`, or in a tag, is the same defect wearing a different key. A record the pipeline
    // wrote is as capable of carrying `[AKHIL-` as one the merge wrote.
    const leaked = manifest
      .filter((p) => JSON.stringify(p).includes(MARKER_PREFIX))
      .map((p) => p.id);
    expect(leaked).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

describe('place is present exactly where the brief filled it, and ABSENT elsewhere', () => {
  it('has 16 cohort place keys, each byte-identical to its brief cell', () => {
    // COHORT. 16 OF THE 39 COHORT RECORDS, not 16 of the manifest. The final assertion is scoped to
    // cohort members for that reason: a photograph the pipeline publishes with a real `place` is
    // not evidence that the merge invented one, and before this scoping it would have read as such.
    const expected = rows.filter((r) => !isAbsent(r.place));
    expect(expected).toHaveLength(EXPECTED_PLACES); // the brief itself still says 16
    for (const row of expected) {
      const photo = manifest.find((p) => p.id === row.id);
      expect(photo, `no manifest record for ${row.id}`).toBeDefined();
      expect(photo?.place, `place mismatch on ${row.id}`).toBe(row.place);
    }
    expect(manifest.filter((p) => COHORT.has(p.id) && 'place' in p)).toHaveLength(EXPECTED_PLACES);
  });

  it('gives the remaining cohort records NO place key at all — not an empty string', () => {
    // COHORT for the absence claim. The complement is COMPUTED — `COHORT.size - EXPECTED_PLACES`
    // rather than the literal 23 — so the brief gaining or losing a filled cell cannot leave two
    // hardcoded halves that no longer sum.
    //
    // `'place' in record` and not `!record.place`. The distinction is the whole point: an empty
    // string is falsy, so a truthiness check would call `place: ""` absent and let it through —
    // and `""` renders as a real, empty element where the brief's rule is "nothing at all: no em
    // dash, no gap".
    const absentInBrief = rows.filter((r) => isAbsent(r.place)).map((r) => r.id);
    expect(absentInBrief).toHaveLength(COHORT.size - EXPECTED_PLACES);
    expect(absentInBrief.length).toBeGreaterThan(0); // ANTI-VACUITY for the loop below
    const stillKeyed = manifest.filter((p) => absentInBrief.includes(p.id) && 'place' in p);
    expect(stillKeyed.map((p) => p.id)).toEqual([]);

    // INVARIANT, and it stays whole-manifest: `place: z.string().min(1).optional()` forbids the
    // empty string on every record forever, so a pipeline record carrying `""` must fail here too.
    const emptyString = manifest
      .filter((p) => 'place' in p && String(p.place).trim() === '')
      .map((p) => p.id);
    expect(emptyString).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

describe("the brief's own rules, re-asserted after the strings left the file that guards them", () => {
  /**
   * `check-photo-content.mjs` enforces rules 2 and 3 inside 00-PHOTO-CONTENT.md. The merge is the
   * first time these strings leave that file's jurisdiction, and from here on the manifest is the
   * authority. Re-asserting rather than trusting is the point: a future hand-edit to the manifest
   * is not reachable by the brief's gate at all.
   */
  it('has no alt that merely repeats its own title', () => {
    // INVARIANT. This is `PhotoSchema`'s second `superRefine` rule, so it holds of every record the
    // schema accepts — whole manifest, and the pipeline's records are subject to it too.
    const echoes = manifest
      .filter((p) => typeof p.alt === 'string' && norm(p.alt) === norm(p.title))
      .map((p) => p.id);
    expect(echoes).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });

  it('has no alt opening with "Image of" / "Photo of" / "Picture of"', () => {
    // INVARIANT. `PhotoSchema`'s third `superRefine` rule, for the same reason.
    const prefixed = manifest
      .filter(
        (p) =>
          typeof p.alt === 'string' &&
          ROLE_PREFIXES.some((r) => norm(p.alt as string).startsWith(r))
      )
      .map((p) => p.id);
    expect(prefixed).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

// ---------------------------------------------------------------------------------------------
// D-22: the per-category order (plan 03-04, task 2)
// ---------------------------------------------------------------------------------------------

/**
 * Locate the last revision of the manifest that PREDATES this migration — the newest one in which
 * no record carries `categoryOrder` — and return its global `order` per id. That revision is, by
 * definition, the ordering the ranks were derived from.
 *
 * Deliberately NOT `HEAD~1`. Plan 03-05 is committing to this branch in the same wave, so `HEAD~1`
 * stops being this migration's parent the moment it lands, and the comparison would silently start
 * reading an already-migrated revision — comparing the shipped ranks against themselves. Searching
 * the file's own log for the last pre-migration revision is stable regardless of what else commits,
 * and it is the pattern `site-config-migration.unit.test.ts` already established here.
 *
 * Every rejection below returns `null` rather than an empty map, and exhausting the log throws.
 * A "previous revision" that resolves to nothing would make the loop over its ids run zero times
 * and the file go green having compared nothing — the failure this project has shipped repeatedly.
 */
function parsePreMigrationOrder(raw: string | null | undefined): Map<string, number> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const records = parsed as Photo[];
  // Post-migration revisions are not evidence about what the migration derived from.
  if (records.some((p) => 'categoryOrder' in p)) return null;
  if (!records.every((p) => typeof p.id === 'string' && Number.isInteger(p.order))) return null;
  const orders = new Map<string, number>(records.map((p) => [p.id, p.order]));
  if (orders.size !== records.length) return null; // duplicate ids
  if (new Set(records.map((p) => p.order)).size !== records.length) return null; // duplicate orders
  return orders;
}

function findPreMigrationOrder(): { ref: string; orders: Map<string, number> } {
  const refs = execFileSync('git', ['log', '--format=%H', '--', 'data/portfolio_images.json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const ref of refs) {
    let raw: string;
    try {
      raw = execFileSync('git', ['show', `${ref}:data/portfolio_images.json`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
    } catch {
      continue; // the file did not exist at this revision
    }
    const orders = parsePreMigrationOrder(raw);
    if (orders) return { ref, orders };
  }

  throw new Error(
    'No revision of data/portfolio_images.json predating the categoryOrder backfill was found. ' +
      'The consistency invariant has nothing to compare against and MUST NOT pass vacuously — ' +
      `searched ${refs.length} revision(s).`
  );
}

describe('categoryOrder is dense and unique inside every category', () => {
  /**
   * A gap or a duplicate is a reorder bug that surfaces as two photographs fighting for one slot
   * in the filtered view. `n` is taken from the group's own size rather than from a table of
   * expected counts, so publishing a photograph does not make this assertion wrong — but a group
   * that silently lost a member would otherwise be dense over its survivors, so the totals below
   * are still guarded. 04-01 changed HOW: the guard was an equality on 39, which forbade a 40th
   * photograph; it is now a FLOOR at `COHORT.size` plus `counted === manifest.length`, which
   * catches a shrunken corpus and a loop that skipped records without pinning the corpus size.
   */
  it('gives every record an integer categoryOrder', () => {
    // INVARIANT. `categoryOrder: z.number().int().positive()` is required on every record.
    const notInteger = manifest.filter((p) => !Number.isInteger(p.categoryOrder)).map((p) => p.id);
    expect(notInteger).toEqual([]);
    // FLOOR, replacing an equality on EXPECTED_RECORDS. The equality was doing the anti-vacuity
    // job and nothing else, and a floor does that job without forbidding a 40th photograph.
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size);
  });

  it('ranks each category exactly 1…n with no gap and no duplicate', () => {
    const byCategory = new Map<string, Photo[]>();
    for (const photo of manifest) {
      const group = byCategory.get(photo.category) ?? [];
      group.push(photo);
      byCategory.set(photo.category, group);
    }
    expect(byCategory.size).toBe(7); // the seven real categories, per OD-2
    let counted = 0;
    for (const [category, group] of byCategory) {
      const ranks = group.map((p) => p.categoryOrder as number).sort((a, b) => a - b);
      const dense = group.map((_, i) => i + 1);
      expect(ranks, `ranks in ${category} are not dense 1…n`).toEqual(dense);
      counted += group.length;
    }
    // INVARIANT. `counted` is compared to what the file actually holds, so the loop is proven to
    // have visited every record without the total being a hardcoded corpus size. Density inside a
    // category is exactly the property RI-6 also enforces, and it is true forever.
    expect(counted).toBe(manifest.length);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

describe('categoryOrder agrees with the global order it was derived from', () => {
  /**
   * The assertion that carries the information. Density alone is satisfied by shuffling every
   * category's ranks — the file would look perfectly valid while the filtered gallery Akhil has
   * already looked at had quietly rearranged itself.
   *
   * SCOPE, AND READ THIS BEFORE DELETING IT. This describe block is true OF THIS MIGRATION ONLY.
   * D-22 exists precisely because the two orderings are allowed to diverge, and Phase 7's
   * `/admin/photography` reorders photographs inside an active category filter — which changes
   * `categoryOrder` without changing the global `order` and WILL make this red on purpose. When
   * that happens, retire this block by name, with the reason written beside it, and leave the
   * density block above alone: density and uniqueness stay true forever. Weakening this assertion
   * in place, rather than retiring it deliberately, is how a real reorder bug would get through.
   */
  const previous = findPreMigrationOrder();

  it('found a pre-migration revision holding the whole cohort', () => {
    // COHORT. The evidence revision must hold every cohort member, because the ranks were derived
    // from ITS global order. `toBe(COHORT.size)` rather than `> 0`: an accidentally-truncated
    // evidence revision must fail rather than quietly shrink the proof.
    expect(previous.ref).toMatch(/^[0-9a-f]{40}$/);
    expect(previous.orders.size).toBe(COHORT.size);
  });

  it('covers the whole cohort — a photo published after the migration is reported, not failed', () => {
    // COHORT, and THIS IS THE BLOCK whose old failure message demanded re-scoping rather than
    // weakening. It used to iterate `manifest`, which meant every record the pipeline appends
    // would be reported as a rank this migration failed to derive — true, and not a defect.
    //
    // Re-scoped: the claim is COHORT ⊆ previous.orders. Iterating COHORT (from the BRIEF) rather
    // than `previous.orders` (from git) keeps the two sources independent, so a truncated evidence
    // revision fails here instead of silently checking fewer ids.
    let checked = 0;
    const uncovered: string[] = [];
    for (const id of COHORT) {
      if (!previous.orders.has(id)) uncovered.push(id);
      checked += 1;
    }
    expect(
      uncovered,
      `these cohort ids did not exist at ${previous.ref.slice(0, 7)}, so this migration did not derive their rank; re-scope or retire this block rather than weakening it`
    ).toEqual([]);

    // ANTI-VACUITY, both halves: a cohort of zero, or a loop that visited nothing, is not a pass.
    expect(COHORT.size).toBeGreaterThan(0);
    expect(checked).toBe(COHORT.size);

    // REPORTED, NOT FAILED. Out-of-cohort records are named so the exclusion stays visible in the
    // run rather than being invisible in a filter predicate.
    const outside = outOfCohortIds();
    if (outside.length > 0) {
      report(
        `photo-enrichment: ${outside.length} record(s) postdate ${previous.ref.slice(0, 7)} and ` +
          `are out of scope for this migration's rank claim: ${outside.join(', ')}`
      );
    }
  });

  it('orders each cohort category the same way the pre-migration global order did', () => {
    // COHORT. Each category's group is filtered to cohort members BEFORE comparing: a photograph
    // published later has no rank in `previous.orders` at all, so including it would compare a
    // real id against `undefined` and make a true claim about 39 records unfalsifiable at 40.
    const byCategory = new Map<string, Photo[]>();
    for (const photo of manifest) {
      if (!COHORT.has(photo.id)) continue;
      const group = byCategory.get(photo.category) ?? [];
      group.push(photo);
      byCategory.set(photo.category, group);
    }
    expect(byCategory.size).toBe(7); // the seven real categories, per OD-2 — all present in cohort
    let compared = 0;
    for (const [category, group] of byCategory) {
      const byRank = [...group]
        .sort((a, b) => (a.categoryOrder as number) - (b.categoryOrder as number))
        .map((p) => p.id);
      const byGlobal = [...group]
        .sort(
          (a, b) => (previous.orders.get(a.id) as number) - (previous.orders.get(b.id) as number)
        )
        .map((p) => p.id);
      expect(
        byRank,
        `${category} disagrees with the global order at ${previous.ref.slice(0, 7)}`
      ).toEqual(byGlobal);
      compared += group.length;
    }
    // ANTI-VACUITY. Every cohort member must have been compared; the cohort-filter above is
    // precisely the kind of predicate that could silently empty every group.
    expect(compared).toBe(COHORT.size);
    expect(compared).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
// OD-5, resolved by Akhil on 2026-08-25: BOTH FIELDS SURVIVE (option A)
// ---------------------------------------------------------------------------------------------

/**
 * `photo.focalPoint` does NOT supersede `home_config.peekPositions`. Both survive.
 *
 * THE ARGUMENT, WRITTEN DOWN HERE BECAUSE IT IS THE ONE PLACE IN PHASE 3 WHERE TWO FIELDS OF THE
 * SAME SHAPE ARE DEFENDED RATHER THAN DELETED. D-25 deleted `site_config.categoryColumns` and
 * 00-ADMIN-IA §5 deleted the résumé's `period` for exactly the duplication these two look like:
 * both hold a `"50% 25%"` string, and one of them holds a single value while the other holds
 * none. So the burden is on the defence, and the defence is that they answer different questions:
 *
 *   - `focalPoint` is "where is the subject in this photograph" — a property of the IMAGE, true
 *     in any crop, anywhere on the site: a hero, a grid tile, a lightbox, a peek frame.
 *   - `peekPositions` is "how should this photo sit in HOME'S 3:2 peek frame" — a property of one
 *     PLACEMENT in one layout.
 *
 * The distinction is load-bearing rather than theoretical: overriding how a photograph sits in one
 * frame, without changing how it is cropped everywhere else, is not expressible with a single
 * field. Folding them would mean a photo has exactly one crop in every context forever, and undoing
 * that later would mean undoing it with Phase 7's focal-marker editor already built on top.
 *
 * WHAT THIS MIGRATION THEREFORE DID: nothing. The single existing value,
 * `{"architecture-hawamahaldaytime": "50% 25%"}`, stays in `data/home_config.json` untouched, and
 * `focalPoint` is written onto no record. 03-06 adds `focalPoint` to `PhotoSchema` as optional
 * with the default `"50% 50%"` DECLARED IN THE SCHEMA — an explicitly stored default is a value
 * nobody edited that looks like one somebody chose. 03-06 also owns the referential rule that
 * `peekPositions` keys are a subset of `peekIds`; it is not duplicated here.
 */
describe('OD-5: focalPoint is added to the schema, not to the data', () => {
  it('writes focalPoint onto no COHORT record — the default lives in 03-06 schema, not on disk', () => {
    // COHORT. What this migration did was nothing, to 39 records. A photograph published later may
    // legitimately carry a crop — Phase 7's focal-marker editor exists to author exactly that — so
    // scoping to the cohort is what keeps this a claim about the migration rather than a ban on the
    // field. The whole-manifest half of the OD-5 claim is the next `it`, which stays unscoped.
    const cohortRecords = manifest.filter((p) => COHORT.has(p.id));
    const carriers = cohortRecords.filter((p) => 'focalPoint' in p).map((p) => p.id);
    expect(carriers).toEqual([]);
    // ANTI-VACUITY: there are COHORT.size records to check, and they were all found.
    expect(cohortRecords).toHaveLength(COHORT.size);
    expect(COHORT.size).toBeGreaterThan(0);
  });

  it('stores no explicit copy of the "50% 50%" default, whatever focalPoint values appear', () => {
    // DECLARED VACUOUS TODAY, deliberately. No record carries `focalPoint` at all — the assertion
    // above pins that — so this one currently filters an empty set. It is written now rather than
    // later because the moment Phase 7's focal-marker editor authors the first real value is the
    // moment it stops being vacuous, and a rule added after the data exists is a rule added after
    // the violation. When that day comes, retire the assertion above by name and keep this one.
    // INVARIANT, whole manifest, deliberately NOT cohort-scoped: "never store the default
    // explicitly" is a rule about every record that will ever exist, and the pipeline is the first
    // thing in this project that could write one.
    const defaulted = manifest.filter((p) => p.focalPoint === '50% 50%').map((p) => p.id);
    expect(defaulted).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});
