import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RELATIVE = '.github/workflows/migrate-photo-keys.yml';
const source = readFileSync(`${REPO_ROOT}${RELATIVE}`, 'utf8');
type Step = {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
};
type Workflow = {
  name?: string;
  on?: Record<string, { inputs?: Record<string, Record<string, unknown>> }>;
  permissions?: Record<string, string>;
  concurrency?: Record<string, unknown>;
  jobs?: Record<string, { steps?: Step[] }>;
};

const doc = parse(source) as Workflow;

const steps: Step[] = Object.values(doc.jobs ?? {}).flatMap((job) =>
  Array.isArray(job.steps) ? job.steps : []
);

const stepText = (step: Step) => JSON.stringify(step);

describe('the file parses and declares one trigger', () => {
  it('is a mapping with jobs and steps — the anti-vacuity floor for every loop below', () => {
    expect(doc).toBeTruthy();
    expect(typeof doc).toBe('object');
    expect(steps.length).toBeGreaterThan(4);
  });

  it('is dispatch-only: no push, no schedule, no workflow_run', () => {
    expect(Object.keys(doc.on ?? {})).toEqual(['workflow_dispatch']);
  });

  it('offers exactly the three phases, defaulting to the read-only one', () => {
    const inputs = doc.on?.workflow_dispatch?.inputs;
    expect(inputs, 'the workflow declares no dispatch inputs').toBeTruthy();
    const phase = (inputs ?? {}).phase as Record<string, unknown>;
    expect(phase.type).toBe('choice');
    expect(phase.options).toEqual(['plan', 'publish', 'sweep']);
    expect(phase.default).toBe('plan');
    expect(phase.required).toBe(true);
  });
});

