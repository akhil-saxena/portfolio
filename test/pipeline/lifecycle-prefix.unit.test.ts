import { describe, expect, it } from 'vitest';
import {
  ALL_PREFIXES_PLACEHOLDER,
  assertStagingLifecycle,
  expiryDaysFrom,
  parseLifecycleList,
} from '../../scripts/assert-staging-lifecycle.mjs';

const PREFIX = 'temp/';

const EXPIRE_DAYS = 7;

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

const ONLY_EXPIRY = `
name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Expire objects after 7 days
`;

const MULTIPART_ABORT_ONLY = `
name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Abort incomplete multipart uploads after 7 days
`;

const DISABLED = `
name:     expire-staging
enabled:  No
prefix:   temp/
action:   Expire objects after 7 days
`;

const TRANSITION_ONLY = `
name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Transition to Infrequent Access storage after 30 days
`;

const EMPTY_LIST = `
 ⛅️ wrangler 4.123.0
───────────────────────────────────────────────
Listing lifecycle rules for bucket 'portfolio-photos'...
There are no lifecycle rules for bucket 'portfolio-photos'.
`;

describe('§1 parseLifecycleList against captured live output', () => {
  const rules = parseLifecycleList(REAL_OUTPUT);

  it('finds both rules and skips the banner', () => {
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.name)).toEqual(['Default Multipart Abort Rule', 'expire-staging']);
  });

  it('normalises the "(all prefixes)" placeholder to the EMPTY STRING, never to a prefix', () => {
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
    expect(parseLifecycleList(EMPTY_LIST)).toHaveLength(0);
  });

  it('THROWS on an enabled value it does not understand, rather than defaulting', () => {
    const weird = ONLY_EXPIRY.replace('enabled:  Yes', 'enabled:  true');
    expect(() => parseLifecycleList(weird)).toThrow(/neither "Yes" nor "No"/);
  });

  it('collects MULTIPLE action lines rather than keeping only the last', () => {
    const both = `${MULTIPART_ABORT_ONLY.trimEnd()}\naction:   Expire objects after 7 days\n`;
    const [rule] = parseLifecycleList(both);
    expect(rule.actions).toHaveLength(2);
    expect(expiryDaysFrom(rule.actions)).toBe(7);
  });
});

describe('§2 expiryDaysFrom', () => {
  it('reads the day count out of a real expiry action', () => {
    expect(expiryDaysFrom(['Expire objects after 7 days'])).toBe(7);
    expect(expiryDaysFrom(['Expire objects after 1 day'])).toBe(1);
  });

  it('returns null — not 0 — for a rule with no expiry action', () => {
    expect(expiryDaysFrom(['Abort incomplete multipart uploads after 7 days'])).toBeNull();
    expect(expiryDaysFrom(['Transition to Infrequent Access storage after 30 days'])).toBeNull();
    expect(expiryDaysFrom([])).toBeNull();
  });

  it('is anchored, so a sentence merely CONTAINING the word does not satisfy it', () => {
    expect(expiryDaysFrom(['Do not Expire objects after 7 days'])).toBeNull();
  });
});

describe('§3 the gate refuses each way a rule can look right and sweep nothing', () => {
  it('PLANT a — a prefix that is not byte-equal FAILS on the prefix, printing both values', () => {
    const rules = parseLifecycleList(ONLY_EXPIRY);
    expect(() => assertStagingLifecycle(rules, { prefix: `${PREFIX}x` })).toThrow(
      /FAILED assertion 1 \(prefix\)/
    );
    expect(() => assertStagingLifecycle(rules, { prefix: `${PREFIX}x` })).toThrow(/"temp\/x"/);
    expect(() => assertStagingLifecycle(rules, { prefix: `${PREFIX}x` })).toThrow(
      /"expire-staging"/
    );
  });

  it('PLANT b — a multipart-abort-only rule FAILS on the expiry action', () => {
    const rules = parseLifecycleList(MULTIPART_ABORT_ONLY);
    expect(rules[0].prefix).toBe(PREFIX);
    expect(rules[0].enabled).toBe(true);
    expect(() => assertStagingLifecycle(rules)).toThrow(/FAILED assertion 3 \(expiry action\)/);
    expect(() => assertStagingLifecycle(rules)).toThrow(/carries NO expiry action/);
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

describe('§4 a rule on "(all prefixes)" must never satisfy this gate', () => {
  it('the bucket-wide rule does not match the staging prefix', () => {
    const rules = parseLifecycleList(REAL_OUTPUT);
    const bucketWide = rules[0];
    expect(bucketWide.prefix).toBe('');
    expect(bucketWide.prefix === PREFIX).toBe(false);
  });

  it('a bucket-wide EXPIRY rule is rejected — it would delete every published photograph', () => {
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
    const bucketWidePrefix: string = '';
    const stagingPrefix: string = PREFIX;
    expect(stagingPrefix.startsWith(bucketWidePrefix)).toBe(true);
    expect(bucketWidePrefix === stagingPrefix).toBe(false);
  });
});

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

describe('§6 the correct configuration passes', () => {
  it('accepts the live bucket text and reports all four assertions passed', () => {
    const result = assertStagingLifecycle(parseLifecycleList(REAL_OUTPUT));
    expect(result.rule.name).toBe('expire-staging');
    expect(result.rule.prefix).toBe(PREFIX);
    expect(result.expiryDays).toBe(EXPIRE_DAYS);
    expect(result.passed).toEqual(['prefix', 'enabled', 'expiry-action', 'ttl']);
  });
});
