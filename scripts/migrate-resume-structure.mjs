#!/usr/bin/env node
/**
 * Migrate `data/resume.json` to the Phase 3 shape contract:
 *
 *   1. (D-24) The five `projects` records move out to their own top-level file,
 *      `data/projects.json`, VERBATIM — same order, same keys, same key order, same values.
 *      `resume.json` keeps exactly `experience, skills, education`.
 *   2. (OD-6, Option A) The `design-system` record's hardcoded component figure stops being a
 *      literal and becomes the token `{{ds.componentCount}}`.
 *   3. (OD-4, Option A — including education) The four `period` strings become structured date
 *      fields, and `period` is DELETED from disk. `src/lib/period.ts` derives it at render time.
 *
 * WHY THE SPLIT (D-24)
 * --------------------
 * 00-ADMIN-IA §1: "A project owns its case study, and a case-study body has no business living
 * inside the résumé document." ADR-002 then removed case-study *authoring* from the admin, which
 * strengthens the split rather than weakening it: `projects.json` becomes the card data that
 * `/admin/projects` edits inline in Phase 7, and the essay lives elsewhere.
 *
 * The output is a TOP-LEVEL ARRAY, matching `data/portfolio_images.json`. That is deliberate and
 * not incidental: 03-06 can then point Astro's `file()` loader at both, which its documentation
 * describes as taking "a single file that contains an array of objects with a unique `id` field".
 * An object wrapper here would cost 03-06 a second loader shape for no gain.
 *
 * WHY THE FIGURE BECOMES A TOKEN (OD-6)
 * -------------------------------------
 * `data/resume.json` said "79-component React library". That number has been hand-repaired before
 * (`db65b12 fix(data): repair a dead CTA route and the stale component count`) and went stale
 * again. Hand-repairing a literal in committed content is a maintenance loop with no exit: the
 * number lives in this repository and the truth lives in another one.
 *
 * Measured 2026-08-26, and this CORRECTS the premise the plan was written on: the upstream
 * three-numbers problem is already CLOSED. `../design-system/src/OverviewPage.tsx`'s `categories`
 * array — the authority per 01-12 — sums to 81, `README.md` says 81, and the design system's own
 * `src/overview-links.test.ts` asserts the two agree. The 83 directory count differs by exactly two
 * documented exclusions (`Field`, `IconButton`). ONLY this repository's 79 was stale.
 *
 * So the token is not a workaround for an unresolvable number. The number is resolvable; it is
 * simply not resolvable *at this layer*, because resolving it means reading the shipped catalog,
 * and the catalog arrives with the dependency in Phase 5. The token records "this is derived, and
 * derivation has not landed yet" in a form a gate can enforce, instead of recording a snapshot of
 * a number in a form only a human re-reading the sentence can catch.
 *
 * WHAT THIS SCRIPT REFUSES TO DO
 * ------------------------------
 * It does not normalise, reorder, reformat or "tidy" any project record. Key ORDER is validated
 * and carried, not just key membership: a reshuffle is invisible to a deep-equality check and is
 * exactly the churn that makes a future diff unreadable. `icon: null` on `cairn` and
 * `design-system` is carried as `null`, not dropped and not defaulted.
 *
 * WHY THE DATES BECOME STRUCTURED (OD-4)
 * --------------------------------------
 * `period: "Jul 2023 – Present"` is a lossy encoding: unsortable, unvalidatable, and it leaves
 * "is this role current?" expressed only as the English word `Present`. 00-ADMIN-IA §5 chose the
 * structured shape. Months are stored as INTEGERS 1-12, not as the three-letter strings: the
 * string is a rendering concern, and storing it here would recreate the exact coupling this
 * decision removes — the admin would then be editing a display string again.
 *
 * `isPresent: true` implies `endMonth` and `endYear` are ABSENT — not `null`, not `0`. One entry
 * (Brevo) is in that state.
 *
 * The reconstruction check below deliberately does NOT import `src/lib/period.ts`. It reimplements
 * the month table so that "the parse round-trips" is an INDEPENDENT claim rather than a circular
 * one: a formatter and a parser sharing a table agree with each other by construction even when
 * both are wrong. `test/content/resume-structure.unit.test.ts` is where `formatPeriod` is checked
 * against the strings read out of git; this is the second, cheaper opinion.
 *
 * IDEMPOTENCE
 * -----------
 * A second run reports `0 changes, no file rewritten` and writes nothing. The script reports the
 * WORK IT DID *and* the tree effect, as two separate numbers — those are different claims, and
 * only the pair distinguishes "this run was a no-op" from "this run normalised a file's
 * serialisation and happened to converge". An idempotence gate that reads only `git diff --quiet`
 * is measuring convergence, not work, and will call a rewriting run a no-op.
 *
 * Usage: node scripts/migrate-resume-structure.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RESUME_PATH = fileURLToPath(new URL('../data/resume.json', import.meta.url));
const PROJECTS_PATH = fileURLToPath(new URL('../data/projects.json', import.meta.url));

/**
 * The eight keys every project record carries, IN ORDER. Order is part of the contract here, not
 * decoration — see the header note on why a reshuffle must fail rather than be absorbed.
 */
