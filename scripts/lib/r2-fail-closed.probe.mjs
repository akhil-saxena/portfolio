#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MODULE_UNDER_TEST = join(HERE, 'r2.mjs');

const dummyFor = (name) => `probe-dummy-${name.toLowerCase()}-0123456789`;

const MAX_BOOTSTRAP_ROUNDS = 12;

const out = (line) => process.stdout.write(`${line}\n`);

class ProbeRefusal extends Error {}

function namedVariable(message) {
  const match = /\b([A-Z][A-Z0-9_]{2,})\b/.exec(String(message ?? ''));
  return match === null ? null : match[1];
}

let importCounter = 0;
async function freshImport(specifier) {
  importCounter += 1;
  return import(`${pathToFileURL(specifier).href}?probe=${importCounter}`);
}

function seedEnv(values, allNames) {
  for (const name of allNames) delete process.env[name];
  for (const [name, value] of Object.entries(values)) process.env[name] = value;
}

/**
 * Phase 0. Learn what the module requires by asking it, then read what it declares.
 *
 * @returns {Promise<{ declared: string[], discovered: string[] }>}
 */
async function bootstrap(specifier) {
  /** @type {Record<string,string>} */
  const seeded = {};
  const discovered = [];

  for (let round = 0; round <= MAX_BOOTSTRAP_ROUNDS; round += 1) {
    seedEnv(seeded, [...discovered]);
    try {
      const namespace = await freshImport(specifier);
      const declared = namespace.REQUIRED_ENV;
      if (!Array.isArray(declared) || declared.length === 0) {
        throw new ProbeRefusal(
          `${specifier} imported cleanly but exports REQUIRED_ENV = ${JSON.stringify(declared)}. ` +
            `An empty or absent list makes every per-variable check below loop over nothing, so ` +
            `this probe would report a fail-closed module having tested no variable at all. ` +
            `Refusing.`
        );
      }
      for (const name of declared) {
        if (typeof name !== 'string' || name.length === 0) {
          throw new ProbeRefusal(
            `${specifier} exports a REQUIRED_ENV entry that is not a non-empty string ` +
              `(${JSON.stringify(name)}). Refusing.`
          );
        }
      }
      return { declared: [...declared], discovered };
    } catch (error) {
      if (error instanceof ProbeRefusal) throw error;
      const name = namedVariable(error.message);
      if (name === null) {
        throw new ProbeRefusal(
          `${specifier} refused to import and its message names no environment variable: ` +
            `${JSON.stringify(String(error.message).slice(0, 300))}. This probe cannot discover ` +
            `what to seed, and — more to the point — neither can whoever has to fix the workflow. ` +
            `Refusing.`
        );
      }
      if (name in seeded) {
        throw new ProbeRefusal(
          `${specifier} refused to import naming ${name}, which is ALREADY seeded to a non-empty ` +
            `value. The message does not describe the actual cause. Refusing.`
        );
      }
      seeded[name] = dummyFor(name);
      discovered.push(name);
    }
  }
  throw new ProbeRefusal(
    `${specifier} still refused to import after ${MAX_BOOTSTRAP_ROUNDS} rounds of seeding ` +
      `(${discovered.join(', ')}). Refusing.`
  );
}

/**
 * Phases 1 and 2. Returns a findings list — empty means the module fails closed on every declared
 * variable, and names it when it does.
 *
 * @returns {Promise<{ findings: string[], declared: string[], discovered: string[], checked: number }>}
 */
