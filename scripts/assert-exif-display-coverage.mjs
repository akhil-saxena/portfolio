#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_MANIFEST = path.join(REPO_ROOT, 'data', 'portfolio_images.json');
const MODULE_PATH = path.join(REPO_ROOT, 'src', 'lib', 'exif-display.ts');

const out = (text) => process.stdout.write(text);
const fail = (text) => {
  out(text);
  process.exit(1);
};

let mod;
try {
  mod = await import(pathToFileURL(MODULE_PATH).href);
} catch (error) {
  fail(
    `assert-exif-display-coverage: FAIL — could not import ${path.relative(REPO_ROOT, MODULE_PATH)}\n` +
      `  ${error.message}\n\n` +
      `  This gate loads a TypeScript module from plain \`node\`, which works only because that\n` +
      `  module's sole import is \`import type\` — erased by Node's type stripping, so the\n` +
      `  extensionless relative specifier is never resolved. If a VALUE import was just added\n` +
      `  there, that is the cause, and the fix is either to give the specifier an extension or\n` +
      `  to move this check into test/public/exif-display.unit.test.ts (option (b) in the plan).\n` +
      `  Node ${process.version}; type stripping is on by default from 22.18.\n`
  );
}

const { CAMERA_DISPLAY_NAMES, LENS_DISPLAY_NAMES, displayCamera, displayLens } = mod;

for (const [name, value] of [
  ['CAMERA_DISPLAY_NAMES', CAMERA_DISPLAY_NAMES],
  ['LENS_DISPLAY_NAMES', LENS_DISPLAY_NAMES],
  ['displayCamera', displayCamera],
  ['displayLens', displayLens],
]) {
  if (value === undefined) {
    fail(
      `assert-exif-display-coverage: FAIL — src/lib/exif-display.ts no longer exports ${name}.\n` +
        `  Deleting the thing under test must never be what makes a gate green.\n`
    );
  }
}

const FIELDS = [
  {
    key: 'camera',
    table: CAMERA_DISPLAY_NAMES,
    resolve: displayCamera,
    tableName: 'CAMERA_DISPLAY_NAMES',
  },
  { key: 'lens', table: LENS_DISPLAY_NAMES, resolve: displayLens, tableName: 'LENS_DISPLAY_NAMES' },
];

function selfTest() {
  const problems = [];

  for (const field of FIELDS) {
    const keys = Object.keys(field.table);
    if (keys.length === 0) {
      problems.push(`${field.tableName} is empty — an empty table would flag every real value`);
      continue;
    }
    const known = keys[0];

    let resolved;
    try {
      resolved = field.resolve(known);
    } catch (error) {
      problems.push(
        `${field.key}: threw on its OWN table key ${JSON.stringify(known)} — ${error.message}`
      );
      continue;
    }
    if (typeof resolved !== 'string' || resolved.trim() === '') {
      problems.push(
        `${field.key}: ${JSON.stringify(known)} resolved to ${JSON.stringify(resolved)}`
      );
    }

    if (field.resolve(null) !== null) {
      problems.push(`${field.key}: null did not resolve to null — a null field would become a row`);
    }

    const canary = `${known} ZZ-NOT-A-REAL-DEVICE`;
    if (Object.hasOwn(field.table, canary)) {
      problems.push(`${field.key}: the canary ${JSON.stringify(canary)} is somehow a real entry`);
    } else if (!threwNaming(field.resolve, canary)) {
      problems.push(
        `${field.key}: did NOT throw naming ${JSON.stringify(canary)} — this gate cannot detect a missing entry`
      );
    }

    const caseVariant = known.toLowerCase() === known ? known.toUpperCase() : known.toLowerCase();
    if (caseVariant !== known && !Object.hasOwn(field.table, caseVariant)) {
      if (!threwNaming(field.resolve, caseVariant)) {
        problems.push(
          `${field.key}: accepted the case variant ${JSON.stringify(caseVariant)} — the lookup is not exact`
        );
      }
    }

    const spaced = `${known} `;
    if (!Object.hasOwn(field.table, spaced) && !threwNaming(field.resolve, spaced)) {
      problems.push(
        `${field.key}: accepted ${JSON.stringify(spaced)} — trailing whitespace is not being refused`
      );
    }

    if (!threwNaming(field.resolve, 'toString')) {
      problems.push(
        `${field.key}: "toString" resolved — the lookup is an index, not an own-property check`
      );
    }
  }

  return problems;
}

function threwNaming(resolve, value) {
  try {
    resolve(value);
    return false;
  } catch (error) {
    return error instanceof Error && error.message.includes(value);
  }
}

const selfTestProblems = selfTest();
if (selfTestProblems.length > 0) {
  fail(
    'assert-exif-display-coverage: SELF-TEST FAILED — this gate cannot be trusted.\n' +
      selfTestProblems.map((p) => `  x ${p}\n`).join('') +
      '  Refusing to report on real data with a broken check.\n'
  );
}

const manifestArg = process.argv[2];
const manifestPath = manifestArg ? path.resolve(manifestArg) : DEFAULT_MANIFEST;
const relative = path.relative(REPO_ROOT, manifestPath);
const shown = relative && !relative.startsWith('..') ? relative : manifestPath;

if (manifestArg !== undefined && manifestArg.trim() === '') {
  fail(
    'assert-exif-display-coverage: FAIL — an empty manifest path was passed.\n' +
      '  Refusing to silently fall back to the default: a control that meant to point this gate\n' +
      '  at a fixture and passed an unset variable would otherwise read the real manifest and\n' +
      '  report a pass about a file it was not asked to check.\n'
  );
}

