/**
 * Validation of every `workflow_dispatch` input, run BEFORE any side effect.  (Plan 04-08)
 *
 * WHY THIS RUNS FIRST, AND WHY IT IS A SEPARATE MODULE
 * ---------------------------------------------------
 * Anyone who can write to this repository can dispatch the photo workflow. Their `temp_key`
 * becomes a key in a bucket the job holds write credentials for (T-04-34); their `title` and
 * `alt` become committed content on the default branch. So the job checks all five inputs
 * before it reads a single byte: a bad dispatch then costs one workflow start, no download,
 * no derivation, no upload and no commit. That is decision OD-2, and it is the only reason
 * `alt` can be a required input rather than a placeholder somebody fills in later.
 *
 * IT DEFINES NOTHING IT CAN IMPORT
 * --------------------------------
 * `src/lib/photo-pipeline.ts` is the phase's interface and this file re-derives none of it:
 *
 *   - the staging-key grammar comes from `assertStagingKey`, not from a pattern retyped here;
 *   - the input names and their `required` flags come from `DISPATCH_INPUTS`;
 *   - the placeholder refusal comes from `altRefusalReason` (OD-2b), whose own comment carries
 *     the false-positive reasoning and the residual holes it knowingly leaves open.
 *
 * The legal category ids come from `data/site_config.json`, read at validation time. There is no
 * list of them in this file, so a category added to the content cannot be rejected by a stale
 * copy living in a script — and, equally, this file cannot invent one.
 *
 * Its unit test asserts all of that by reading this source: no staging-prefix literal, no
 * category id, no image origin, anywhere — including in the comment you are reading. Plan
 * 04-08's `done` criterion originally said "outside comments", which nothing can check; the
 * stricter form is machine-checkable and is what ships.
 *
 * THE TWO RULES THAT ARE COPIED, AND WHY THEY HAD TO BE
 * ----------------------------------------------------
 * `src/schemas/photo.ts` enforces four content rules on `alt`. Two of them — the role-prefix
 * rule and the brief-marker rule — have no counterpart in `photo-pipeline.ts`, and this module
 * CANNOT import the schema: `photo.ts` imports the origin module extensionless, which Vite
 * resolves and Node's ESM resolver does not, so importing it here would make this file
 * unloadable under plain `node` on the Actions runner. That was measured by plan 04-02 and is
 * written up in `photo-pipeline.ts`'s header.
 *
 * So the two rules are re-stated below, and the agreement is asserted rather than assumed: the
 * unit test feeds each rejected value to `PhotoSchema` and requires the schema to refuse it too.
 * The duplication is in the safe direction — everything refused here is refused there, later and
 * more expensively, after the bytes are derived and the manifest is written.
 *
 * WHAT IT NEVER DOES
 * ------------------
 * It does not normalise an input into validity. It does not lower-case the category, does not
 * trim `alt` into shape and does not rewrite the key. `PhotoSchema`'s own error states the
 * reasoning for the category: the comparison applies no case transform, so a capitalised value
 * is a different value and is refused rather than silently coerced. Everything returned is
 * byte-for-byte what was submitted.
 *
 * It also never reports one finding at a time. A caller fixing four mistakes across four
 * dispatches is a bad interface, so every finding is accumulated and thrown together — the same
 * convention `src/schemas/content-set.ts` and both gate scripts already use.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  altRefusalReason,
  assertStagingKey,
  DISPATCH_INPUTS,
} from '../../src/lib/photo-pipeline.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The committed content set this validator checks `category` against. */
export const DEFAULT_SITE_CONFIG_PATH = path.join(HERE, '..', '..', 'data', 'site_config.json');

/**
 * The submitted values, returned unchanged on acceptance. Every key is optional at the type
 * level because the SHAPE is owned by `DISPATCH_INPUTS`, not by this annotation — a required
 * input that is missing is a finding, not a type error, and the two must not be able to
 * disagree about which inputs exist.
 *
 * @typedef {{ temp_key?: string, category?: string, title?: string, alt?: string, place?: string }} DispatchInputValues
 */

/** @typedef {{ siteConfigPath?: string }} ValidateOptions */

