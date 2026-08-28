#!/usr/bin/env node

/**
 * PIPE-04, criterion 3's second clause: staged objects EXPIRE ON THEIR OWN rather than
 * accumulating. (Phase 4, plan 04-10, Task 3.)
 *
 * Usage: node scripts/assert-staging-lifecycle.mjs [bucket]
 *        (defaults to STAGING_BUCKET from src/lib/photo-pipeline.ts)
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS IS A PREFIX COMPARISON AND NOT AN OBSERVATION
 *
 * R2 lifecycle granularity is DAYS, and removal lags up to ~24 h behind the deadline. A test that
 * asserted "the staged object disappeared" would be a test that sleeps for a day, so there is no
 * honest observational gate here and this file does not pretend to be one. What CAN be checked,
 * in a second, is that the rule which will do the deleting is pointed at the prefix the pipeline
 * actually writes — and that it is switched on, and that it deletes something.
 *
 * ---------------------------------------------------------------------------------------------
 * THE THREE ASSERTIONS, AND WHY EACH ONE EXISTS
 *
 *   1. PREFIX BYTE-EQUALITY with `STAGING_PREFIX`. Not `startsWith`, in either direction.
 *      `''.startsWith(x)` is false but `x.startsWith('')` is TRUE, so a `startsWith` written the
 *      wrong way round would accept a rule scoped to the EMPTY prefix — which matches every key
 *      in the bucket and would expire all 156 published photograph objects on its deadline
 *      (T-04-43). The bucket carries a rule on the empty prefix TODAY (see the placeholder note
 *      below), so this is a live input, not a hypothetical.
 *
 *   2. `enabled` IS TRUE. A disabled rule satisfies every other check perfectly and expires
 *      nothing. `wrangler r2 bucket lifecycle` can disable a rule without deleting it, so a rule
 *      that exists is not a rule that runs.
 *
 *   3. THE RULE CARRIES A REAL EXPIRY ACTION, with days > 0. THIS IS THE ONE THAT MAKES THE GATE
 *      REAL, and an earlier draft of this gate did not have it. `wrangler r2 bucket lifecycle
 *      add` offers three INDEPENDENT actions — `--expire-days`, `--ia-transition-days` and
 *      `--abort-multipart-days`. A rule created with only `--abort-multipart-days 7` scoped to
 *      the staging prefix would satisfy assertions 1 and 2 exactly, look correct in every
 *      listing, and DELETE NOTHING: aborting an incomplete multipart upload discards a partial
 *      upload that was never completed, and has no effect whatsoever on a finished object.
 *
 *      That is not a hypothetical either. `portfolio-photos` already carries a rule of precisely
 *      that shape — `Default Multipart Abort Rule`, enabled, `(all prefixes)`, "Abort incomplete
 *      multipart uploads after 7 days" — so ONE mistyped flag in the `lifecycle add` command
 *      produces that same shape scoped to the staging prefix, and a prefix-only gate goes green
 *      over it while `temp/` fills up forever.
 *
 *   4. …and, separately named so a failure says which, the expiry matches `STAGING_EXPIRE_DAYS`.
 *      That constant is declared in `photo-pipeline.ts` as THE staging TTL. If the rule and the
 *      constant drift, one of them is a lie, and this is the only place that could notice.
 *
 * ---------------------------------------------------------------------------------------------
 * THE COMMAND SURFACE, MEASURED — THERE IS NO JSON MODE
 *
 * Measured on the installed wrangler 4.123.0, from this repository, 2026-08-28:
 *
 *     $ npx wrangler r2 bucket lifecycle list portfolio-photos --json
 *     ✘ [ERROR] Unknown argument: json                                    # exit non-zero
 *
 * The only option the subcommand takes is `-J, --jurisdiction`. So this parses the rendered text,
 * which is blank-line-separated blocks of `key:<spaces>value`:
 *
 *     name:     Default Multipart Abort Rule
 *     enabled:  Yes
 *     prefix:   (all prefixes)
 *     action:   Abort incomplete multipart uploads after 7 days
 *
 *     name:     expire-staging
 *     enabled:  Yes
 *     prefix:   temp/
 *     action:   Expire objects after 7 days
 *
 * WHY THE CLI AND NOT THE REST API. `GET /accounts/{id}/r2/buckets/{name}/lifecycle` does return
 * JSON and would need no parser, and that is a real advantage. It is not used because it needs an
 * account id and a bearer token assembled by hand in this script, whereas the CLI reuses whatever
 * credential the operator is already authenticated with — and because the CLI's text is the
 * surface Akhil actually looks at when he checks this by eye. A gate that reads a different
 * surface from the human can disagree with him and be right in a way he cannot see. Recorded as
 * a decision, per the plan's instruction to state which surface was used and why.
 *
 * `prefix:   (all prefixes)` IS A RENDERED PLACEHOLDER FOR THE EMPTY STRING, not a literal
 * prefix. It is normalised to `''` here, and `''` can never equal `STAGING_PREFIX` because a
 * module-load invariant below refuses an empty `STAGING_PREFIX`. Without that invariant, a future
 * edit setting the prefix to `''` would make the bucket-wide rule MATCH and this gate would
 * green-light a configuration that expires every published photograph.
 *
 * ---------------------------------------------------------------------------------------------
 * PRINTING IS NOT ASSERTING
 *
 * An earlier draft "printed the matched rule's prefix, its expiry in days, and the constant it
 * was compared against". A rule with no expiry action has no expiry-in-days to print — and
 * nothing failed on that. Every value below is printed for legibility AND asserted, and each
 * assertion is reported by name so a failure says which one broke.
 *
 * ANTI-VACUITY. Zero parsed rules is a FAILURE, never a pass: an empty list, an unreadable
 * bucket, or a wrangler that changed its output format would all otherwise look like "no rule
 * violated anything". Nine vacuous passes have shipped in this project.
 */

