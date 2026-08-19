#!/usr/bin/env node
/**
 * FND-05 ship gate — refuse to ship a build whose dependencies were not resolved from a registry.
 *
 * Usage: node scripts/assert-no-local-dep-specs.mjs [manifestPath] [--advisory]
 *        (manifest defaults to ./package.json)
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS GATE IS SCOPED TO THE SHIP PATH, AND WHY THAT IS NOT A WEAKENING
 *
 * CLAUDE.md says two things that only look contradictory:
 *
 *   "During development the portfolio consumes it as a packed tarball (npm pack -> file:*.tgz),
 *    never file:../design-system or npm link — both are symlinks and carry the duplicate-React
 *    'invalid hook call' hazard. A CI gate fails the build if the dependency spec still starts
 *    with file: at ship time."
 *
 * So during Phase 5 the design-system spec legitimately IS file:./local-packages/*.tgz. That is
 * the sanctioned workflow, and it is safe for the specific reason that npm COPIES a tarball into
 * node_modules rather than symlinking it — one React, one module instance. A gate that fired on
 * every push would make the sanctioned workflow impossible and would be turned off within a day,
 * which is the failure mode where a gate is worse than no gate.
 *
 * Hence the scoping, which is enforced in package.json and asserted by plan 02-06's Task 1 verify:
 *
 *   - `gate:deps`          — enforcing. Wired into `deploy`, and into the deploy CI job only.
 *   - `gate:deps:advisory` — same report, exit 0. Wired into everyday CI by plan 02-08.
 *   - NEITHER form appears in `build` or `check`.
 *
 * Over-scope it and development stops. Under-scope it and a symlinked React reaches production.
 * Both directions are real failures; this is the shape that is neither.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY A MANIFEST-ONLY CHECK WOULD MISS THE EXACT HAZARD CLAUDE.md NAMES
 *
 * `file:../design-system` leaves a trace in package.json. `npm link` does not — it leaves a
 * perfectly ordinary-looking version range in the manifest and a symlink on disk. A gate that
 * only read the manifest would pass, cleanly and confidently, on precisely the setup that
 * produces two copies of React: the linked package resolves React through its own node_modules,
 * hooks are read from a different module instance than the one the app rendered with, and you
 * get "Invalid hook call" errors that are intermittent and can vanish on refresh. That class of
 * bug costs days. So this gate reads the filesystem too.
 *
 * ---------------------------------------------------------------------------------------------
 * NOTE ON TIMING: as of Phase 2 there is NO design-system dependency, and no local spec anywhere
 * — so this gate currently has nothing to catch. That is deliberate. FND-05 exists so that the
 * moment Phase 5 adds the tarball, the machinery that stops it shipping is already in place and
 * has already been observed to refuse (02-NEGATIVE-CONTROLS.md, Control 3). A gate written the
 * same week as the thing it guards has never been tested against a tree where it should stay
 * quiet.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const advisory = args.includes('--advisory');
const manifestArg = args.find((a) => !a.startsWith('--')) ?? './package.json';
const manifestPath = path.resolve(process.cwd(), manifestArg);
const projectDir = path.dirname(manifestPath);
const modulesDir = path.join(projectDir, 'node_modules');

/** Spec prefixes that mean "npm did not resolve this from a registry". */
const LOCAL_SPEC_PREFIXES = ['file:', 'link:', 'portal:'];

/**
 * Every map a dependency can be declared in. `overrides` and `resolutions` are included beyond
 * the four dependency maps because an override can pin a TRANSITIVE package to a local path,
 * which reaches the bundle by exactly the same route while leaving the four maps clean.
 */
const DEPENDENCY_MAPS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const OVERRIDE_MAPS = ['overrides', 'resolutions'];

