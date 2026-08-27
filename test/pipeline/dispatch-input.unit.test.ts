/**
 * The dispatch-input validator (plan 04-08, Task 2).
 *
 * WHAT IS BEING ASSERTED, AND WHY IT IS ASSERTED BEFORE ANYTHING ELSE RUNS
 * -----------------------------------------------------------------------
 * `workflow_dispatch` inputs are the pipeline's whole attack surface: anyone who can write to
 * this repository can dispatch it, their `temp_key` becomes a path in a bucket the job holds
 * write credentials for (T-04-34), and their `title`/`alt` become committed content on `main`.
 * So every input is refused or accepted BEFORE a single R2 byte is read — a bad dispatch then
 * costs one workflow start and nothing else.
 *
 * THE SUITE'S RE-IMPLEMENTATION CONVENTION APPLIES
 * -----------------------------------------------
 * `test/content/photo-enrichment.unit.test.ts`: *"Importing the merge's own parser would make
 * this file assert that the merge agrees with itself."* So every expected key name, every legal
 * category id and every fixture string below is TYPED OUT here rather than read from the module
 * under test. Two imports are deliberately the opposite of circular, because they are the OTHER
 * side of an agreement this file exists to check:
 *
 *   - `DISPATCH_INPUTS` from `src/lib/photo-pipeline.ts` — the contract the validator must not be
 *     allowed to drift from. It is fed to `assertRuleCoverage` MUTATED, which is what turns
 *     "the required set is derived" from a claim into a demonstration.
 *   - `PhotoSchema` from `src/schemas/photo.ts` — the authority on the committed record. The
 *     validator's job on `alt` is to refuse EARLIER and MORE OFTEN than the schema, never less
 *     often, and that relationship is asserted directly rather than by re-typing the schema's
 *     rules.
 *
 * THE OD-2b GAP IS MEASURED HERE, NOT ASSUMED
 * -------------------------------------------
 * Plan 04-08 as written said `alt: "TODO"` is accepted "and that is the measured, intended
 * behaviour". That was true of `PhotoSchema`'s four rules and it is still true — this file
 * proves it, by parsing a real record with `alt: "TODO"` and watching the schema accept it. What
 * changed afterwards is OD-2b, decided in the same review: the DISPATCH validator refuses it.
 * Both facts are asserted, side by side, because the gap is the entire justification for OD-2b.
 *
 * AND THE ACCEPTED RESIDUALS ARE ASSERTED TOO
 * -------------------------------------------
 * `"TODO add real alt text here"`, `"XXX marks the spot…"` and `"??? what even is this shot"`
 * pass. That is recorded in `photo-pipeline.ts`'s own comment and accepted by Akhil: closing the
 * first means refusing `"Todo el mundo crowds the square…"`, a legitimate Spanish caption. A
 * test that only listed the catches would let a later "improvement" tighten the rule and redden
 * real alt text with nothing to stop it, so the ACCEPTED cases are pinned as hard as the refused
 * ones — together with all 39 reviewed values from the committed manifest.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  assertRuleCoverage,
  DEFAULT_SITE_CONFIG_PATH,
  DispatchInputError,
  envVarNameFor,
  inputsFromEnv,
  RULE_NAMES,
  readCategoryIds,
  requiredInputNames,
  validateDispatchInputs,
} from '../../scripts/lib/dispatch-input.mjs';
import { DISPATCH_INPUTS } from '../../src/lib/photo-pipeline';
import { PhotoSchema } from '../../src/schemas/photo';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (relative: string): string => readFileSync(`${REPO_ROOT}${relative}`, 'utf8');

const MODULE_RELATIVE = 'scripts/lib/dispatch-input.mjs';
const MODULE_PATH = `${REPO_ROOT}${MODULE_RELATIVE}`;

/* ============================================================================================
 * Fixtures. Every one of these is typed out, not derived from the module under test.
 * ========================================================================================== */

/** The seven ids in `data/site_config.json` today, re-typed. A drift here is a real failure. */
const LEGAL_CATEGORY_IDS = [
  'abstract',
  'architecture',
  'nature',
  'portraits',
  'product',
  'street',
  'wildlife',
];

/** The five dispatch input names, in declaration order. Re-typed for the same reason. */
const EXPECTED_INPUT_NAMES = ['temp_key', 'category', 'title', 'alt', 'place'];
const EXPECTED_REQUIRED_NAMES = ['temp_key', 'category', 'title', 'alt'];