describe('the credential surface', () => {
  it('declares workflow-level permissions, and they are read-only', () => {
    expect(doc.permissions).toEqual({ contents: 'read' });
  });

  it('names no secret at workflow or job level, where every step could read it', () => {
    const workflowLevel = JSON.stringify({ ...doc, jobs: undefined });
    expect(workflowLevel).not.toContain('secrets.');
    for (const [name, job] of Object.entries(doc.jobs ?? {})) {
      const jobLevel = JSON.stringify({ ...job, steps: undefined });
      expect(jobLevel, `job ${name} carries a secret above its steps`).not.toContain('secrets.');
    }
  });

  it('scopes the Cloudflare credentials to the two steps that cause side effects', () => {
    const holders = steps.filter((s) => stepText(s).includes('secrets.CLOUDFLARE_API_TOKEN'));
    expect(holders.map((s) => s.name)).toEqual([
      'Copy the objects and repoint the manifest',
      'Delete the old objects',
    ]);
    for (const step of holders) {
      expect(stepText(step)).toContain('secrets.CLOUDFLARE_ACCOUNT_ID');
    }
  });

  it('scopes the App key to the minting step alone', () => {
    const holders = steps.filter((s) => stepText(s).includes('PHOTO_PIPELINE_APP_PRIVATE_KEY'));
    expect(holders).toHaveLength(1);
    expect(holders[0].name).toBe('Mint the push token');
    const mintIndex = steps.findIndex((s) => s.name === 'Mint the push token');
    const planIndex = steps.findIndex((s) => s.name === 'Plan');
    expect(mintIndex).toBeGreaterThan(planIndex);
  });

  it('trims both Cloudflare values before exporting them', () => {
    for (const step of steps.filter((s) => stepText(s).includes('CLOUDFLARE_API_TOKEN'))) {
      if (typeof step.run !== 'string') continue;
      expect(step.run, `${step.name} does not trim the token`).toContain("tr -d '[:space:]'");
    }
  });

  it('never echoes a credential', () => {
    for (const step of steps) {
      if (typeof step.run !== 'string') continue;
      expect(step.run, `${step.name} echoes a credential`).not.toMatch(
        /echo[^\n]*\$(\{)?CLOUDFLARE/
      );
    }
  });
});

describe('no caller-supplied text becomes shell source', () => {
  it('interpolates nothing into any run block', () => {
    for (const step of steps) {
      if (typeof step.run !== 'string') continue;
      expect(step.run, `${step.name} interpolates into its run block`).not.toMatch(/\$\{\{/);
    }
  });

  it('reads the sweep confirmation from env, not from an interpolation', () => {
    const guard = steps.find((s) => s.name === 'Refuse an unconfirmed sweep');
    expect(guard, 'no sweep guard step').toBeTruthy();
    expect(guard?.env?.CONFIRM).toBe('${{ inputs.confirm }}');
    expect(guard?.run).toContain('"$CONFIRM"');
  });
});

describe('the destructive phase is gated', () => {
  it('checks the confirmation FIRST, before checkout or install', () => {
    expect(steps[0].name).toBe('Refuse an unconfirmed sweep');
    expect(steps[0].if).toBe("inputs.phase == 'sweep'");
  });

  it('requires an exact phrase, not a boolean', () => {
    expect(steps[0].run).toContain('DELETE OLD KEYS');
    expect(steps[0].run).toContain('exit 1');
  });

  it('puts copy+repoint and delete in different phases', () => {
    const publish = steps.find((s) => s.name === 'Copy the objects and repoint the manifest');
    const sweep = steps.find((s) => s.name === 'Delete the old objects');
    expect(publish?.if).toBe("inputs.phase == 'publish'");
    expect(sweep?.if).toBe("inputs.phase == 'sweep'");
    expect(publish?.if).not.toBe(sweep?.if);
  });

  it('gates the manifest commit behind the content gate', () => {
    const publish = steps.find((s) => s.name === 'Copy the objects and repoint the manifest');
    const run = String(publish?.run);
    const syncAt = run.indexOf('astro sync');
    const commitAt = run.indexOf('git commit');
    expect(syncAt, 'the publish step does not run the content gate').toBeGreaterThan(-1);
    expect(commitAt).toBeGreaterThan(syncAt);
  });

  it('commits the journal with the manifest — sweep runs in a later process', () => {
    const publish = steps.find((s) => s.name === 'Copy the objects and repoint the manifest');
    expect(String(publish?.run)).toContain('.migration/photo-keys.json');
  });
});

describe('serialisation and pinning', () => {
  it('serialises runs and never cancels one in flight', () => {
    expect(doc.concurrency?.group).toBeTruthy();
    expect(doc.concurrency?.['cancel-in-progress']).toBe(false);
  });

  it('pins every action to a full commit SHA', () => {
    const uses = steps.map((s) => s.uses).filter((u): u is string => typeof u === 'string');
    expect(uses.length).toBeGreaterThan(0);
    for (const value of uses) {
      expect(value, `${value} is not pinned to a SHA`).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it('pins the SAME revisions the other workflows do', () => {
    const others = ['ci.yml', 'deploy.yml', 'process-photos.yml'].flatMap((name) => {
      const other = parse(
        readFileSync(`${REPO_ROOT}.github/workflows/${name}`, 'utf8')
      ) as Workflow;
      return Object.values(other.jobs ?? {}).flatMap((job) =>
        (Array.isArray(job.steps) ? job.steps : []).map((s) => s.uses)
      );
    });
    const pinOf = (list: unknown[], action: string) =>
      list.filter((u): u is string => typeof u === 'string' && u.startsWith(`${action}@`));

    let shared = 0;
    for (const value of steps
      .map((s) => s.uses)
      .filter((u): u is string => typeof u === 'string')) {
      const action = value.split('@')[0] as string;
      const elsewhere = new Set(pinOf(others, action));
      if (elsewhere.size === 0) continue;
      shared += 1;
      expect([...elsewhere], `${action} is pinned differently elsewhere`).toContain(value);
    }
    expect(shared).toBeGreaterThan(0);
  });

  it('checks out with full history and no ambient credential', () => {
    const checkout = steps.find((s) => String(s.uses).startsWith('actions/checkout@'));
    expect(checkout?.with?.['fetch-depth']).toBe(0);
    expect(checkout?.with?.['persist-credentials']).toBe(false);
  });

  it('names no legacy image origin', () => {
    expect(source).not.toMatch(/\.r2\.dev/i);
  });
});