import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { STAGING_BUCKET, STAGING_EXPIRE_DAYS, STAGING_PREFIX } from '../src/lib/photo-pipeline.ts';

/* ==============================================================================================
 * 0. Invariants that must hold before any rule is read.
 * ============================================================================================ */

if (typeof STAGING_PREFIX !== 'string' || STAGING_PREFIX.length === 0) {
  throw new Error(
    `assert-staging-lifecycle: STAGING_PREFIX is ${JSON.stringify(STAGING_PREFIX)}. An empty ` +
      `staging prefix would be byte-equal to the normalised form of "(all prefixes)", so this ` +
      `gate would accept a bucket-wide expiry rule and green-light deleting every published ` +
      `photograph. Refusing to run rather than reporting a result that cannot be trusted.`
  );
}

if (!Number.isInteger(STAGING_EXPIRE_DAYS) || STAGING_EXPIRE_DAYS <= 0) {
  throw new Error(
    `assert-staging-lifecycle: STAGING_EXPIRE_DAYS is ${JSON.stringify(STAGING_EXPIRE_DAYS)}, ` +
      `which is not a positive whole number of days.`
  );
}

/** The rendered stand-in wrangler prints when a rule's prefix is the empty string. */
export const ALL_PREFIXES_PLACEHOLDER = '(all prefixes)';

/** @param {string} line */
const say = (line) => process.stdout.write(`${line}\n`);

/** A failed assertion, as opposed to a crash. */
export class LifecycleAssertionError extends Error {
  /** @param {string} message @param {string} [which] */
  constructor(message, which) {
    super(message);
    this.name = 'LifecycleAssertionError';
    this.which = which ?? 'unknown';
  }
}

/* ==============================================================================================
 * 1. The parser. Pure, so the unit test can feed it text no bucket would produce.
 * ============================================================================================ */

/**
 * @typedef {{ name: string, enabled: boolean, prefix: string, actions: string[] }} LifecycleRule
 */