const VALID = {
  temp_key: 'temp/2026-08-26-riverbend.jpg',
  category: 'nature',
  title: 'Riverbend at first light',
  alt: 'A slow river bends around a gravel bar with mist lifting off the water before sunrise.',
};

/** A record the committed manifest already contains, used as a carrier for `alt` experiments. */
const manifest = JSON.parse(read('data/portfolio_images.json')) as Array<
  Record<string, unknown> & { alt: string; title: string }
>;
const CARRIER = manifest[0];

/** Parse a real record with a substituted `alt`, so the schema's verdict is the schema's own. */
const schemaAccepts = (alt: string): boolean =>
  PhotoSchema.safeParse({ ...CARRIER, alt, title: 'A title that is nothing like the alt' }).success;

/**
 * The findings a refusal carried. Throws if the value was ACCEPTED, so a test that expected a
 * refusal can never pass by the validator having no opinion.
 */
const findingsFor = (raw: unknown, options?: { siteConfigPath?: string }): string[] => {
  let accepted: unknown;
  try {
    accepted = validateDispatchInputs(raw, options);
  } catch (error) {
    if (error instanceof DispatchInputError) return error.findings;
    throw error;
  }
  throw new Error(
    `validateDispatchInputs ACCEPTED a value this test requires it to refuse: ${JSON.stringify(
      accepted
    )}`
  );
};

/** The finding that names one input, or a failure that says which findings were there instead. */
const findingFor = (raw: unknown, input: string, options?: { siteConfigPath?: string }): string => {
  const findings = findingsFor(raw, options);
  const match = findings.find((f) => f.startsWith(`${input}:`));
  if (match === undefined) {
    throw new Error(
      `no finding named ${input}. Findings were:\n  ${findings.join('\n  ') || '(none)'}`
    );
  }
  return match;
};

const tempDirs: string[] = [];
const writeSiteConfig = (categories: Array<{ id: string }>): string => {
  const dir = mkdtempSync(join(tmpdir(), 'dispatch-input-'));
  tempDirs.push(dir);
  const file = join(dir, 'site_config.json');
  writeFileSync(file, JSON.stringify({ categories, defaultColumns: 3 }, null, 2));
  return file;
};

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/* ============================================================================================
 * 1. Anti-vacuity: the empty dispatch, and where the required set comes from.
 * ========================================================================================== */

describe('the required set is derived from DISPATCH_INPUTS, not typed into the validator', () => {
  it('names every required input when given nothing at all', () => {
    const findings = findingsFor({});
    for (const name of EXPECTED_REQUIRED_NAMES) {
      expect(findings.some((f) => f.startsWith(`${name}:`))).toBe(true);
    }
    // Exactly the required ones: `place` is optional, so an empty dispatch is not a place error.
    expect(findings).toHaveLength(EXPECTED_REQUIRED_NAMES.length);
    expect(findings.some((f) => f.startsWith('place:'))).toBe(false);
  });

  it('reports the required names in DISPATCH_INPUTS order', () => {
    expect(requiredInputNames()).toEqual(EXPECTED_REQUIRED_NAMES);
  });

  it('has one rule per declared input, in declaration order', () => {
    expect([...RULE_NAMES]).toEqual(EXPECTED_INPUT_NAMES);
    expect(DISPATCH_INPUTS.map((i) => i.name)).toEqual(EXPECTED_INPUT_NAMES);
  });

  it('refuses to load if an input gains a declaration but no rule', () => {
    const grown = [
      ...DISPATCH_INPUTS,
      { name: 'shutter_delay', required: true, description: 'a newly declared input' },
    ];
    expect(() => assertRuleCoverage(grown, RULE_NAMES)).toThrow(/shutter_delay/);
  });

  it('refuses to load if a rule outlives the input it validated', () => {
    const shrunk = DISPATCH_INPUTS.filter((i) => i.name !== 'place');
    expect(() => assertRuleCoverage(shrunk, RULE_NAMES)).toThrow(/place/);
  });

  it('is satisfied by the pair as they actually ship', () => {
    expect(() => assertRuleCoverage(DISPATCH_INPUTS, RULE_NAMES)).not.toThrow();
  });

  it('accepts a complete, well-formed dispatch', () => {
    expect(validateDispatchInputs(VALID)).toEqual(VALID);
  });

  it('rejects an input nobody declared', () => {
    const finding = findingFor({ ...VALID, colour_profile: 'srgb' }, 'colour_profile');
    expect(finding).toMatch(/colour_profile/);
  });
});

