#!/usr/bin/env node

/**
 * PUB-08 build refusal — every camera and lens string in the manifest has a human name.
 *
 * Usage: node scripts/assert-exif-display-coverage.mjs [manifestPath]
 *        (with no argument, reads data/portfolio_images.json)
 *
 * The optional path exists so this gate's own negative controls can run against a COPY. Three
 * executors share one git index in this wave, and 04-06's commit swept six of 04-04's files into
 * itself when a verify step staged in a shared index. Nothing here writes anywhere, and no
 * control ever mutates `data/`.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL
 *
 * The manifest stores what the camera wrote. MEASURED, 05-UI-SPEC.md §9.5: three of the five
 * non-null camera strings are model codes — `SM-N970F`, `AC2001`, `ILCE-7CM2` — that no
 * prefix-stripping, title-casing prettifier can decode. So `src/lib/exif-display.ts` is a lookup
 * table, and a lookup table has exactly one failure mode: a photograph arrives carrying a string
 * nobody has added yet.
 *
 * There are three things the renderer could do about that, and two of them are worse than a red
 * build. Falling back to the raw value ships `SM-N970F` to a reader. Falling back to a heuristic
 * ships a false claim about what the photograph was made with. Refusing does neither, and the
 * repair is a two-line edit — so this gate exists to make the refusal happen at BUILD time,
 * where the person who added the photograph is still holding it, rather than at render time,
 * where nobody is watching.
 *
 * ---------------------------------------------------------------------------------------------
 * IT DOES NOT HOLD A COPY OF THE TABLES. IT ASKS THE MODULE.
 *
 * This gate imports `displayCamera` and `displayLens` from `src/lib/exif-display.ts` and calls
 * them. A miss is the module's own `throw`, not a second lookup written here. A gate carrying a
 * duplicate of the thing it checks agrees with itself and proves nothing — which is precisely
 * what the `THUMB.dataUriPrefix` note in `src/lib/photo-pipeline.ts` records about an earlier
 * attempt in this repository, where the only available agreement check compared a value against
 * a literal re-typed in a test.
 *
 * THE MECHANISM, MEASURED RATHER THAN ASSUMED. 05-04-PLAN.md offered two options and asked for
 * (a) to be measured first. It works:
 *
 *     node scripts/…  -> imports src/lib/exif-display.ts, exit 0     (Node 22.22.3, per .nvmrc)
 *     node --experimental-strip-types scripts/…  -> identical
 *
 * Node strips TypeScript types by DEFAULT from 22.18 onward, so the flag is unnecessary here and
 * is deliberately not required. It works for one specific reason, and that reason is fragile
 * enough to write down: `exif-display.ts`'s ONLY import is `import type { PhotoExif }`, which
 * type-stripping ERASES, so Node never has to resolve the extensionless `../schemas/photo`
 * specifier — which it cannot resolve. **If that module ever gains a VALUE import of an
 * extensionless relative specifier, this gate stops loading**, and the catch below says so by
 * name instead of reporting a mysterious resolution error. Option (b) — moving the check into a
 * vitest test — is then the fallback, and `test/public/exif-display.unit.test.ts` already asserts
 * the same coverage over the same corpus, so nothing would be lost but the build-time position.
 *
 * ---------------------------------------------------------------------------------------------
 * EVERY COUNT IS DERIVED FROM THE FILE IT READ
 *
 * There is no 40, no 5 and no 4 anywhere below. 03-01's `--verify` hardcoded 39, STATE.md flagged
 * it, 04-09 then wrote a fresh hardcoded count and the first real photograph turned `main` red.
 * The manifest was 39, is 40, and will be 41.
 *
 * ---------------------------------------------------------------------------------------------
 * IT REFUSES TO PASS ON NOTHING
 *
 * A missing file, a non-array, an empty array, a record with no `exif` object, and — the one a
 * plain per-record loop misses — a corpus in which every camera and every lens is null. That
 * last one iterates every record, calls neither lookup, and reports success. It is the same
 * vacuity `PhotoManifestSchema`'s `.min(1)` exists for, one level in.
 *
 * WHAT IT STILL CANNOT SEE, recorded rather than claimed closed:
 *
 *  R1. A corpus with cameras but NO non-null lens exercises the lens table zero times and still
 *      passes, because the anti-vacuity check below is on the COMBINED count. Making it
 *      per-field would red the build on a legitimate data state (a phone-only import with no
 *      lens EXIF), and a gate that fires on correct data gets turned off. The combined check
 *      catches the case that is unambiguously vacuous and no more.
 *  R2. It says nothing about whether the display name is CORRECT — only that one exists.
 *      `'OnePlus AC2001': 'Leica M11'` passes here. The correctness of each mapping rests on the
 *      manufacturer citations in the module header and on the independently-written expectation
 *      table in `test/public/exif-display.unit.test.ts`, which would disagree.
 *
 * ---------------------------------------------------------------------------------------------
 * THE SELF-TEST RUNS ON EVERY INVOCATION
 *
 * This project has shipped nineteen gates that could not fail, eight of them inside repairs to
 * other gates. So before reading a single record, this gate proves on synthetic values that it
 * flags what it must flag and ignores what it must ignore — including the case variant, so the
 * exact-match decision is ENFORCED here rather than merely written down somewhere. The canary
 * strings are DERIVED from the real table keys, so they cannot go stale.
 *
 * Reporting is `process.stdout.write`. STATE.md: `console.log` and `console.info` print nothing
 * under this repo's vitest setup, and a gate whose findings are invisible is indistinguishable
 * from a gate that found nothing.
 */

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

