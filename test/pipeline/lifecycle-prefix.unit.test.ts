/**
 * PIPE-04, criterion 3's second clause — the staging lifecycle rule. (Plan 04-10, Task 3.)
 *
 * WHAT THIS FILE IS A PROOF OF
 * ----------------------------
 * That `scripts/assert-staging-lifecycle.mjs` refuses each of the four ways a lifecycle rule can
 * look correct and sweep nothing, and that it refuses an empty rule list rather than passing over
 * it. Every input is CAPTURED OR CONSTRUCTED TEXT. There is no network here: the live check
 * against the real bucket is the script's own exit code, run separately.
 *
 * THE ONE CASE THAT MATTERS MOST
 * ------------------------------
 * §3's multipart-abort-only rule. It is scoped to the staging prefix, it is enabled, and it
 * expires NOTHING — aborting an incomplete multipart upload discards a partial upload that was
 * never completed and has no effect on a finished object. An earlier draft of this gate asserted
 * only prefix and `enabled`, and would have gone green over it while staged objects accumulated
 * forever. This is not a hypothetical shape: `portfolio-photos` carries a rule of exactly that
 * form today, on the empty prefix, and one mistyped flag in `wrangler r2 bucket lifecycle add`
 * (`--abort-multipart-days` where `--expire-days` was meant) reproduces it scoped to staging.
 *
 * WHY THE REAL OUTPUT IS PASTED IN RATHER THAN FETCHED
 * ----------------------------------------------------
 * §1's fixture is the verbatim stdout of
 *   `npx wrangler r2 bucket lifecycle list portfolio-photos`
 * captured from this repository against the live bucket on 2026-08-28, banner and all. Keeping
 * the banner is deliberate: the parser must skip it, and a fixture trimmed to just the rule
 * blocks would never prove that. If wrangler changes its rendering, this fixture goes stale and
 * the live run disagrees with it — which is the loud failure, and is why the script also has an
 * `enabled:` value it does not understand throw rather than default.
 *
 * FILENAME CONTRACT: `*.unit.test.ts` — the three Vitest project globs are mutually exclusive.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_PREFIXES_PLACEHOLDER,
  assertStagingLifecycle,
  expiryDaysFrom,
  parseLifecycleList,
} from '../../scripts/assert-staging-lifecycle.mjs';

/* ==============================================================================================
 * §0. Restated, never imported — the constants the gate compares against.
 * ============================================================================================ */

/** `STAGING_PREFIX`, written out rather than imported. See the header convention. */
const PREFIX = 'temp/';

/** `STAGING_EXPIRE_DAYS`. */
const EXPIRE_DAYS = 7;

/**
 * VERBATIM stdout of `npx wrangler r2 bucket lifecycle list portfolio-photos`, wrangler 4.123.0,
 * captured 2026-08-28. Banner included on purpose — see the header.
 */
const REAL_OUTPUT = `
 ⛅️ wrangler 4.123.0 (update available 4.127.0)
───────────────────────────────────────────────
Listing lifecycle rules for bucket 'portfolio-photos'...
name:     Default Multipart Abort Rule
enabled:  Yes
prefix:   (all prefixes)
action:   Abort incomplete multipart uploads after 7 days

name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Expire objects after 7 days
`;

/** A rule of the correct shape, on its own. */
const ONLY_EXPIRY = `
name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Expire objects after 7 days
`;

/**
 * THE DANGEROUS ONE. Correct prefix, enabled, and it deletes nothing. This is what one mistyped
 * flag produces.
 */
const MULTIPART_ABORT_ONLY = `
name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Abort incomplete multipart uploads after 7 days
`;

/** Correct in every way except that it is switched off. */
const DISABLED = `
name:     expire-staging
enabled:  No
prefix:   temp/
action:   Expire objects after 7 days
`;

/** A storage-class transition. It moves objects; it does not remove them. */
const TRANSITION_ONLY = `
name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Transition to Infrequent Access storage after 30 days
`;

/** No rules at all — the "nothing to check" input. */
const EMPTY_LIST = `
 ⛅️ wrangler 4.123.0
───────────────────────────────────────────────
Listing lifecycle rules for bucket 'portfolio-photos'...
There are no lifecycle rules for bucket 'portfolio-photos'.
`;

/* ==============================================================================================
 * §1. The parser, against the real text.
 * ============================================================================================ */