/* ============================================================================================
 * 2. temp_key — the input that becomes a bucket path.  (T-04-34)
 * ========================================================================================== */

describe('temp_key', () => {
  it.each([['temp/2026-08-26-riverbend.jpg'], ['temp/a/b/c.jpg']])('accepts %s', (key) => {
    expect(validateDispatchInputs({ ...VALID, temp_key: key }).temp_key).toBe(key);
  });

  it.each([
    ['photos/x.webp', 'outside the staging prefix'],
    ['temp/../secrets', 'parent traversal'],
    ['temp/a/../../x', 'traversal mid-key'],
    ['/temp/x.jpg', 'absolute'],
    ['temp/', 'empty remainder'],
    ['Temp/x.jpg', 'a different case of the prefix'],
    ['temp/x\\y.jpg', 'a backslash separator'],
    ['', 'the empty string'],
  ])('rejects %j (%s)', (key) => {
    const finding = findingFor({ ...VALID, temp_key: key }, 'temp_key');
    expect(finding).toContain('temp/');
  });

  it('rejects a key past R2 1,024-byte ceiling, naming the ceiling', () => {
    const key = `temp/${'a'.repeat(1100)}.jpg`;
    const finding = findingFor({ ...VALID, temp_key: key }, 'temp_key');
    expect(finding).toContain('1024');
  });

  it('rejects a non-string', () => {
    expect(findingFor({ ...VALID, temp_key: 42 }, 'temp_key')).toMatch(/number/);
  });

  it('does not echo a hostile key back at full length', () => {
    // Long, invalid (the backslash), and under the byte ceiling — so it reaches the branch that
    // quotes the offending value. A public workflow log must not be floodable from an input.
    const hostile = `temp/${'x/'.repeat(400)}\\y.jpg`;
    const finding = findingFor({ ...VALID, temp_key: hostile }, 'temp_key');
    expect(finding).not.toContain(hostile);
    expect(finding.length).toBeLessThan(hostile.length);
  });
});

/* ============================================================================================
 * 3. category — RI-1's comparison, with no case transform on either side.
 * ========================================================================================== */

describe('category', () => {
  it.each(LEGAL_CATEGORY_IDS.map((id) => [id]))('accepts the real id %s', (id) => {
    expect(validateDispatchInputs({ ...VALID, category: id }).category).toBe(id);
  });

  it.each([['Nature'], ['archtecture'], [''], [' nature'], ['nature ']])(
    'rejects %j',
    (category) => {
      const finding = findingFor({ ...VALID, category }, 'category');
      for (const id of LEGAL_CATEGORY_IDS) expect(finding).toContain(id);
    }
  );

  it('reads the legal ids from site_config at validation time', () => {
    const siteConfigPath = writeSiteConfig([{ id: 'aurora' }, { id: 'tidal' }]);
    expect(validateDispatchInputs({ ...VALID, category: 'aurora' }, { siteConfigPath })).toEqual({
      ...VALID,
      category: 'aurora',
    });
    // The proof that nothing is hardcoded: a real id becomes illegal against a config without it.
    expect(findingFor({ ...VALID, category: 'nature' }, 'category', { siteConfigPath })).toContain(
      'aurora'
    );
  });

  it('fails loudly rather than passing everything when site_config cannot be read', () => {
    expect(() =>
      validateDispatchInputs(VALID, { siteConfigPath: join(tmpdir(), 'no-such-config.json') })
    ).toThrow(/no-such-config\.json/);
  });

  it('refuses a site_config with no categories rather than refusing every value', () => {
    const siteConfigPath = writeSiteConfig([]);
    expect(() => validateDispatchInputs(VALID, { siteConfigPath })).toThrow(/categor/i);
  });

  it('defaults to the committed site_config', () => {
    expect(DEFAULT_SITE_CONFIG_PATH).toMatch(/site_config\.json$/);
    expect(readCategoryIds(DEFAULT_SITE_CONFIG_PATH)).toEqual(LEGAL_CATEGORY_IDS);
  });
});

/* ============================================================================================
 * 4. title.
 * ========================================================================================== */