/**
 * Parse `wrangler r2 bucket lifecycle list` output into rules.
 *
 * A block STARTS at a `name:` line, which is what discards wrangler's banner, its separator rule
 * and the "Listing lifecycle rules for bucket '…'" line without an allowlist of noise to keep in
 * step with a CLI this repository does not own.
 *
 * `action:` is accumulated into an ARRAY rather than a single field. The `lifecycle add`
 * subcommand takes `--expire-days`, `--ia-transition-days` and `--abort-multipart-days`
 * independently, so a rule can carry more than one; a single-valued field would silently keep
 * whichever line happened to come last, and if that were the abort line a perfectly good expiry
 * rule would be reported as having none. Which of the two forms wrangler renders for a
 * multi-action rule is NOT measured here — the bucket carries no such rule to measure against —
 * so the array is the shape that is correct either way.
 *
 * `enabled` is parsed STRICTLY: only `Yes` and `No` (case-insensitively) are understood, and
 * anything else throws. Defaulting an unrecognised value to `true` would invent a passing gate;
 * defaulting it to `false` would invent a failing one. Neither is a measurement.
 *
 * @param {string} text
 * @returns {LifecycleRule[]}
 */
export function parseLifecycleList(text) {
  if (typeof text !== 'string') {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: expected wrangler's output as a string; got ${typeof text}.`,
      'parse'
    );
  }

  /** @type {LifecycleRule[]} */
  const rules = [];
  /** @type {LifecycleRule | null} */
  let current = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = /^(name|enabled|prefix|action):\s*(.*)$/.exec(line);
    if (match === null) continue;

    const [, field, rawValue] = match;
    const value = rawValue.trim();

    if (field === 'name') {
      current = { name: value, enabled: false, prefix: '', actions: [] };
      rules.push(current);
      continue;
    }
    // A field before any `name:` belongs to no rule. Ignore rather than invent one: wrangler's
    // banner has never contained such a line, and inventing a nameless rule would be a fabricated
    // input to the assertions below.
    if (current === null) continue;

    if (field === 'enabled') {
      const normalised = value.toLowerCase();
      if (normalised !== 'yes' && normalised !== 'no') {
        throw new LifecycleAssertionError(
          `assert-staging-lifecycle: rule ${JSON.stringify(current.name)} reports ` +
            `enabled: ${JSON.stringify(value)}, which is neither "Yes" nor "No". wrangler's ` +
            `output format has changed; this parser must be re-measured against it rather than ` +
            `guessing which way to resolve it.`,
          'parse'
        );
      }
      current.enabled = normalised === 'yes';
    } else if (field === 'prefix') {
      // The placeholder is the EMPTY STRING rendered for a human. Never treat it as a prefix
      // named "(all prefixes)", and never let it match anything.
      current.prefix = value === ALL_PREFIXES_PLACEHOLDER ? '' : value;
    } else {
      current.actions.push(value);
    }
  }

  return rules;
}

/* ==============================================================================================
 * 2. What counts as an expiry, and what emphatically does not.
 * ============================================================================================ */

/**
 * `Expire objects after N days` — the ONLY action form that deletes a completed object.
 *
 * Anchored at the start so it cannot be satisfied by a longer sentence that merely contains the
 * word: "Abort incomplete multipart uploads after 7 days" does not begin with "Expire objects",
 * and neither does "Transition to Infrequent Access storage after 30 days".
 */
const EXPIRY_ACTION_RE = /^Expire objects after (\d+) days?$/i;

/**
 * The expiry, in days, or `null` when the rule carries no expiry action at all.
 *
 * `null` and `0` are deliberately different answers. A rule whose only action is a multipart
 * abort has NO expiry (null) and must be reported as such; a rule with `Expire objects after 0
 * days` has one that does nothing, and is refused separately with its own message. Collapsing
 * both to a falsy number would report the wrong reason for a real failure.
 *
 * @param {readonly string[]} actions
 * @returns {number | null}
 */
export function expiryDaysFrom(actions) {
  for (const action of actions ?? []) {
    const match = EXPIRY_ACTION_RE.exec(String(action).trim());
    if (match !== null) return Number(match[1]);
  }
  return null;
}

/* ==============================================================================================
 * 3. The assertions.
 * ============================================================================================ */

/**
 * @param {readonly LifecycleRule[]} rules
 * @param {{ prefix?: string, expireDays?: number }} [expected]
 * @returns {{ rule: LifecycleRule, expiryDays: number, passed: string[] }}
 */