/**
 * A hostile input must not be able to flood a public workflow log (T-04-40). `assertStagingKey`
 * already truncates the value it quotes; this is the ceiling on the assembled finding, so a rule
 * added later cannot reopen the hole by interpolating something long of its own.
 */
const FINDING_MAX_LENGTH = 700;

const truncate = (text, limit) => (text.length > limit ? `${text.slice(0, limit)}…` : text);

/**
 * Every finding is `<input name>: <what is wrong>`. The prefix is load-bearing: the workflow
 * step prints these verbatim, and the caller's next action is to re-dispatch with that one
 * input changed.
 */
const finding = (input, reason) => truncate(`${input}: ${reason}`, FINDING_MAX_LENGTH);

/** `photo-pipeline.ts` prefixes its own errors; the input name has already been said. */
const withoutModulePrefix = (message) => message.replace(/^photo-pipeline:\s*/, '');

/**
 * Thrown with EVERY finding, never the first one.
 *
 * `findings` is the array; `message` is the same content joined, so a call site that only logs
 * `error.message` still shows all of them rather than silently dropping four of five.
 */
export class DispatchInputError extends Error {
  /** @param {string[]} findings */
  constructor(findings) {
    super(
      `dispatch inputs rejected — ${findings.length} finding(s):\n` +
        findings.map((f) => `  - ${f}`).join('\n')
    );
    this.name = 'DispatchInputError';
    this.findings = findings;
  }
}

/* ==============================================================================================
 * The category set, read from the content at validation time.
 * ============================================================================================ */

/**
 * The legal category ids, in declaration order.
 *
 * Anti-vacuity: an unreadable file and a set with no entries both THROW, rather than becoming a
 * validator that refuses everything (which looks like a strict gate and is a broken one) or one
 * that accepts everything (which looks like a passing gate and is no gate at all).
 *
 * @param {string} siteConfigPath
 * @returns {string[]}
 */
export function readCategoryIds(siteConfigPath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `dispatch-input: could not read the content set at ${siteConfigPath} — ${error.message}. ` +
        `The category check cannot be skipped, so this is a failure rather than a pass.`
    );
  }
  const declared = Array.isArray(parsed?.categories) ? parsed.categories : null;
  if (declared === null || declared.length === 0) {
    throw new Error(
      `dispatch-input: ${siteConfigPath} declares no categories. An empty set would refuse ` +
        `every dispatch for the wrong reason, so it is refused here instead.`
    );
  }
  return declared.map((entry, index) => {
    if (typeof entry?.id !== 'string' || entry.id.length === 0) {
      throw new Error(`dispatch-input: ${siteConfigPath} category ${index} has no string id.`);
    }
    return entry.id;
  });
}

/* ==============================================================================================
 * The two `alt` rules `photo-pipeline.ts` does not carry. See the header for why they are here.
 * ============================================================================================ */

/** Re-stated from `src/schemas/photo.ts`; the unit test asserts the schema refuses each too. */
const ROLE_PREFIXES = ['image of', 'photo of', 'picture of'];

/** Re-stated from `src/schemas/photo.ts`, same assertion. */
const BRIEF_MARKER_PREFIX = '[AKHIL-';

const normalise = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** `null` when publishable; otherwise one sentence naming the rule that refused it. */
function schemaAltRefusalReason(alt) {
  const lower = normalise(alt);
  for (const prefix of ROLE_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return (
        `alt opens with the role prefix "${prefix}" — assistive technology already announces ` +
        `the role, so a reader hears it twice. src/schemas/photo.ts refuses this too, later.`
      );
    }
  }
  if (alt.includes(BRIEF_MARKER_PREFIX)) {
    return (
      `alt still carries a ${BRIEF_MARKER_PREFIX}…] marker from the photo-content brief — a ` +
      `pending value would reach the manifest. src/schemas/photo.ts refuses this too, later.`
    );
  }
  return null;
}

/* ==============================================================================================
 * One rule per declared input.
 *
 * Each returns `null` or a reason. None of them mutates, and none of them sees the whole record
 * except through the second argument, which carries only what a rule genuinely needs to compare
 * against — `alt` against `title` and against the staged file name.
 * ============================================================================================ */