describe('title', () => {
  it.each([[''], ['   '], ['\t\n']])('rejects %j', (title) => {
    expect(findingFor({ ...VALID, title }, 'title')).toMatch(/empty|whitespace/i);
  });

  it('accepts a real title verbatim, without trimming it into shape', () => {
    const title = 'Riverbend at first light';
    expect(validateDispatchInputs({ ...VALID, title }).title).toBe(title);
  });
});

/* ============================================================================================
 * 5. alt — PhotoSchema's four rules, applied here so a bad value costs nothing (OD-2).
 * ========================================================================================== */

describe("alt — PhotoSchema's four content rules, enforced before any R2 read", () => {
  it.each([[''], ['    '], ['\n\t ']])('rule 1, empty or whitespace only: rejects %j', (alt) => {
    expect(findingFor({ ...VALID, alt }, 'alt')).toMatch(/empty|whitespace/i);
  });

  it('rule 2, duplicates the title case- and whitespace-insensitively', () => {
    const raw = {
      ...VALID,
      title: 'Riverbend at first light',
      alt: '  riverbend   AT first  LIGHT ',
    };
    expect(findingFor(raw, 'alt')).toMatch(/title/i);
    expect(schemaAccepts('  riverbend   AT first  LIGHT ')).toBe(true); // different carrier title
  });

  it.each([
    ['Image of a river bending around a gravel bar before sunrise.'],
    ['photo of a river bending around a gravel bar before sunrise.'],
    ['Picture of a river bending around a gravel bar before sunrise.'],
    ['IMAGE OF a river bending around a gravel bar before sunrise.'],
  ])('rule 3, role prefix: rejects %j', (alt) => {
    expect(findingFor({ ...VALID, alt }, 'alt')).toMatch(/role prefix/i);
    // The schema refuses it too — this validator is the earlier, cheaper copy of that rule.
    expect(schemaAccepts(alt)).toBe(false);
  });

  it('rule 4, a brief marker that never got replaced', () => {
    const alt = 'A river bends around a gravel bar [AKHIL-ALT] before sunrise.';
    expect(findingFor({ ...VALID, alt }, 'alt')).toMatch(/marker/i);
    expect(schemaAccepts(alt)).toBe(false);
  });
});

describe('alt — OD-2b, the placeholder refusal the four rules do not make', () => {
  it('MEASURES the gap: PhotoSchema accepts alt "TODO"', () => {
    expect(schemaAccepts('TODO')).toBe(true);
  });

  it('and the dispatch validator closes it', () => {
    expect(findingFor({ ...VALID, alt: 'TODO' }, 'alt')).toMatch(/placeholder/i);
  });

  it.each([
    ['todo'],
    ['TBD'],
    ['FIXME'],
    ['xxx'],
    ['???'],
    ['alt'],
    ['Photo'],
    ['image'],
    ['PICTURE'],
    ['TODO.'],
    ['  tbd  '],
  ])('refuses the bare placeholder %j', (alt) => {
    expect(findingFor({ ...VALID, alt }, 'alt')).toMatch(/placeholder/i);
  });

  it.each([
    ['TODO: write this once the raw file is open in the editor'],
    ['TBD - the light was wrong and this needs another look tomorrow'],
    ['FIXME/ the horizon is not level in this frame and wants a rotate'],
    ['xxx, come back to this one when the series is finished'],
  ])('refuses a leading marker followed by punctuation: %j', (alt) => {
    expect(findingFor({ ...VALID, alt }, 'alt')).toMatch(/marker/i);
  });

  it('refuses a value shorter than the floor, naming the floor', () => {
    expect(findingFor({ ...VALID, alt: 'Short caption' }, 'alt')).toMatch(/15/);
  });

  it('refuses the staged file name pasted into the alt field', () => {
    const raw = {
      ...VALID,
      temp_key: 'temp/2026-08-26-riverbend.jpg',
      alt: '2026-08-26-riverbend',
    };
    expect(findingFor(raw, 'alt')).toMatch(/file name/i);
  });
});

