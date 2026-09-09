#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RESUME_PATH = fileURLToPath(new URL('../data/resume.json', import.meta.url));
const PROJECTS_PATH = fileURLToPath(new URL('../data/projects.json', import.meta.url));

const PROJECT_KEYS = ['id', 'title', 'label', 'description', 'tech', 'icon', 'href', 'badges'];

const PROJECT_IDS = ['cairn', 'hued', 'momentum', 'timeshift', 'design-system'];

const FIGURE_RECORD_ID = 'design-system';

const COMPONENT_COUNT_TOKEN = '{{ds.componentCount}}';

const LITERAL_FIGURE = /\b(\d+)([- ])component/i;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    if (keys.join(',') !== PROJECT_KEYS.join(',')) {
      fail(
        `project "${project.id}" has keys [${keys.join(', ')}] in that order, ` +
          `expected [${PROJECT_KEYS.join(', ')}]`
      );
    }
  }
}

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

function reconstructPeriod(dates) {
  const start = `${MONTHS[dates.startMonth - 1]} ${dates.startYear}`;
  const end = dates.isPresent ? 'Present' : `${MONTHS[dates.endMonth - 1]} ${dates.endYear}`;
  return `${start} – ${end}`;
}

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

const figureRecord = projects.find((project) => project.id === FIGURE_RECORD_ID);
if (!figureRecord) {
  fail(`no project record with id "${FIGURE_RECORD_ID}" — OD-6 has no target`);
}
const figureMatch = LITERAL_FIGURE.exec(figureRecord.description);
if (figureMatch) {
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