const PROJECT_KEYS = ['id', 'title', 'label', 'description', 'tech', 'icon', 'href', 'badges'];

/** The five ids, in their authored order. A sixth or a missing one is an error, not a surprise. */
const PROJECT_IDS = ['cairn', 'hued', 'momentum', 'timeshift', 'design-system'];

/** The one record whose description carries the figure. Named, so a rename fails loudly. */
const FIGURE_RECORD_ID = 'design-system';

/**
 * The token 03-06's schema will require and Phase 5's resolver will replace. Kept as a constant so
 * the migration, the test and (later) the resolver can all name the same string.
 */
const COMPONENT_COUNT_TOKEN = '{{ds.componentCount}}';

/**
 * A literal component figure in prose. Matches `79-component` and `79 component`, case-insensitive
 * — the same expression 03-06 lifts into the schema and the test asserts against, so all three
 * agree by construction rather than by three people writing the same regex from memory.
 */
const LITERAL_FIGURE = /\b(\d+)([- ])component/i;

/**
 * The month table, reimplemented rather than imported from `src/lib/period.ts` — see the header
 * note on why the round-trip check must be independent to mean anything.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The stored `period` grammar, anchored, with the separator written as an ESCAPE. A pasted glyph
 * here would be indistinguishable from a hyphen in review, which is the whole hazard.
 */
const PERIOD_GRAMMAR = /^([A-Z][a-z]{2}) (\d{4}) \u2013 (?:(Present)|([A-Z][a-z]{2}) (\d{4}))$/;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function readJson(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    fail(`cannot read ${label} — ${error.message}`);
  }
  try {
    return { raw, parsed: JSON.parse(raw) };
  } catch (error) {
    fail(`${label} is not valid JSON — ${error.message}`);
  }
}

/** Validate the five records hard, before anything is written anywhere. */
function assertProjectShape(projects, origin) {
  if (!Array.isArray(projects)) {
    fail(`the project records in ${origin} are not an array`);
  }
  if (projects.length !== PROJECT_IDS.length) {
    fail(
      `${origin} holds ${projects.length} project records, expected ${PROJECT_IDS.length} ` +
        `(${PROJECT_IDS.join(', ')}) — the shape changed under this migration`
    );
  }
  const ids = projects.map((project) => project.id);
  if (ids.join(',') !== PROJECT_IDS.join(',')) {
    fail(`${origin} holds project ids [${ids.join(', ')}], expected [${PROJECT_IDS.join(', ')}]`);
  }
  for (const project of projects) {
    const keys = Object.keys(project);
    // Compared as an ORDERED join, not as a set: key order is carried verbatim, so a reshuffle
    // must be an error here rather than something the serialiser silently blesses.
    if (keys.join(',') !== PROJECT_KEYS.join(',')) {
      fail(
        `project "${project.id}" has keys [${keys.join(', ')}] in that order, ` +
          `expected [${PROJECT_KEYS.join(', ')}]`
      );
    }
  }
}

/**
 * Parse one stored `period` string into structured fields, or fail loudly.
 *
 * Deliberately anchored and total: there is no "best effort" branch. Four strings exist, all four
 * match, and a fifth shape appearing later is a content question for a human, not something a
 * migration should quietly interpret.
 */