describe('alt — the ACCEPTED residuals, pinned so nobody tightens the rule by accident', () => {
  /**
   * These three are holes, they are known, they are recorded in `photo-pipeline.ts` and they were
   * accepted in review. Tightening the first was tried and rejected because it reddens
   * "Todo el mundo crowds the square…". If a later change makes any of these fail, that change
   * has widened the refusal and must prove the legitimate captions below still pass.
   */
  it.each([
    ['TODO add real alt text here'],
    ['XXX marks the spot where the tide turned over the flats'],
    ['??? what even is this shot, the meter was reading two stops under'],
  ])('accepts the recorded residual %j', (alt) => {
    expect(validateDispatchInputs({ ...VALID, alt }).alt).toBe(alt);
  });

  it.each([
    ['Todo el mundo crowds the square as the evening light drops behind the cathedral.'],
    ['Photo taken from the fort wall at dusk, with the river a flat sheet below.'],
    ['Altocumulus banked over the ridge in long parallel rows ahead of the storm.'],
    ['Image and reflection meet at the waterline where the ferry pulls away.'],
    ['Picture windows along the whole west face catch the last of the sun.'],
    ['A picture of calm: the harbour flat and empty an hour before dawn.'],
    ['Alt markers painted on the rock face count upward toward the summit cairn.'],
  ])('accepts the legitimate caption %j', (alt) => {
    expect(validateDispatchInputs({ ...VALID, alt }).alt).toBe(alt);
  });

  it('accepts every reviewed alt value in the committed manifest', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(39);
    const refused: string[] = [];
    for (const record of manifest) {
      try {
        validateDispatchInputs({ ...VALID, alt: record.alt, title: record.title });
      } catch (error) {
        refused.push(`${record.alt} — ${(error as Error).message}`);
      }
    }
    // console.log is swallowed by this setup; process.stdout.write is not.
    process.stdout.write(
      `[dispatch-input] alt corpus: ${manifest.length} reviewed value(s), ${refused.length} refused\n`
    );
    expect(refused).toEqual([]);
  });
});

/* ============================================================================================
 * 6. place — optional means absent, not empty.
 * ========================================================================================== */

describe('place', () => {
  it('is fine when absent, and stays absent in the result', () => {
    const result = validateDispatchInputs(VALID);
    expect('place' in result).toBe(false);
  });

  it('accepts a real place', () => {
    expect(validateDispatchInputs({ ...VALID, place: 'Munnar' }).place).toBe('Munnar');
  });

  it.each([[''], ['   ']])('rejects present-and-empty %j', (place) => {
    expect(findingFor({ ...VALID, place }, 'place')).toMatch(/empty|whitespace/i);
  });

  it('rejects an explicit undefined the same way it treats an absent key', () => {
    expect(validateDispatchInputs({ ...VALID, place: undefined })).toEqual(VALID);
  });
});

/* ============================================================================================
 * 7. Accumulation — every finding in one pass.
 * ========================================================================================== */

describe('accumulation', () => {
  it('reports all four mistakes at once rather than one dispatch at a time', () => {
    const findings = findingsFor({
      temp_key: 'photos/x.webp',
      category: 'Nature',
      title: '  ',
      alt: 'TODO',
      place: '',
    });
    expect(findings).toHaveLength(5);
    for (const name of EXPECTED_INPUT_NAMES) {
      expect(findings.some((f) => f.startsWith(`${name}:`))).toBe(true);
    }
  });

  it("carries the findings on the error, and the error's message contains them all", () => {
    let caught: unknown;
    try {
      validateDispatchInputs({});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DispatchInputError);
    expect(caught).toBeInstanceOf(Error);
    const error = caught as InstanceType<typeof DispatchInputError>;
    for (const finding of error.findings) expect(error.message).toContain(finding);
  });
});

/* ============================================================================================
 * 8. The environment mapping the workflow uses.
 * ========================================================================================== */