const RULES = {
  temp_key(value) {
    try {
      assertStagingKey(value);
    } catch (error) {
      return withoutModulePrefix(error.message);
    }
    return null;
  },

  category(value, { categoryIds }) {
    if (typeof value !== 'string') {
      return `category must be a string; got ${typeof value}.`;
    }
    if (categoryIds.includes(value)) return null;
    return (
      `${JSON.stringify(truncate(value, 80))} is not a declared category. The legal ids are: ` +
      `${categoryIds.join(', ')}. They are compared with NO case transform on either side, so a ` +
      `capitalised or padded value is a different value and is refused rather than coerced ` +
      `(the same comparison src/schemas/photo.ts documents for the committed record).`
    );
  },

  title(value) {
    if (typeof value !== 'string') {
      return `title must be a string; got ${typeof value}.`;
    }
    if (value.trim().length === 0) {
      return 'title is empty or whitespace only — the gallery would render a blank caption.';
    }
    return null;
  },

  alt(value, { title, filename }) {
    const placeholder = altRefusalReason({ alt: value, title, filename });
    if (placeholder !== null) return withoutModulePrefix(placeholder);
    return schemaAltRefusalReason(value);
  },

  place(value) {
    if (typeof value !== 'string') {
      return `place is optional, but when supplied it must be a string; got ${typeof value}.`;
    }
    if (value.trim().length === 0) {
      return (
        'place is empty or whitespace only. The schema declares it optional with a one-character ' +
        'floor, so an ABSENT key is fine and an empty one is a mistake — omit it instead.'
      );
    }
    return null;
  },
};

/** The rule names, in declaration order. Compared to `DISPATCH_INPUTS` at load; see below. */
export const RULE_NAMES = Object.keys(RULES);

/**
 * The derivation guard, and it is the reason the required set cannot silently stop being checked.
 *
 * Exported and called with arguments rather than reading the two globals directly, so the unit
 * test can hand it a MUTATED `DISPATCH_INPUTS` and watch it fail — a guard that can only ever be
 * invoked with the one pair it is meant to compare is a guard nobody can prove works.
 *
 * @param {readonly { name: string, required: boolean, description: string }[]} inputs
 * @param {readonly string[]} ruleNames
 * @returns {void}
 */
export function assertRuleCoverage(inputs, ruleNames) {
  const declared = inputs.map((input) => input.name);
  const orphanRules = ruleNames.filter((name) => !declared.includes(name));
  const uncovered = declared.filter((name) => !ruleNames.includes(name));
  if (uncovered.length > 0) {
    throw new Error(
      `dispatch-input: DISPATCH_INPUTS declares ${uncovered.join(', ')} with no rule here. A ` +
        `new input would otherwise be accepted unvalidated, which is the failure this guard exists ` +
        `to prevent.`
    );
  }
  if (orphanRules.length > 0) {
    throw new Error(
      `dispatch-input: ${orphanRules.join(', ')} is validated here but no longer declared in ` +
        `DISPATCH_INPUTS. A rule with no input is a rule nobody runs.`
    );
  }
  if (declared.join('\u0000') !== ruleNames.join('\u0000')) {
    throw new Error(
      `dispatch-input: rule order (${ruleNames.join(', ')}) does not match declaration order ` +
        `(${declared.join(', ')}). The workflow generates its inputs block in declaration order.`
    );
  }
}

assertRuleCoverage(DISPATCH_INPUTS, RULE_NAMES);

/**
 * The inputs a dispatch must supply, derived — never typed out.
 *
 * @returns {string[]}
 */
export function requiredInputNames() {
  return DISPATCH_INPUTS.filter((input) => input.required).map((input) => input.name);
}

/* ==============================================================================================
 * The validator.
 * ============================================================================================ */

/**
 * Returns the submitted values unchanged, or throws `DispatchInputError` carrying every finding.
 *
 * `options.siteConfigPath` exists so the category set can be pointed at a fixture; the default is
 * the committed one. It is read on every call, deliberately — "at validation time" is what makes
 * a category added to the content usable without touching this file.
 *
 * @param {unknown} raw
 * @param {ValidateOptions} [options]
 * @returns {DispatchInputValues}
 */