export function assertStagingLifecycle(rules, expected = {}) {
  const prefix = expected.prefix ?? STAGING_PREFIX;
  const expireDays = expected.expireDays ?? STAGING_EXPIRE_DAYS;

  // ANTI-VACUITY. An empty list is not "nothing violated the rules"; it is "there is no rule",
  // which is the exact condition this gate exists to detect.
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: ZERO lifecycle rules were parsed for this bucket. That is a ` +
        `failure, not a pass: with no rule, every object staged under ` +
        `${JSON.stringify(prefix)} accumulates forever. If the bucket really has no rules, ` +
        `create one with:\n` +
        `  npx wrangler r2 bucket lifecycle add ${STAGING_BUCKET} expire-staging ${prefix} ` +
        `--expire-days ${expireDays}`,
      'rules-present'
    );
  }

  /* -- 1. Prefix byte-equality. ------------------------------------------------------------- */
  const matches = rules.filter((rule) => rule.prefix === prefix);
  if (matches.length === 0) {
    const seen = rules
      .map(
        (rule) =>
          `    ${JSON.stringify(rule.name)}  prefix=${JSON.stringify(rule.prefix)}` +
          `${rule.prefix === '' ? '  (rendered as "(all prefixes)")' : ''}` +
          `  enabled=${rule.enabled}  actions=[${rule.actions.join(' | ')}]`
      )
      .join('\n');
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: FAILED assertion 1 (prefix).\n` +
        `  expected, byte-equal:  ${JSON.stringify(prefix)}   (STAGING_PREFIX)\n` +
        `  no rule has it. The ${rules.length} rule(s) present are:\n${seen}\n` +
        `  This is byte equality on purpose. A rule scoped to the empty prefix matches EVERY ` +
        `key in the bucket, so accepting one by prefix containment would green-light expiring ` +
        `all published photographs (T-04-43).`,
      'prefix'
    );
  }
  if (matches.length > 1) {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: FAILED assertion 1 (prefix). ${matches.length} rules claim ` +
        `${JSON.stringify(prefix)}: ${matches.map((r) => JSON.stringify(r.name)).join(', ')}. ` +
        `Which one governs staging is then ambiguous, and a disabled duplicate could mask an ` +
        `enabled one or the reverse. Remove the extras.`,
      'prefix'
    );
  }
  const rule = matches[0];

  /* -- 2. enabled. -------------------------------------------------------------------------- */
  if (rule.enabled !== true) {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: FAILED assertion 2 (enabled). Rule ` +
        `${JSON.stringify(rule.name)} is scoped to ${JSON.stringify(rule.prefix)} correctly but ` +
        `is DISABLED, so it expires nothing. A disabled rule satisfies every other check here.`,
      'enabled'
    );
  }

  /* -- 3. a real expiry action. ------------------------------------------------------------- */
  const expiryDays = expiryDaysFrom(rule.actions);
  if (expiryDays === null) {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: FAILED assertion 3 (expiry action). Rule ` +
        `${JSON.stringify(rule.name)} is scoped to ${JSON.stringify(rule.prefix)} and enabled, ` +
        `but carries NO expiry action, so it deletes nothing. Its action(s):\n` +
        rule.actions.map((a) => `    ${JSON.stringify(a)}`).join('\n') +
        `\n  Aborting incomplete multipart uploads discards partial uploads that were never ` +
        `completed; it has no effect on a finished object. Transitioning storage class moves an ` +
        `object; it does not remove it. Only "Expire objects after N days" deletes.\n` +
        `  Fix with --expire-days, not --abort-multipart-days:\n` +
        `    npx wrangler r2 bucket lifecycle add ${STAGING_BUCKET} expire-staging ${prefix} ` +
        `--expire-days ${expireDays}`,
      'expiry-action'
    );
  }
  if (expiryDays <= 0) {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: FAILED assertion 3 (expiry action). Rule ` +
        `${JSON.stringify(rule.name)} expires after ${expiryDays} days, which is not a positive ` +
        `number of days.`,
      'expiry-action'
    );
  }

  /* -- 4. the TTL agrees with the constant. ------------------------------------------------- */
  if (expiryDays !== expireDays) {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: FAILED assertion 4 (TTL). The rule expires after ` +
        `${expiryDays} day(s); STAGING_EXPIRE_DAYS in src/lib/photo-pipeline.ts declares ` +
        `${expireDays}. One of the two is a lie about how long a staged object survives, and ` +
        `this is the only place that could notice. Change the rule, or change the constant and ` +
        `say why in its comment.`,
      'ttl'
    );
  }

  return {
    rule,
    expiryDays,
    passed: ['prefix', 'enabled', 'expiry-action', 'ttl'],
  };
}

/* ==============================================================================================
 * 4. The bucket.
 * ============================================================================================ */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const WRANGLER_ENTRY = join(REPO_ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

/**
 * Read the rules for `bucket`.
 *
 * Spawned with an argv ARRAY, never a shell string. There is no `--remote` here and none is
 * needed: `r2 bucket lifecycle` has no local mode — the flag that traps `r2 object` (hazard 21)
 * does not exist on this subcommand, so a bucket-level read always reaches Cloudflare.
 *
 * A non-zero exit is a FAILURE naming the bucket, never an empty rule list. Measured: a
 * nonexistent bucket exits non-zero with "The specified bucket does not exist. [code: 10006]",
 * and treating that as "no rules found" would report a missing bucket as a missing rule.
 *
 * @param {string} bucket
 * @returns {Promise<string>}
 */
export function readLifecycleText(bucket) {
  const argv = ['r2', 'bucket', 'lifecycle', 'list', bucket];
  return new Promise((settle, reject) => {
    const child = spawn(process.execPath, [WRANGLER_ENTRY, ...argv], {
      cwd: REPO_ROOT,
      env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new LifecycleAssertionError(
            `assert-staging-lifecycle: \`wrangler ${argv.join(' ')}\` exited ${code}. The rules ` +
              `could not be read, so nothing was verified — this is a failure, not an empty ` +
              `list.\n${`${stderr}\n${stdout}`.trim()}`,
            'read'
          )
        );
        return;
      }
      settle(stdout);
    });
  });
}