async function probeModule(specifier) {
  const snapshot = { ...process.env };
  try {
    return await probeModuleInner(specifier);
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

/** @returns {Promise<{ findings: string[], declared: string[], discovered: string[], checked: number }>} */
async function probeModuleInner(specifier) {
  const { declared, discovered } = await bootstrap(specifier);
  const findings = [];

  for (const name of discovered) {
    if (!declared.includes(name)) {
      findings.push(
        `${name} is ENFORCED at import but is absent from REQUIRED_ENV. A requirement nobody ` +
          `can enumerate is one the workflow author will not set.`
      );
    }
  }

  const allNames = [...new Set([...declared, ...discovered])];
  let checked = 0;

  for (const name of declared) {
    /** @type {Record<string,string>} */
    const values = {};
    for (const other of allNames) values[other] = dummyFor(other);
    values[name] = ''; // exactly one, and EMPTY rather than absent — that is the branch under test
    seedEnv(values, allNames);

    checked += 1;
    let thrown = null;
    try {
      await freshImport(specifier);
    } catch (error) {
      thrown = error;
    }

    if (thrown === null) {
      findings.push(
        `${name} was emptied and ${specifier} imported CLEANLY — it fails OPEN. A job that ` +
          `imported this module without ${name} would go on to skip the upload and commit the ` +
          `record anyway (T-04-47).`
      );
      continue;
    }
    const message = String(thrown.message ?? '');
    if (!message.includes(name)) {
      findings.push(
        `${name} was emptied and ${specifier} threw, but the message does not name ${name}: ` +
          `${JSON.stringify(message.slice(0, 200))}. A refusal that does not say which variable ` +
          `is missing sends the reader back to the source.`
      );
    }
  }

  if (checked === 0) {
    throw new ProbeRefusal(
      `${specifier} declares ${declared.length} variable(s) but zero were checked. Refusing.`
    );
  }

  return { findings, declared, discovered, checked };
}

const FIXTURES = {
  honest: `
export const REQUIRED_ENV = Object.freeze(['PROBE_ALPHA', 'PROBE_BETA']);
for (const name of REQUIRED_ENV) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(\`fixture: \${name} is missing or empty\`);
  }
}
`,
  'fail-open': `
export const REQUIRED_ENV = Object.freeze(['PROBE_ALPHA', 'PROBE_BETA']);
// asserts nothing — the fail-open defect
`,
  vague: `
export const REQUIRED_ENV = Object.freeze(['PROBE_ALPHA', 'PROBE_BETA']);
for (const name of REQUIRED_ENV) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('fixture: credentials are missing');
  }
}
`,
  'vague-on-empty': `
export const REQUIRED_ENV = Object.freeze(['PROBE_ALPHA', 'PROBE_BETA']);
for (const name of REQUIRED_ENV) {
  const value = process.env[name];
  if (value === undefined) throw new Error(\`fixture: \${name} is not set\`);
  if (value.trim().length === 0) throw new Error('fixture: a credential is empty');
}
`,
  'empty-list': `
export const REQUIRED_ENV = Object.freeze([]);
`,
};

async function selfTest() {
  const scratch = mkdtempSync(join(tmpdir(), 'gsd-r2-probe-'));
  const failures = [];
  try {
    for (const [name, source] of Object.entries(FIXTURES)) {
      const file = join(scratch, `${name}.mjs`);
      writeFileSync(file, source);

      let refusal = null;
      let result = null;
      try {
        result = await probeModule(file);
      } catch (error) {
        if (!(error instanceof ProbeRefusal)) throw error;
        refusal = error;
      }

      if (name === 'empty-list' || name === 'vague') {
        if (refusal === null) {
          failures.push(`${name}: expected a REFUSAL, got ${JSON.stringify(result?.findings)}`);
        } else {
          out(`  self-test ${name.padEnd(14)} -> REFUSED, correctly`);
        }
        continue;
      }
      if (refusal !== null) {
        failures.push(`${name}: unexpected refusal — ${refusal.message}`);
        continue;
      }
      const found = result?.findings ?? [];
      const expectFindings = name !== 'honest';
      if (expectFindings && found.length !== 2) {
        failures.push(
          `${name}: expected one finding per declared variable (2), got ${found.length}: ` +
            JSON.stringify(found)
        );
      } else if (expectFindings) {
        for (const variable of ['PROBE_ALPHA', 'PROBE_BETA']) {
          if (!found.some((f) => f.includes(variable))) {
            failures.push(`${name}: findings do not name ${variable} — ${JSON.stringify(found)}`);
          }
        }
        out(`  self-test ${name.padEnd(14)} -> FAILED, correctly, naming both variables`);
      } else if (found.length !== 0) {
        failures.push(`honest: expected no findings, got ${JSON.stringify(found)}`);
      } else {
        out(`  self-test ${name.padEnd(14)} -> PASSED, correctly (2 variable(s) checked)`);
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return failures;
}

async function main() {
  const wantSelfTest = process.argv.slice(2).includes('--self-test');
  const snapshot = { ...process.env };

  try {
    if (wantSelfTest) {
      out('r2-fail-closed: SELF-TEST — the checker itself, proven able to fail');
      const failures = await selfTest();
      if (failures.length > 0) {
        for (const failure of failures) process.stderr.write(`  x ${failure}\n`);
        process.stderr.write(
          'r2-fail-closed: SELF-TEST FAILED — the checker does not behave as its header claims, ' +
            'so its verdict on the real module means nothing.\n'
        );
        return 1;
      }
      out(
        `r2-fail-closed: SELF-TEST PASSED — ${Object.keys(FIXTURES).length} synthetic module(s), ` +
          `each behaving as stated\n`
      );
    }

    const { findings, declared, discovered, checked } = await probeModule(MODULE_UNDER_TEST);

    if (findings.length > 0) {
      process.stderr.write(
        `r2-fail-closed: FAIL — ${MODULE_UNDER_TEST} does not deny on a missing configuration:\n`
      );
      for (const finding of findings) process.stderr.write(`  x ${finding}\n`);
      return 1;
    }

    out('r2-fail-closed: PASS');
    out(`  module:     ${MODULE_UNDER_TEST}`);
    out(`  declared:   REQUIRED_ENV = [${declared.join(', ')}]`);
    out(`  discovered: enforced at import = [${discovered.join(', ')}]`);
    out(
      `  checked:    ${checked} variable(s), each re-seeding all ${declared.length} and emptying ` +
        `exactly one`
    );
    out('  each one threw at import, naming the emptied variable (T-04-47, CLAUDE.md fail-closed)');
    return 0;
  } catch (error) {
    if (error instanceof ProbeRefusal) {
      process.stderr.write(`r2-fail-closed: REFUSED — ${error.message}\n`);
      return 1;
    }
    throw error;
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

process.exit(await main());