export function validateDispatchInputs(raw, options = {}) {
  const siteConfigPath = options?.siteConfigPath ?? DEFAULT_SITE_CONFIG_PATH;
  const categoryIds = readCategoryIds(siteConfigPath);

  const supplied = raw !== null && typeof raw === 'object' ? raw : {};
  const declared = DISPATCH_INPUTS.map((input) => input.name);
  const findings = [];

  for (const key of Object.keys(supplied)) {
    if (!declared.includes(key)) {
      findings.push(
        finding(
          truncate(key, 60),
          `not a declared dispatch input. The declared inputs are: ${declared.join(', ')}.`
        )
      );
    }
  }

  const context = {
    categoryIds,
    title: typeof supplied.title === 'string' ? supplied.title : undefined,
    filename: typeof supplied.temp_key === 'string' ? supplied.temp_key : undefined,
  };

  const accepted = {};
  for (const input of DISPATCH_INPUTS) {
    const present = input.name in supplied && supplied[input.name] !== undefined;
    if (!present) {
      if (input.required) {
        findings.push(
          finding(
            input.name,
            `required and not supplied. ${input.description} Pass it with ` +
              `\`-f ${input.name}=…\`, or \`-F ${input.name}=@file\` to read it from a file.`
          )
        );
      }
      continue;
    }
    const reason = RULES[input.name](supplied[input.name], context);
    if (reason === null) {
      accepted[input.name] = supplied[input.name];
    } else {
      findings.push(finding(input.name, reason));
    }
  }

  if (findings.length > 0) throw new DispatchInputError(findings);
  return accepted;
}

/* ==============================================================================================
 * The environment mapping the workflow step uses.
 * ============================================================================================ */

/**
 * `alt` → `INPUT_ALT`. Derived from the declared name so the workflow and this cannot drift.
 *
 * @param {string} inputName
 * @returns {string}
 */
export function envVarNameFor(inputName) {
  return `INPUT_${inputName.toUpperCase()}`;
}

/**
 * Reads the declared inputs out of an environment object.
 *
 * ONE BOUNDARY, RECORDED RATHER THAN GLOSSED. GitHub renders an omitted OPTIONAL input as the
 * empty string, and renders an explicitly-empty one as the empty string too. The two are
 * indistinguishable here, and only the first is a thing a caller can mean, so an empty optional
 * variable is treated as ABSENT. A whitespace-only value is not empty, so it still reaches the
 * rule and is still refused.
 *
 * A REQUIRED variable is never dropped: an empty one is passed through so it is refused by its
 * own rule, which says what is wrong with it, rather than reported as "not supplied", which does
 * not.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {DispatchInputValues}
 */
export function inputsFromEnv(env) {
  const mapped = {};
  for (const input of DISPATCH_INPUTS) {
    const value = env[envVarNameFor(input.name)];
    if (value === undefined) continue;
    if (!input.required && value === '') continue;
    mapped[input.name] = value;
  }
  return mapped;
}

/* ==============================================================================================
 * The CLI the workflow runs. Guarded, so importing this module has no effect.
 * ============================================================================================ */

function main() {
  let accepted;
  try {
    accepted = validateDispatchInputs(inputsFromEnv(process.env));
  } catch (error) {
    const findings = error instanceof DispatchInputError ? error.findings : [error.message];
    process.stderr.write(
      `dispatch inputs REJECTED — nothing was read, nothing was written.\n` +
        `${findings.map((f) => `  - ${f}`).join('\n')}\n`
    );
    process.exit(1);
  }

  const report = Object.entries(accepted)
    .map(([name, value]) => `  ${name} = ${JSON.stringify(truncate(String(value), 120))}`)
    .join('\n');
  process.stdout.write(
    `dispatch inputs validated — ${Object.keys(accepted).length} of ` +
      `${DISPATCH_INPUTS.length} declared input(s) supplied and accepted:\n${report}\n`
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