/* ==============================================================================================
 * 5. Entry point. Prints every asserted value, and says that each was asserted.
 * ============================================================================================ */

/**
 * @param {readonly string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const bucket = argv[0] ?? STAGING_BUCKET;
  const text = await readLifecycleText(bucket);
  const rules = parseLifecycleList(text);
  const { rule, expiryDays } = assertStagingLifecycle(rules);

  say('');
  say(`assert-staging-lifecycle: PASS — ${bucket}`);
  say('');
  say(`  rules parsed        ${rules.length}`);
  for (const other of rules) {
    const marker = other === rule ? '->' : '  ';
    const shown =
      other.prefix === '' ? `"" (rendered "${ALL_PREFIXES_PLACEHOLDER}")` : `"${other.prefix}"`;
    say(`  ${marker} ${other.name}  prefix=${shown}  enabled=${other.enabled}`);
    for (const action of other.actions) say(`        action: ${action}`);
  }
  say('');
  say(`  1 prefix            ASSERTED  "${rule.prefix}" === "${STAGING_PREFIX}"  (STAGING_PREFIX,`);
  say('                                byte equality — startsWith is rejected, because a rule on');
  say('                                the empty prefix would expire every published photograph)');
  say(`  2 enabled           ASSERTED  ${rule.enabled}`);
  say(`  3 expiry action     ASSERTED  "Expire objects after ${expiryDays} days" — it DELETES.`);
  say('                                A multipart-abort-only rule would fail here, and the');
  say(`                                bucket carries one of that shape on the empty prefix.`);
  say(
    `  4 ttl               ASSERTED  ${expiryDays} === ${STAGING_EXPIRE_DAYS}  (STAGING_EXPIRE_DAYS)`
  );
  say('');
  say('  NOT asserted, and unassertable: that an object was actually deleted. R2 lifecycle');
  say('  granularity is days and removal lags ~24 h, so observing it would mean sleeping for a');
  say('  day. The prefix comparison above is the honest substitute, not a proxy for a check that');
  say('  was skipped.');
  say('');
  return 0;
}

const isEntrypoint =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n\n`);
      process.exitCode = 1;
    }
  );
}