function parsePeriod(period, label) {
  if (typeof period !== 'string') {
    fail(`${label}.period is ${JSON.stringify(period)}, expected a string`);
  }
  const match = PERIOD_GRAMMAR.exec(period);
  if (!match) {
    const points = [...period].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase()}`);
    fail(
      `${label}.period ${JSON.stringify(period)} does not match the stored grammar. ` +
        `Code points: ${points.join(' ')}. If the separator reads U+002D or U+2014 rather than ` +
        'U+2013, that is the bug — the four strings on disk use an EN DASH.'
    );
  }
  const [, startMonthName, startYear, present, endMonthName, endYear] = match;
  const startMonth = MONTHS.indexOf(startMonthName) + 1;
  if (startMonth === 0) fail(`${label}.period has an unknown start month "${startMonthName}"`);

  if (present) {
    return { startMonth, startYear: Number(startYear), isPresent: true };
  }
  const endMonth = MONTHS.indexOf(endMonthName) + 1;
  if (endMonth === 0) fail(`${label}.period has an unknown end month "${endMonthName}"`);
  return {
    startMonth,
    startYear: Number(startYear),
    endMonth,
    endYear: Number(endYear),
    isPresent: false,
  };
}

/** Independent reconstruction — see the header note on why this does not call `formatPeriod`. */
function reconstructPeriod(dates) {
  const start = `${MONTHS[dates.startMonth - 1]} ${dates.startYear}`;
  const end = dates.isPresent ? 'Present' : `${MONTHS[dates.endMonth - 1]} ${dates.endYear}`;
  return `${start} – ${end}`;
}

/**
 * Return a copy of `entry` with `period` replaced IN PLACE by the structured fields.
 *
 * The new keys take `period`'s slot rather than being appended, so the committed diff reads as a
 * field changing shape where it already lived instead of a deletion at line 4 and an unrelated
 * addition at the end of the record.
 */
function withStructuredDates(entry, label) {
  const dates = parsePeriod(entry.period, label);
  const reconstructed = reconstructPeriod(dates);
  if (reconstructed !== entry.period) {
    fail(
      `${label}: the parse does not round-trip. Stored ${JSON.stringify(entry.period)}, ` +
        `reconstructed ${JSON.stringify(reconstructed)}`
    );
  }

  const out = {};
  for (const [key, value] of Object.entries(entry)) {
    if (key !== 'period') {
      out[key] = value;
      continue;
    }
    out.startMonth = dates.startMonth;
    out.startYear = dates.startYear;
    // ABSENT, not null and not 0, when the range is open — see the header note.
    if (!dates.isPresent) {
      out.endMonth = dates.endMonth;
      out.endYear = dates.endYear;
    }
    out.isPresent = dates.isPresent;
  }
  return out;
}

const resume = readJson(RESUME_PATH, 'data/resume.json');
const work = [];

let projects;
let origin;

if ('projects' in resume.parsed) {
  projects = resume.parsed.projects;
  origin = 'data/resume.json';
  assertProjectShape(projects, origin);
  delete resume.parsed.projects;
  work.push('moved 5 project records out of resume.json and removed its `projects` key');
} else if (existsSync(PROJECTS_PATH)) {
  // Already split. Re-read from the new home and run the same validations, so a second run proves
  // the invariants rather than assuming them.
  origin = 'data/projects.json';
  projects = readJson(PROJECTS_PATH, origin).parsed;
  assertProjectShape(projects, origin);
} else {
  fail(
    'data/resume.json has no `projects` key and data/projects.json does not exist — the five ' +
      'records are in neither file, so there is nothing to migrate and nothing to verify'
  );
}

const resumeKeys = Object.keys(resume.parsed).join(',');
if (resumeKeys !== 'experience,skills,education') {
  fail(`resume.json top-level keys are [${resumeKeys}], expected [experience, skills, education]`);
}

// --- OD-6: the component figure stops being a literal ---------------------------------------
const figureRecord = projects.find((project) => project.id === FIGURE_RECORD_ID);
if (!figureRecord) {
  fail(`no project record with id "${FIGURE_RECORD_ID}" — OD-6 has no target`);
}
const figureMatch = LITERAL_FIGURE.exec(figureRecord.description);
if (figureMatch) {
  // Replace the FIGURE ONLY. The rest of the sentence is Akhil's reviewed copy and is not this
  // script's business — `$2` carries the original separator back so a space-form stays a space.
  figureRecord.description = figureRecord.description.replace(
    LITERAL_FIGURE,
    `${COMPONENT_COUNT_TOKEN}$2component`
  );
  work.push(
    `replaced the literal "${figureMatch[1]}${figureMatch[2]}component" figure in ` +
      `${FIGURE_RECORD_ID}'s description with ${COMPONENT_COUNT_TOKEN}`
  );
}
if (!figureRecord.description.includes(COMPONENT_COUNT_TOKEN)) {
  fail(
    `${FIGURE_RECORD_ID}'s description carries neither a literal figure nor ` +
      `${COMPONENT_COUNT_TOKEN} — OD-6's token is not present and cannot be resolved in Phase 5`
  );
}