describe('§1 parseLifecycleList against captured live output', () => {
  const rules = parseLifecycleList(REAL_OUTPUT);

  it('finds both rules and skips the banner', () => {
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.name)).toEqual(['Default Multipart Abort Rule', 'expire-staging']);
  });

  it('normalises the "(all prefixes)" placeholder to the EMPTY STRING, never to a prefix', () => {
    // It is a rendering of "", not a prefix literally spelled "(all prefixes)". Treating it as a
    // literal would make it match nothing and look harmless; treating it as "" is what lets the
    // byte-equality assertion see that it does not equal the staging prefix.
    expect(rules[0].prefix).toBe('');
    expect(rules[0].prefix).not.toBe(ALL_PREFIXES_PLACEHOLDER);
  });

  it('reads enabled as a boolean and the action as text', () => {
    expect(rules[0].enabled).toBe(true);
    expect(rules[0].actions).toEqual(['Abort incomplete multipart uploads after 7 days']);
    expect(rules[1]).toMatchObject({
      name: 'expire-staging',
      enabled: true,
      prefix: PREFIX,
      actions: ['Expire objects after 7 days'],
    });
  });

  it('parses an empty list to zero rules rather than throwing', () => {
    // Zero rules is a legitimate PARSE. It is the ASSERTION that must refuse it — §5.
    expect(parseLifecycleList(EMPTY_LIST)).toHaveLength(0);
  });

  it('THROWS on an enabled value it does not understand, rather than defaulting', () => {
    // Defaulting to true invents a passing gate; defaulting to false invents a failing one.
    const weird = ONLY_EXPIRY.replace('enabled:  Yes', 'enabled:  true');
    expect(() => parseLifecycleList(weird)).toThrow(/neither "Yes" nor "No"/);
  });

  it('collects MULTIPLE action lines rather than keeping only the last', () => {
    const both = `${MULTIPART_ABORT_ONLY.trimEnd()}\naction:   Expire objects after 7 days\n`;
    const [rule] = parseLifecycleList(both);
    expect(rule.actions).toHaveLength(2);
    // A single-valued field would have kept the abort line and reported "no expiry" on a rule
    // that has one.
    expect(expiryDaysFrom(rule.actions)).toBe(7);
  });
});

/* ==============================================================================================
 * §2. What counts as an expiry.
 * ============================================================================================ */

describe('§2 expiryDaysFrom', () => {
  it('reads the day count out of a real expiry action', () => {
    expect(expiryDaysFrom(['Expire objects after 7 days'])).toBe(7);
    expect(expiryDaysFrom(['Expire objects after 1 day'])).toBe(1);
  });

  it('returns null — not 0 — for a rule with no expiry action', () => {
    // null and 0 are different answers and produce different failure messages. Collapsing them
    // would report the wrong reason for a real failure.
    expect(expiryDaysFrom(['Abort incomplete multipart uploads after 7 days'])).toBeNull();
    expect(expiryDaysFrom(['Transition to Infrequent Access storage after 30 days'])).toBeNull();
    expect(expiryDaysFrom([])).toBeNull();
  });

  it('is anchored, so a sentence merely CONTAINING the word does not satisfy it', () => {
    expect(expiryDaysFrom(['Do not Expire objects after 7 days'])).toBeNull();
  });
});

/* ==============================================================================================
 * §3. The three plants the plan names. Each must FAIL, naming which assertion broke.
 * ============================================================================================ */

describe('§3 the gate refuses each way a rule can look right and sweep nothing', () => {
  it('PLANT a — a prefix that is not byte-equal FAILS on the prefix, printing both values', () => {
    const rules = parseLifecycleList(ONLY_EXPIRY);
    expect(() => assertStagingLifecycle(rules, { prefix: `${PREFIX}x` })).toThrow(
      /FAILED assertion 1 \(prefix\)/
    );
    // The failure must show what it wanted and what it found, or it is unactionable.
    expect(() => assertStagingLifecycle(rules, { prefix: `${PREFIX}x` })).toThrow(/"temp\/x"/);
    expect(() => assertStagingLifecycle(rules, { prefix: `${PREFIX}x` })).toThrow(
      /"expire-staging"/
    );
  });

  it('PLANT b — a multipart-abort-only rule FAILS on the expiry action', () => {
    // THE CASE THE EARLIER GATE WOULD HAVE PASSED. Prefix correct, enabled correct, deletes
    // nothing.
    const rules = parseLifecycleList(MULTIPART_ABORT_ONLY);
    expect(rules[0].prefix).toBe(PREFIX);
    expect(rules[0].enabled).toBe(true);
    expect(() => assertStagingLifecycle(rules)).toThrow(/FAILED assertion 3 \(expiry action\)/);
    expect(() => assertStagingLifecycle(rules)).toThrow(/carries NO expiry action/);
    // And it says what to do instead.
    expect(() => assertStagingLifecycle(rules)).toThrow(/--expire-days/);
  });

  it('PLANT c — a disabled rule FAILS on enabled', () => {
    const rules = parseLifecycleList(DISABLED);
    expect(() => assertStagingLifecycle(rules)).toThrow(/FAILED assertion 2 \(enabled\)/);
    expect(() => assertStagingLifecycle(rules)).toThrow(/DISABLED/);
  });

  it('a storage-class transition is not an expiry either', () => {
    const rules = parseLifecycleList(TRANSITION_ONLY);
    expect(() => assertStagingLifecycle(rules)).toThrow(/FAILED assertion 3 \(expiry action\)/);
  });

  it('a TTL that disagrees with the constant FAILS, naming both', () => {
    const rules = parseLifecycleList(ONLY_EXPIRY.replace('after 7 days', 'after 14 days'));
    expect(() => assertStagingLifecycle(rules)).toThrow(/FAILED assertion 4 \(TTL\)/);
    expect(() => assertStagingLifecycle(rules)).toThrow(/14 day\(s\)/);
  });

  it('an expiry of zero days FAILS rather than counting as an expiry', () => {
    const rules = parseLifecycleList(ONLY_EXPIRY.replace('after 7 days', 'after 0 days'));
    expect(() => assertStagingLifecycle(rules)).toThrow(/FAILED assertion 3/);
  });
});