describe('inputsFromEnv', () => {
  it('derives INPUT_<NAME> from the declared name', () => {
    expect(envVarNameFor('temp_key')).toBe('INPUT_TEMP_KEY');
    expect(EXPECTED_INPUT_NAMES.map(envVarNameFor)).toEqual([
      'INPUT_TEMP_KEY',
      'INPUT_CATEGORY',
      'INPUT_TITLE',
      'INPUT_ALT',
      'INPUT_PLACE',
    ]);
  });

  it('maps a full environment onto the input object', () => {
    expect(
      inputsFromEnv({
        INPUT_TEMP_KEY: VALID.temp_key,
        INPUT_CATEGORY: VALID.category,
        INPUT_TITLE: VALID.title,
        INPUT_ALT: VALID.alt,
        INPUT_PLACE: 'Munnar',
      })
    ).toEqual({ ...VALID, place: 'Munnar' });
  });

  it('treats an EMPTY optional variable as absent, because Actions cannot express absence', () => {
    // `${{ inputs.place }}` renders as the empty string when the caller omitted it, and renders
    // as the empty string when the caller passed "". The two are indistinguishable at this
    // boundary; the workflow can only ever mean the first. Recorded, not glossed.
    expect(inputsFromEnv({ ...envFor(VALID), INPUT_PLACE: '' })).toEqual(VALID);
    expect('place' in inputsFromEnv({ ...envFor(VALID), INPUT_PLACE: '  ' })).toBe(true);
  });

  it('keeps an EMPTY required variable, so it is refused rather than reported missing', () => {
    const mapped = inputsFromEnv({ ...envFor(VALID), INPUT_TITLE: '' });
    expect(mapped.title).toBe('');
    expect(findingFor(mapped, 'title')).toMatch(/empty|whitespace/i);
  });

  it('omits a required variable that is not set at all', () => {
    const env = envFor(VALID);
    delete env.INPUT_ALT;
    expect('alt' in inputsFromEnv(env)).toBe(false);
  });
});

function envFor(inputs: typeof VALID): Record<string, string> {
  return {
    INPUT_TEMP_KEY: inputs.temp_key,
    INPUT_CATEGORY: inputs.category,
    INPUT_TITLE: inputs.title,
    INPUT_ALT: inputs.alt,
  };
}

/* ============================================================================================
 * 9. The CLI the workflow step runs.
 * ========================================================================================== */

describe('the CLI entry point', () => {
  /**
   * Every declared INPUT_* is explicitly cleared before `env` is layered on. Inheriting the
   * parent environment is this suite's convention (`build-fails-loudly.node.test.ts`), and it is
   * the right one here too — but a leaked INPUT_ALT would make the "empty environment" case pass
   * for a reason the test did not intend.
   */
  const CLEARED = Object.fromEntries(
    EXPECTED_INPUT_NAMES.map((name) => [`INPUT_${name.toUpperCase()}`, undefined])
  );
  const runCli = (env: Record<string, string>) =>
    spawnSync(process.execPath, [MODULE_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...CLEARED, ...env },
    });

  it('exits 0 and names what it checked on a good dispatch', () => {
    const result = runCli(envFor(VALID));
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    for (const name of EXPECTED_REQUIRED_NAMES) expect(result.stdout).toContain(name);
  });

  it('exits 1 and prints every finding on a bad one', () => {
    const result = runCli({
      INPUT_TEMP_KEY: 'photos/x.webp',
      INPUT_CATEGORY: 'Nature',
      INPUT_TITLE: ' ',
      INPUT_ALT: 'TODO',
    });
    expect(result.status).toBe(1);
    for (const name of EXPECTED_REQUIRED_NAMES) expect(result.stderr).toContain(`${name}:`);
  });

  it('exits 1 when the environment is empty rather than passing over nothing', () => {
    const result = runCli({});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('temp_key:');
  });

  it('does nothing when imported', () => {
    const result = spawnSync(
      process.execPath,
      ['-e', `import(${JSON.stringify(MODULE_PATH)}).then(() => process.stdout.write("IMPORTED"))`],
      { cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, ...CLEARED } }
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('IMPORTED');
  });
});

/* ============================================================================================
 * 10. The module has exactly one source for each shared constant.
 * ========================================================================================== */

describe('no second definition lives in this module', () => {
  const source = read(MODULE_RELATIVE);

  it('spells no staging prefix, in code or in a comment', () => {
    // Plan 04-08's `done` said "outside comments", which nothing can check. So the module simply
    // does not contain the string ANYWHERE — a stricter rule, and a machine-checkable one.
    expect(source).not.toContain('temp/');
  });

  it('spells no category id', () => {
    for (const id of LEGAL_CATEGORY_IDS) expect(source).not.toContain(id);
  });

  it('spells no image origin, legacy or current', () => {
    const legacySuffix = new RegExp(`\\.${['r2', 'dev'].join('\\.')}`, 'i');
    expect(source).not.toMatch(legacySuffix);
    expect(source).not.toContain('images.akhilsaxena.com');
    expect(source).not.toMatch(/https?:\/\//);
  });

  it('imports the staging assertion rather than restating the pattern', () => {
    expect(source).toContain('assertStagingKey');
    expect(source).toContain('DISPATCH_INPUTS');
    expect(source).toContain('altRefusalReason');
    expect(source).toContain('site_config');
  });
});
