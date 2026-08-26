#!/usr/bin/env node
/**
 * Migrate `data/resume.json` to the Phase 3 shape contract:
 *
 *   1. (D-24) The five `projects` records move out to their own top-level file,
 *      `data/projects.json`, VERBATIM — same order, same keys, same key order, same values.
 *      `resume.json` keeps exactly `experience, skills, education`.
 *   2. (OD-6, Option A) The `design-system` record's hardcoded component figure stops being a
 *      literal and becomes the token `{{ds.componentCount}}`.
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
 * IDEMPOTENCE
 * -----------
 * A second run reports `0 changes` and writes nothing. The script reports the WORK IT DID, not
 * whether the tree converged — those are different claims, and only the first one distinguishes
 * "this run was a no-op" from "this run did twelve things that happened to be undone".
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

// Two numbers, both reported. `changes` is the WORK done; `files rewritten` is the tree effect.
// A gate that only reads the second cannot tell a no-op run from a run that undid itself.
console.log(
  work.length === 0
    ? `OK 0 changes, 0 files rewritten — ${projects.length} project records already canonical ` +
        `(read from ${origin})`
    : `OK ${work.length} change(s), ${bytesWritten} file(s) rewritten: ${work.join('; ')}`
);