/* ==============================================================================================
 * §4. THE WALK-THROUGH. The rule that is on the bucket right now.
 * ============================================================================================ */

describe('§4 a rule on "(all prefixes)" must never satisfy this gate', () => {
  it('the bucket-wide rule does not match the staging prefix', () => {
    const rules = parseLifecycleList(REAL_OUTPUT);
    const bucketWide = rules[0];
    expect(bucketWide.prefix).toBe('');
    expect(bucketWide.prefix === PREFIX).toBe(false);
  });

  it('a bucket-wide EXPIRY rule is rejected — it would delete every published photograph', () => {
    // The live rule aborts multipart uploads, which is harmless. This is the same rule with the
    // one action that would not be: an expiry on "" matches all 156 published objects.
    const catastrophic = `
name:     sweep-everything
enabled:  Yes
prefix:   (all prefixes)
action:   Expire objects after 7 days
`;
    const rules = parseLifecycleList(catastrophic);
    expect(rules[0].prefix).toBe('');
    expect(() => assertStagingLifecycle(rules)).toThrow(/FAILED assertion 1 \(prefix\)/);
  });

  it('a prefix-CONTAINMENT check would have accepted it, which is why equality is used', () => {
    // The failure mode this documents: `'temp/'.startsWith('')` is TRUE. A containment check
    // written in that direction accepts the empty prefix and green-lights the catastrophe above.
    // The two operands are widened to `string` deliberately: as literal types TypeScript reports
    // the equality as an unintentional comparison and refuses to compile the very asymmetry this
    // case exists to demonstrate.
    const bucketWidePrefix: string = '';
    const stagingPrefix: string = PREFIX;
    expect(stagingPrefix.startsWith(bucketWidePrefix)).toBe(true);
    expect(bucketWidePrefix === stagingPrefix).toBe(false);
  });
});

/* ==============================================================================================
 * §5. "Nothing to check" is a FAILURE.
 * ============================================================================================ */

describe('§5 anti-vacuity', () => {
  it('an empty rule list FAILS, naming that zero rules were found', () => {
    expect(() => assertStagingLifecycle([])).toThrow(/ZERO lifecycle rules were parsed/);
    expect(() => assertStagingLifecycle(parseLifecycleList(EMPTY_LIST))).toThrow(
      /ZERO lifecycle rules were parsed/
    );
  });

  it('the empty-list failure tells the operator how to create the rule', () => {
    expect(() => assertStagingLifecycle([])).toThrow(/lifecycle add portfolio-photos/);
    expect(() => assertStagingLifecycle([])).toThrow(/--expire-days 7/);
  });

  it('two rules on the same prefix FAIL rather than one silently winning', () => {
    const duplicated = `${ONLY_EXPIRY}${DISABLED.replace('expire-staging', 'expire-staging-old')}`;
    expect(() => assertStagingLifecycle(parseLifecycleList(duplicated))).toThrow(
      /2 rules claim "temp\/"/
    );
  });
});

/* ==============================================================================================
 * §6. PASS on the correct input — so every refusal above is known to be about the defect and not
 *     about the harness.
 * ============================================================================================ */

describe('§6 the correct configuration passes', () => {
  it('accepts the live bucket text and reports all four assertions passed', () => {
    const result = assertStagingLifecycle(parseLifecycleList(REAL_OUTPUT));
    expect(result.rule.name).toBe('expire-staging');
    expect(result.rule.prefix).toBe(PREFIX);
    expect(result.expiryDays).toBe(EXPIRE_DAYS);
    expect(result.passed).toEqual(['prefix', 'enabled', 'expiry-action', 'ttl']);
  });
});