if (!fs.existsSync(manifestPath)) {
  console.error(`assert-no-local-dep-specs: no manifest at ${manifestPath}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error(`assert-no-local-dep-specs: ${manifestPath} is not valid JSON — ${error.message}`);
  process.exit(1);
}

const findings = [];
const declared = new Set();

for (const map of DEPENDENCY_MAPS) {
  const entries = manifest[map];
  if (!entries || typeof entries !== 'object') continue;
  for (const [name, spec] of Object.entries(entries)) {
    declared.add(name);
    if (typeof spec !== 'string') continue;
    const prefix = LOCAL_SPEC_PREFIXES.find((p) => spec.startsWith(p));
    if (prefix) {
      findings.push({
        kind: 'spec',
        name,
        detail: `${map}["${name}"] = "${spec}"`,
        why: `the spec begins with "${prefix}", so npm resolves it from the local filesystem instead of the registry.`,
      });
    }
  }
}

/** Overrides nest arbitrarily deep; walk them rather than assuming one level. */
function walkOverrides(node, map, trail) {
  if (typeof node === 'string') {
    const prefix = LOCAL_SPEC_PREFIXES.find((p) => node.startsWith(p));
    if (prefix) {
      findings.push({
        kind: 'spec',
        name: trail[trail.length - 1] ?? map,
        detail: `${map}${trail.map((t) => `["${t}"]`).join('')} = "${node}"`,
        why: `an override pins this package to a local path ("${prefix}"), which reaches the bundle exactly as a top-level local spec would.`,
      });
    }
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) walkOverrides(value, map, [...trail, key]);
  }
}
for (const map of OVERRIDE_MAPS) walkOverrides(manifest[map], map, []);

/**
 * The filesystem half. Two passes:
 *   1. every DECLARED dependency whose node_modules entry is a symlink;
 *   2. every top-level node_modules entry that is a symlink, declared or not — because
 *      `npm link <pkg>` in the consumer creates the symlink without touching the manifest,
 *      so pass 1 alone could not see it.
 * Scoped packages live one level deeper, so @scope directories are descended into.
 */
function symlinkFindings() {
  if (!fs.existsSync(modulesDir)) return;

  const seen = new Set();
  const record = (name, target) => {
    if (seen.has(name)) return;
    seen.add(name);
    findings.push({
      kind: 'symlink',
      name,
      detail: `node_modules/${name} -> ${target}`,
      why: declared.has(name)
        ? 'the manifest spec looks ordinary but the installed package is a symlink, which is the trace `npm link` leaves.'
        : 'a symlinked package that the manifest does not declare at all — `npm link` in the consumer creates exactly this and touches nothing else.',
    });
  };

  const inspect = (name) => {
    const entryPath = path.join(modulesDir, name);
    let stat;
    try {
      stat = fs.lstatSync(entryPath);
    } catch {
      return;
    }
    if (stat.isSymbolicLink()) {
      let target = '(unreadable)';
      try {
        target = fs.readlinkSync(entryPath);
      } catch {
        /* keep the placeholder */
      }
      record(name, target);
    }
  };

  for (const name of declared) inspect(name);

  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (entry.name === '.bin' || entry.name.startsWith('.')) continue;
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(modulesDir, entry.name);
      if (!fs.statSync(scopeDir).isDirectory()) continue;
      for (const scoped of fs.readdirSync(scopeDir)) inspect(`${entry.name}/${scoped}`);
      continue;
    }
    inspect(entry.name);
  }
}
symlinkFindings();

const label = advisory ? 'ADVISORY' : 'SHIP REFUSED';

if (findings.length > 0) {
  const log = advisory ? console.log : console.error;
  log('');
  log('══════════════════════════════════════════════════════════════════════════════════');
  log(`  ${label} — FND-05: a dependency was not resolved from a registry`);
  log('══════════════════════════════════════════════════════════════════════════════════');
  log('');
  log(`  manifest: ${manifestPath}`);
  log('');
  for (const finding of findings) {
    log(`  ✖ ${finding.name}`);
    log(`      ${finding.detail}`);
    log(`      ${finding.why}`);
    log('');
  }
  log('  WHY THIS MATTERS:');
  log('');
  log('    A locally-pathed or symlinked package is not copied into node_modules — it is');
  log('    referenced where it sits, and it resolves its own dependencies through its own');
  log('    node_modules. For a React component library that means TWO COPIES OF REACT in one');
  log('    page: hooks are read from a different module instance than the one that rendered,');
  log('    and you get "Invalid hook call" errors that are intermittent and can vanish on a');
  log('    refresh. It also means CI built from a directory that only exists on one machine.');
  log('');
  log('  WHAT IS ALLOWED DURING DEVELOPMENT:');
  log('');
  log('    A packed tarball — `npm pack` in ../design-system, then a file:*.tgz spec — is the');
  log('    sanctioned workflow, because npm COPIES a tarball rather than symlinking it. That is');
  log('    why this gate runs on the ship path only, and why everyday CI runs it with');
  log('    --advisory. Publish the package and depend on the published version to ship.');
  log('');

  if (advisory) {
    log(`  ${findings.length} finding(s). Advisory mode: reporting, not blocking. Exit 0.`);
    log('');
    process.exit(0);
  }
  log(`  ${findings.length} finding(s). Requirement FND-05; threat T-02-26.`);
  log('');
  process.exit(1);
}

const modeNote = advisory ? ' (advisory mode — would report, not block)' : '';
console.log(`assert-no-local-dep-specs: PASS${modeNote}`);
console.log(`  manifest: ${manifestPath}`);
console.log(
  `  ${declared.size} declared dependenc(ies) across ${DEPENDENCY_MAPS.join(', ')} — no file:, link: or portal: spec`
);
console.log(
  `  ${OVERRIDE_MAPS.join(' / ')}: ${OVERRIDE_MAPS.some((m) => manifest[m]) ? 'present, no local spec inside' : 'none declared'}`
);
console.log(
  fs.existsSync(modulesDir)
    ? '  node_modules: no top-level entry is a symlink'
    : '  node_modules: absent — the symlink half of this gate had nothing to inspect'
);