let raw;
try {
  raw = fs.readFileSync(manifestPath, 'utf8');
} catch (error) {
  fail(
    `assert-exif-display-coverage: FAIL — cannot read ${shown}\n` +
      `  ${error.message}\n` +
      `  A gate that passes because its input is missing has checked nothing.\n`
  );
}

let manifest;
try {
  manifest = JSON.parse(raw);
} catch (error) {
  fail(`assert-exif-display-coverage: FAIL — ${shown} is not valid JSON\n  ${error.message}\n`);
}

if (!Array.isArray(manifest)) {
  fail(
    `assert-exif-display-coverage: FAIL — ${shown} is not an array (got ${typeof manifest}).\n` +
      `  Every rule below is per-record; a non-array has no records to check.\n`
  );
}

if (manifest.length === 0) {
  fail(
    `assert-exif-display-coverage: FAIL — ${shown} holds zero records.\n` +
      `  An empty array satisfies every per-record rule without reading a record. This is the\n` +
      `  same vacuity PhotoManifestSchema's .min(1) refuses, and it is refused here too.\n`
  );
}

/* ---------------------------------------------------------------------------------------------
 * The scan. Every count below is computed from what was just read.
 * ------------------------------------------------------------------------------------------ */

const findings = [];
const usage = { camera: new Map(), lens: new Map() };
let valuesChecked = 0;
let recordsWithNoExif = 0;

manifest.forEach((record, index) => {
  const id = typeof record?.id === 'string' && record.id !== '' ? record.id : `<record #${index}>`;
  const exif = record?.exif;

  if (exif === null || typeof exif !== 'object' || Array.isArray(exif)) {
    recordsWithNoExif += 1;
    findings.push({
      id,
      field: 'exif',
      value: exif,
      message:
        'has no exif object. The schema declares exif as a required strictObject whose six ' +
        'fields are nullable, so an absent object is a malformed record, not an empty one.',
    });
    return;
  }

  for (const field of FIELDS) {
    const value = exif[field.key];
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value !== 'string') {
      findings.push({
        id,
        field: field.key,
        value,
        message: `is a ${typeof value}, not a string — ${field.tableName} is keyed by the stored string.`,
      });
      continue;
    }

    valuesChecked += 1;
    usage[field.key].set(value, (usage[field.key].get(value) ?? 0) + 1);

    try {
      const display = field.resolve(value);
      if (typeof display !== 'string' || display.trim() === '') {
        findings.push({
          id,
          field: field.key,
          value,
          message: `resolved to ${JSON.stringify(display)} — an empty display name would render an empty row, which PUB-07 forbids.`,
        });
      }
    } catch (error) {
      findings.push({
        id,
        field: field.key,
        value,
        message:
          `has no entry in ${field.tableName}. Add it to src/lib/exif-display.ts with the ` +
          `manufacturer listing that decodes it — a fallback would ship the raw code to a reader ` +
          `and a heuristic would ship a guess. (${error.message.split('.')[0]}.)`,
      });
    }
  }
});

const distinctCameras = usage.camera.size;
const distinctLenses = usage.lens.size;

if (valuesChecked === 0 && recordsWithNoExif === 0) {
  fail(
    `assert-exif-display-coverage: FAIL — ${manifest.length} record(s) scanned and NOT ONE ` +
      `non-null camera or lens string among them.\n` +
      `  Both lookups were called zero times, so a pass here would be a sentence about a table\n` +
      `  this run never opened. See residual R1 in the header for the narrower case that is\n` +
      `  deliberately still allowed.\n`
  );
}

/* ---------------------------------------------------------------------------------------------
 * Report.
 * ------------------------------------------------------------------------------------------ */

const inventory = (map) => {
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return rows
    .map(([value, n]) => `      ${String(n).padStart(3)} x ${JSON.stringify(value)}\n`)
    .join('');
};

if (findings.length > 0) {
  out('assert-exif-display-coverage: FAIL\n');
  out(`  manifest: ${shown}\n`);
  out(
    `  scanned ${manifest.length} record(s), checked ${valuesChecked} non-null camera/lens value(s)\n\n`
  );
  for (const finding of findings) {
    out(`  x ${finding.id}  —  exif.${finding.field} = ${JSON.stringify(finding.value)}\n`);
    out(`      ${finding.message}\n`);
  }
  out(`\n  ${findings.length} finding(s). Requirement PUB-08; threat T-05-04-01.\n`);
  process.exit(1);
}

out('assert-exif-display-coverage: PASS\n');
out(`  manifest: ${shown}\n`);
out(
  `  ${manifest.length} record(s) scanned, ${valuesChecked} non-null camera/lens value(s) resolved\n`
);
out(`  ${distinctCameras} distinct camera string(s):\n${inventory(usage.camera)}`);
out(`  ${distinctLenses} distinct lens string(s):\n${inventory(usage.lens)}`);
out(
  `  tables: ${Object.keys(CAMERA_DISPLAY_NAMES).length} camera entr(ies), ` +
    `${Object.keys(LENS_DISPLAY_NAMES).length} lens entr(ies), read from src/lib/exif-display.ts — not restated here\n`
);
out('  self-test: both lookups flagged their unknown, case-variant, trailing-space and\n');
out('             Object.prototype canaries, and left their own table keys and null alone\n');
out(`  every count above is derived from ${shown}; none is written into this file\n`);