/* ---------------------------------------------------------------------------------------------
 * Load the module under test. See the MECHANISM paragraph in the header.
 * ------------------------------------------------------------------------------------------ */

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

/** The two fields this gate covers, each with the lookup that owns it. */
const FIELDS = [
  {
    key: 'camera',
    table: CAMERA_DISPLAY_NAMES,
    resolve: displayCamera,
    tableName: 'CAMERA_DISPLAY_NAMES',
  },
  { key: 'lens', table: LENS_DISPLAY_NAMES, resolve: displayLens, tableName: 'LENS_DISPLAY_NAMES' },
];

/* ---------------------------------------------------------------------------------------------
 * The self-test. Synthetic values only, derived from the real table keys.
 * ------------------------------------------------------------------------------------------ */

function selfTest() {
  const problems = [];

  for (const field of FIELDS) {
    const keys = Object.keys(field.table);
    if (keys.length === 0) {
      problems.push(`${field.tableName} is empty — an empty table would flag every real value`);
      continue;
    }
    const known = keys[0];

    // ANTI-CANARY: a real key must resolve to a non-empty string.
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

    // ANTI-CANARY: null is an absent field, not a miss. PUB-07 depends on this.
    if (field.resolve(null) !== null) {
      problems.push(`${field.key}: null did not resolve to null — a null field would become a row`);
    }

    // CANARY: a value derived from a real key, guaranteed absent, must throw AND name itself.
    const canary = `${known} ZZ-NOT-A-REAL-DEVICE`;
    if (Object.hasOwn(field.table, canary)) {
      problems.push(`${field.key}: the canary ${JSON.stringify(canary)} is somehow a real entry`);
    } else if (!threwNaming(field.resolve, canary)) {
      problems.push(
        `${field.key}: did NOT throw naming ${JSON.stringify(canary)} — this gate cannot detect a missing entry`
      );
    }

    // CANARY: the exact-match decision. A case variant of a real key is a DATA defect (the
    // pipeline writes what the camera wrote), so it must be refused rather than folded in.
    const caseVariant = known.toLowerCase() === known ? known.toUpperCase() : known.toLowerCase();
    if (caseVariant !== known && !Object.hasOwn(field.table, caseVariant)) {
      if (!threwNaming(field.resolve, caseVariant)) {
        problems.push(
          `${field.key}: accepted the case variant ${JSON.stringify(caseVariant)} — the lookup is not exact`
        );
      }
    }

    // CANARY: a trailing space, same reasoning.
    const spaced = `${known} `;
    if (!Object.hasOwn(field.table, spaced) && !threwNaming(field.resolve, spaced)) {
      problems.push(
        `${field.key}: accepted ${JSON.stringify(spaced)} — trailing whitespace is not being refused`
      );
    }

    // CANARY: an inherited Object.prototype member must not resolve to a function.
    if (!threwNaming(field.resolve, 'toString')) {
      problems.push(
        `${field.key}: "toString" resolved — the lookup is an index, not an own-property check`
      );
    }
  }

  return problems;
}

/** True when `resolve(value)` threw an Error whose message contains the value. */
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

/* ---------------------------------------------------------------------------------------------
 * Read the manifest.
 * ------------------------------------------------------------------------------------------ */

const manifestArg = process.argv[2];
const manifestPath = manifestArg ? path.resolve(manifestArg) : DEFAULT_MANIFEST;
// Repo-relative when it IS inside the repo, absolute otherwise. `path.relative` alone renders an
// out-of-tree fixture as `../../../../../../var/folders/...`, which is the least readable form of
// the one string a failing gate most needs the reader to recognise.
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
