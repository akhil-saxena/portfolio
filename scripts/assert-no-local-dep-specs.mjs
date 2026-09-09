#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const advisory = args.includes('--advisory');
const manifestArg = args.find((a) => !a.startsWith('--')) ?? './package.json';
const manifestPath = path.resolve(process.cwd(), manifestArg);
const projectDir = path.dirname(manifestPath);
const modulesDir = path.join(projectDir, 'node_modules');

const LOCAL_SPEC_PREFIXES = ['file:', 'link:', 'portal:'];

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
      } catch {}
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