// --- OD-4: period becomes structured dates, on all four records ------------------------------
// Experience AND education. Migrating only experience would leave two date shapes inside one
// file, which is how the original drift started.
const DATED_SECTIONS = [
  { key: 'experience', expected: 3 },
  { key: 'education', expected: 1 },
];

let converted = 0;
let alreadyStructured = 0;
for (const { key, expected } of DATED_SECTIONS) {
  const entries = resume.parsed[key];
  if (!Array.isArray(entries) || entries.length !== expected) {
    fail(
      `resume.json ${key} holds ${Array.isArray(entries) ? entries.length : 'no array'}, ` +
        `expected ${expected} record(s) — the shape changed under this migration`
    );
  }
  resume.parsed[key] = entries.map((entry) => {
    const label = `${key}[${entry.id}]`;
    const hasPeriod = 'period' in entry;
    const hasStructured = 'startYear' in entry;
    if (hasPeriod && hasStructured) {
      fail(
        `${label} carries BOTH period and structured dates — that is the legacy defect ` +
          '00-ADMIN-IA §5 names, and this migration will not resolve it by guessing which wins'
      );
    }
    if (hasPeriod) {
      converted += 1;
      return withStructuredDates(entry, label);
    }
    if (hasStructured) {
      alreadyStructured += 1;
      return entry;
    }
    return fail(`${label} carries neither period nor structured dates — it has no date range`);
  });
}
if (converted > 0) {
  work.push(`converted ${converted} period string(s) to structured dates and deleted \`period\``);
}
if (converted + alreadyStructured !== 4) {
  fail(
    `expected 4 dated records (3 experience + 1 education), accounted for ` +
      `${converted + alreadyStructured}`
  );
}

// --- serialise ------------------------------------------------------------------------------
// `data/` is Biome-excluded (biome.json → "!data"), so this serialisation is the final
// formatting; nothing downstream reformats it.
const resumeOut = `${JSON.stringify(resume.parsed, null, 2)}\n`;
const projectsOut = `${JSON.stringify(projects, null, 2)}\n`;
const existingProjectsOut = existsSync(PROJECTS_PATH) ? readFileSync(PROJECTS_PATH, 'utf8') : null;

let bytesWritten = 0;
if (resumeOut !== resume.raw) {
  writeFileSync(RESUME_PATH, resumeOut);
  bytesWritten += 1;
}
if (projectsOut !== existingProjectsOut) {
  writeFileSync(PROJECTS_PATH, projectsOut);
  bytesWritten += 1;
}

// Two numbers, ALWAYS both reported and never assumed from each other. `changes` is the semantic
// work done; `file(s) rewritten` is the effect on the tree.
//
// The first version of this line printed a hardcoded "0 files rewritten" inside the `work === 0`
// branch. That is wrong and it was caught by deliberately re-indenting `data/projects.json` to
// four spaces and re-running: the script rewrote the file back to two spaces — real work — and
// reported "0 changes, 0 files rewritten", while `git diff --quiet` went green because the tree
// had converged. A gate reading either signal alone would have called that a no-op. The exact
// string `0 changes, no file rewritten` is the contract the idempotence gate greps for.
const rewritten = bytesWritten === 0 ? 'no file rewritten' : `${bytesWritten} file(s) rewritten`;
if (work.length === 0 && bytesWritten === 0) {
  console.log(
    `OK 0 changes, no file rewritten — ${projects.length} project records and 4 dated records ` +
      `already canonical (projects read from ${origin})`
  );
} else if (work.length === 0) {
  console.log(
    `OK 0 semantic changes, but ${rewritten} — the serialisation on disk was not canonical ` +
      '(indentation, key spacing or the trailing newline). This run DID work; it is not a no-op.'
  );
} else {
  console.log(`OK ${work.length} change(s), ${rewritten}: ${work.join('; ')}`);
}
