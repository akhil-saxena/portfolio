#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { STAGING_BUCKET, STAGING_EXPIRE_DAYS, STAGING_PREFIX } from '../src/lib/photo-pipeline.ts';

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

export const ALL_PREFIXES_PLACEHOLDER = '(all prefixes)';

/** @param {string} line */
const say = (line) => process.stdout.write(`${line}\n`);

export class LifecycleAssertionError extends Error {
  /** @param {string} message @param {string} [which] */
  constructor(message, which) {
    super(message);
    this.name = 'LifecycleAssertionError';
    this.which = which ?? 'unknown';
  }
}

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
      current.prefix = value === ALL_PREFIXES_PLACEHOLDER ? '' : value;
    } else {
      current.actions.push(value);
    }
  }

  return rules;
}

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

/**
 * @param {readonly LifecycleRule[]} rules
 * @param {{ prefix?: string, expireDays?: number }} [expected]
 * @returns {{ rule: LifecycleRule, expiryDays: number, passed: string[] }}
 */
export function assertStagingLifecycle(rules, expected = {}) {
  const prefix = expected.prefix ?? STAGING_PREFIX;
  const expireDays = expected.expireDays ?? STAGING_EXPIRE_DAYS;

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

  if (rule.enabled !== true) {
    throw new LifecycleAssertionError(
      `assert-staging-lifecycle: FAILED assertion 2 (enabled). Rule ` +
        `${JSON.stringify(rule.name)} is scoped to ${JSON.stringify(rule.prefix)} correctly but ` +
        `is DISABLED, so it expires nothing. A disabled rule satisfies every other check here.`,
      'enabled'
    );
  }

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
