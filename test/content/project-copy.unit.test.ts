/**
 * The proof for the `00-COPY/one-liners.md` → `data/projects.json` migration (OQ-1, plan 05-02).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * Five records, three fields each. A transposed one-liner, a dropped substitution or a status
 * quietly taken from the wrong project is invisible in a diff that small, so "I read the diff" is
 * not evidence. Nothing below is asserted against a re-typed literal of the copy: every claim is a
 * comparison between two artefacts that exist independently of this file — the reviewed markdown,
 * the committed JSON, and the pre-migration git revision.
 *
 * THE FOUR CLAIMS
 * ---------------
 *   1. VERBATIM. The stored copy is what the script's own extractor reads out of
 *      `00-COPY/one-liners.md`. Hand-edit either side and this goes red.
 *   2. THE TOKENS ARE THE ONLY DEPARTURE. Mask every `{{…}}` and every digit run on BOTH sides and
 *      the two strings must be identical — so the substitutions changed nothing except the
 *      positions where the source held a figure.
 *   3. LOSSLESS. Against the newest revision of `data/projects.json` that has no `status` key,
 *      found by walking the file's own log, every pre-migration field is byte-identical.
 *   4. THE BUDGETS HOLD ON THE RESOLVED STRING. Not on the stored one — see below.
 *
 * WHY THE EXTRACTOR IS IMPORTED AND THE MASKING IS NOT
 * ----------------------------------------------------
 * Claim 1 imports `parseCopySource` and `applyTokenRules` from the migration script, deliberately.
 * A second copy of those regexes here would agree with itself: it would prove that two identical
 * parsers parse identically, which is not a fact about the data. What claim 1 actually tests is
 * that neither ARTEFACT has been hand-edited away from the other.
 *
 * Claim 2 is where the independence lives, and it is written from scratch: it never names `79`,
 * `10`, `components` or `categories`. It masks tokens and digits on both sides and demands
 * character-for-character equality of everything else. A migration that "helpfully" fixed a typo,
 * dropped a clause or re-cased a word fails claim 2 even though the script and the test share an
 * extractor.
 *
 * WHY THE 60–110 / 120–200 BUDGETS ARE NOT ZOD REFINEMENTS
 * --------------------------------------------------------
 * MEASURED: the design-system one-liner is 97 characters in `00-COPY/one-liners.md`; tokenised it
 * is stored at 116, because `{{ds.componentCount}}` is 19 characters longer than the figure it
 * replaced; and it RESOLVES back to 97. A `.max(110)` on the stored string would refuse correct
 * data. The budget is a fact about what a reader sees, so it is asserted here, after
 * `resolveDsTokens` has run — the only place the rendered string exists.
 *
 * AND WHY THE RESOLVED STRING IS NEVER FED BACK THROUGH THE SCHEMA
 * ----------------------------------------------------------------
 * The resolved design-system copy contains the literal `81 components`, which `ProjectSchema`'s
 * OD-6 refusal would reject. That is CORRECT and expected, and it is stated here so that nobody
 * "hardens" this by validating the output: the schema guards the STORED string, which is the one a
 * human or the Phase 7 admin can type a stale figure into. The resolved string is derived from the
 * installed package's own README on every build and cannot go stale.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  applyTokenRules,
  BADGE_TO_STATUS,
  COPY_SOURCE_LABEL,
  COPY_SOURCE_PATH,
  MIGRATED_KEYS,
  PROJECTS_PATH,
  parseCopySource,
} from '../../scripts/migrate-project-copy.mjs';
import { resolveDsTokens } from '../../src/lib/ds-component-count.ts';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PROJECTS_REL = 'data/projects.json';

/*
 * The fields this proof READS, declared; everything else falls through the index signature.
 *
 * `tech` and `badges` were not here, because the migration proof only ever indexed them
 * generically (`project[key]`) inside a loop driven by the old record's own keys — and indexing
 * through `[key: string]: unknown` is legal. The narrowed claims now access them by NAME, which the
 * index signature types as `unknown`, so they are declared rather than cast at each use.
 *
 * NOT imported from `src/schemas/projects.ts`. That module imports `astro/zod` and re-exports
 * through extensionless relative specifiers only a bundler resolves — the same reason
 * `migrate-project-copy.mjs` restates the OD-6 refusal instead of importing it. The schema is still
 * the authority: this suite runs the REAL `ProjectSchema` over the shipped file elsewhere, so a
 * divergence between this shape and the schema's fails there rather than passing silently here.
 */
interface Project {
  id: string;
  title: string;
  status: string;
  oneLiner: string;
  description: string;
  tech: string[];
  href: string;
  badges: Array<{ label: string; href: string; icon: string; pending?: true }>;
  [key: string]: unknown;
}

/**
 * The shape `data/projects.json` had before this migration, as a set of key names.
 *
 * Asserted rather than assumed: if the pre-migration revision turns out to hold some other key,
 * the byte-identity loop below would silently not check it, and "nothing else was touched" would
 * be a claim about a field this file never looked at.
 */
const PRE_MIGRATION_KEYS = [
  'id',
  'title',
  'label',
  'description',
  'tech',
  'icon',
  'href',
  'badges',
];

/** The two tokens the migration is permitted to introduce. Any third is a finding. */
const DOCUMENTED_TOKENS = ['{{ds.componentCount}}', '{{ds.categoryCount}}'];

/**
 * The number of SUBSTITUTED SITES in the corpus.
 *
 * THREE, NOT TWO — and plan 05-02's task 2 says "exactly 2, both on design-system", which is
 * wrong. It counts RULES (there are two: the component figure and the category figure), not the
 * places they fire. The design-system ONE-LINER carries one component figure, and the design-system
 * CARD carries a component figure AND a category figure. The plan's own `<interfaces>` table is
 * consistent with three and not with two: it gives the stored card as 197 against a 160-character
 * source, a delta of 37, which is +19 for `{{ds.componentCount}}` PLUS +18 for
 * `{{ds.categoryCount}}`. One site could not produce it.
 *
 * This is an exact number rather than a floor on purpose. It is an invariant over five records of
 * reviewed copy, not a dataset size that grows — the rule broken by 04-09 (hardcoding a record
 * count that a real photograph later changed) does not apply, and a fourth site appearing silently
 * is exactly what this is here to catch.
 */
const EXPECTED_SUBSTITUTION_SITES = 3;

/** §13.1, measured on the RESOLVED string. `[min, max]`, inclusive. */
const BUDGETS: Record<'oneLiner' | 'description', [number, number]> = {
  oneLiner: [60, 110],
  description: [120, 200],
};

const ANY_TOKEN = /\{\{[^{}]*\}\}/g;

/**
 * Mask every token and every digit run, on both sides of a comparison.
 *
 * Written without reference to the migration's regexes, and without naming a figure or a noun from
 * the copy: it cannot agree with `TOKEN_RULES` by construction. Tokens are masked first so that a
 * token containing digits collapses to one mask rather than several.
 */
function mask(text: string): string {
  return text.replace(ANY_TOKEN, '00').replace(/\d+/g, '00');
}

function tokensIn(text: string): string[] {
  return [...text.matchAll(ANY_TOKEN)].map((match) => match[0]);
}

// ---------------------------------------------------------------------------------------------
// The pre-migration revision
// ---------------------------------------------------------------------------------------------

/**
 * Parse a candidate revision into the pre-migration record array, or return `null` if that
 * revision cannot serve as evidence.
 *
 * Split out and separately exercised below, because a comparison against nothing is the failure
 * this project has shipped repeatedly: a proof whose "previous revision" resolves to an empty
 * string, to a non-array, or to a revision that ALREADY carries `status` iterates zero meaningful
 * assertions and goes green while proving nothing.
 */
function parsePreMigration(raw: string | null | undefined): Project[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  if (!parsed.every((record) => typeof record === 'object' && record !== null)) return null;
  // The defining property of a PRE-migration revision. A revision where even one record already
  // carries `status` is at best mid-migration and cannot be the "before" picture.
  if (parsed.some((record) => 'status' in record || 'oneLiner' in record)) return null;
  if (!parsed.every((record) => typeof (record as Project).id === 'string')) return null;

  return parsed as Project[];
}

/**
 * Walk `data/projects.json`'s own log, newest-first, and return the newest revision that has no
 * `status` key on any record.
 *
 * Deliberately NOT `HEAD~1`. `STATE.md` records that "`HEAD~1` is never a safe evidence revision in
 * a parallel wave" — 03-03 detonated it and 03-05 was repaired pre-dispatch — and this plan runs in
 * a wave of three, two of which are committing to `main` while this file is being written. `HEAD~1`
 * has already stopped being this migration's parent (05-04 landed `e923e0b` after it). The search
 * is stable regardless of what else commits, and CI can run it because
 * `.github/workflows/ci.yml` already sets `fetch-depth: 0` for the four Phase 3 proofs.
 *
 * THROWS when it finds none. It does not skip and it does not pass: a losslessness proof with
 * nothing to compare against must be loud.
 *
 * @param limit optionally consider only the newest `limit` revisions — the seam that lets the
 *   refusal itself be proven, by pointing the search at a window that provably contains no
 *   pre-migration revision.
 */
function findPreMigrationRevision(limit?: number): {
  ref: string;
  records: Project[];
  walked: number;
  available: number;
} {
  const refs = execFileSync('git', ['log', '--format=%H', '--', PROJECTS_REL], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const window = typeof limit === 'number' ? refs.slice(0, limit) : refs;

  for (const [index, ref] of window.entries()) {
    let raw: string;
    try {
      raw = execFileSync('git', ['show', `${ref}:${PROJECTS_REL}`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
    } catch {
      continue; // the file did not exist at this revision
    }
    const records = parsePreMigration(raw);
    if (records) return { ref, records, walked: index + 1, available: refs.length };
  }

  throw new Error(
    `No revision of ${PROJECTS_REL} without a \`status\` key was found. The losslessness proof ` +
      `has nothing to compare against and MUST NOT pass vacuously — walked ${window.length} of ` +
      `${refs.length} revision(s) in this file's own log.`
  );
}

// ---------------------------------------------------------------------------------------------
// Inputs, read once
// ---------------------------------------------------------------------------------------------

const projects: Project[] = JSON.parse(readFileSync(PROJECTS_PATH, 'utf8'));
const sections: Record<string, Record<string, string>> = parseCopySource(
  readFileSync(COPY_SOURCE_PATH, 'utf8')
);
const previous = findPreMigrationRevision();

/** Derived, never literalled. 04-09 wrote a hardcoded count and the 40th photograph redded `main`. */
const PROJECT_COUNT = projects.length;

const resolved = projects.map((project) => ({
  id: project.id,
  oneLiner: resolveDsTokens(project.oneLiner),
  description: resolveDsTokens(project.description),
}));

// The evidence this file rests on, printed rather than asserted-and-forgotten. `console.log` is
// swallowed by this repository's vitest setup (STATE.md: verified with a probe — both console
// markers appeared 0 times, the stdout marker once), so a gate that reported through it would be
// indistinguishable from a gate that found nothing.
{
  const lines = [
    '',
    `project-copy: ${PROJECT_COUNT} record(s) · source ${COPY_SOURCE_LABEL}`,
    `  pre-migration revision: ${previous.ref}`,
    `    walked ${previous.walked} of ${previous.available} revision(s) of ${PROJECTS_REL} to find it`,
    '  stored → resolved lengths (budget: oneLiner 60-110, description 120-200)',
  ];
  for (const project of projects) {
    const r = resolved.find((entry) => entry.id === project.id);
    if (!r) continue;
    lines.push(
      `    ${project.id.padEnd(14)} ` +
        `oneLiner ${String(project.oneLiner.length).padStart(3)} → ${String(r.oneLiner.length).padStart(3)}   ` +
        `description ${String(project.description.length).padStart(3)} → ${String(r.description.length).padStart(3)}`
    );
  }
  lines.push('');
  process.stdout.write(lines.join('\n'));
}

// ---------------------------------------------------------------------------------------------

describe('the evidence this proof rests on', () => {
  it(`resolves a pre-migration revision (${previous.ref.slice(0, 7)}, walked ${previous.walked})`, () => {
    expect(previous.ref).toMatch(/^[0-9a-f]{40}$/);
    expect(previous.records.length).toBe(PROJECT_COUNT);
    expect(PROJECT_COUNT).toBeGreaterThan(0);
    // The revision must be a genuine "before": no record may carry either new field.
    for (const record of previous.records) {
      expect(record).not.toHaveProperty('status');
      expect(record).not.toHaveProperty('oneLiner');
    }
    // ANTI-VACUITY. If the copy had not actually changed, every comparison below would be true of
    // a migration that did nothing at all. `05-UI-SPEC.md` §0.3 measured cairn at 176 stored
    // characters against 196 reviewed, so at least one description MUST differ.
    const changed = projects.filter((project) => {
      const before = previous.records.find((record) => record.id === project.id);
      return before && before.description !== project.description;
    });
    expect(changed.length).toBeGreaterThan(0);
  });

  it(`reads all ${PROJECT_COUNT} sections out of ${COPY_SOURCE_LABEL}`, () => {
    // Driven from the data, so a record with no section fails here rather than being skipped.
    expect(Object.keys(sections).length).toBeGreaterThanOrEqual(PROJECT_COUNT);
    for (const project of projects) {
      expect(Object.keys(sections)).toContain(project.id);
      expect(sections[project.id]['one-liner']).toBeTruthy();
      expect(sections[project.id].card).toBeTruthy();
      expect(sections[project.id].badge).toBeTruthy();
    }
  });
});

describe('the pre-migration comparison cannot pass vacuously', () => {
  // Every input that has historically turned a losslessness proof into a no-op. Each must be
  // rejected at the source rather than iterated over zero times.
  it.each([
    ['an empty revision', ''],
    ['a whitespace-only revision', '  \n '],
    ['a missing revision', null],
    ['a revision that is not JSON', 'not json'],
    ['a revision that is an object, not an array', '{"projects":[]}'],
    ['a revision whose array is empty', '[]'],
    ['a revision holding a non-object element', '["cairn"]'],
    ['a revision whose records have no id', '[{"title":"Cairn"}]'],
    ['a revision that ALREADY carries status', '[{"id":"cairn","status":"live"}]'],
    ['a revision that ALREADY carries oneLiner', '[{"id":"cairn","oneLiner":"x"}]'],
  ])('rejects %s', (_label, raw) => {
    expect(parsePreMigration(raw as string | null)).toBeNull();
  });

  it('THROWS rather than skipping when the search window holds no pre-migration revision', () => {
    // The newest revision of data/projects.json is this plan's own commit, which carries `status`.
    // A window of exactly one therefore provably contains no evidence — and the proof must refuse
    // rather than go green. This is the control for the refusal itself, not for the data.
    expect(() => findPreMigrationRevision(1)).toThrow(/MUST NOT pass vacuously/);
    expect(() => findPreMigrationRevision(1)).toThrow(/walked 1 of \d+ revision/);
  });
});

describe.each(projects.map((project) => [project.id, project] as const))(
  'project "%s"',
  (id, project) => {
    const section = sections[id];
    const before = previous.records.find((record) => record.id === id);

    it('carries the reviewed ONE-LINER verbatim, modulo the token rules', () => {
      /*
       * ============================================================================================
       * THE CARD COPY IS NO LONGER COMPARED TO THE DECK, AND THE ONE-LINER STILL IS
       * ============================================================================================
       *
       * This asserted BOTH fields against `00-COPY/one-liners.md`. The deck's own frontmatter said
       * `status: first-pass` / `awaiting: akhil-edit`, and that edit has now happened — Akhil rewrote
       * all five card descriptions directly, over four rounds, judging them on the rendered page.
       *
       * MEASURED, which keys actually diverged from the deck: `description` on all five, `oneLiner`
       * on none. So the deck is still the reviewed source for the one-liner and this half of the
       * claim is untouched — it is the CARD half that has a new author.
       *
       * 🔴 WHY THE CARD COMPARISON IS RETIRED RATHER THAN REPAIRED. Two repairs were available and
       * both are worse:
       *
       *   Re-point the deck at the new copy and keep comparing. The comparison would then be between
       *   Akhil's text and a transcription of Akhil's text that I made — it proves the transcription,
       *   not the data, and it puts a markdown file in the path of every future copy edit.
       *
       *   Grow `TOKEN_RULES` until it can produce the new placement. The rules are
       *   `/\b\d+ components\b/` and `/\bin \d+ categories\b/`; the new copy reads "81 accessible
       *   components across 10 categories", which matches neither. Extending them means the migration
       *   script's regexes have to track whatever phrasing Akhil chooses next — the test driving the
       *   copy instead of guarding it.
       *
       * WHAT GUARDS THE CARD COPY INSTEAD is below and in three other places: the real schema refuses
       * a literal component figure, every token must be a documented one, the §13.1 budget is checked
       * on the RESOLVED string, and `gate:placeholders` fails the build if any `{{…}}` survives into
       * shipped HTML. The migration is a completed event; those four are standing properties.
       */
      expect(project.oneLiner).toBe(applyTokenRules(section['one-liner']).text);
    });

    it('stores card copy that is authored, legal under the schema, and tokenised correctly', () => {
      /*
       * THE THREE THINGS THAT ARE STILL TRUE OF THE CARD COPY, now that it is authored in the JSON.
       *
       * The schema check is run through the REAL `ProjectSchema` elsewhere in this suite; what is
       * restated here is its OD-6 refusal, per record, because a literal figure is the specific
       * regression this field has already suffered three times in nine days.
       */
      expect(project.description, `${id} has no card copy`).toBeTruthy();

      // OD-6: no typed component figure. The token exists so this can never go stale.
      expect(project.description, `${id} types a literal component figure`).not.toMatch(
        /\b\d+[- ]component/i
      );

      // Every token is one of the two the resolver knows. A typo ships literally.
      for (const token of tokensIn(project.description)) {
        expect(DOCUMENTED_TOKENS, `${id} carries an unknown token ${token}`).toContain(token);
      }
    });

    it('carries the reviewed badge as its status, lowercased', () => {
      // Restated independently of the script's map: the transform claimed is `toLowerCase()`.
      expect(project.status).toBe(section.badge.toLowerCase());
      // And it must still be a value the map (and therefore the schema, and StatusPill) knows.
      expect(Object.values(BADGE_TO_STATUS)).toContain(project.status);
    });

    it('the one-liner differs from its reviewed source ONLY where a token replaced a figure', () => {
      /*
       * Claim 2, and the independent one: it never names `79`, `10`, `components` or `categories`.
       * Both sides are masked for tokens and digit runs and must then be identical character for
       * character, so a migration that "helpfully" fixed a typo or re-cased a word fails even though
       * the script and this test share an extractor.
       *
       * SCOPED TO THE ONE-LINER for the reason above: the card copy has a new author and no longer
       * has a second artefact to be independent OF.
       */
      expect(mask(project.oneLiner)).toBe(mask(section['one-liner']));
      for (const token of tokensIn(project.oneLiner)) {
        expect(DOCUMENTED_TOKENS).toContain(token);
      }
    });

    it('kept the identity fields byte-identical since before the migration', () => {
      /*
       * ============================================================================================
       * THE SCOPE NARROWED FROM "EVERY UNMIGRATED KEY" TO THE FIVE NOTHING HAS TOUCHED
       * ============================================================================================
       *
       * This looped over every key the migration was not allowed to write and demanded each be
       * byte-identical to the pre-migration revision. That claim can only hold for as long as the
       * records never change again — it proves the MIGRATION was lossless, and it does it by freezing
       * the data.
       *
       * MEASURED against `${previous.ref.slice(0, 7)}`, which key diverged on which record:
       *
       *     description   all five   a migrated key; already excluded from this loop
       *     tech          all five   Akhil, later: *"use fe language + be language ... use just a
       *                              single pill if 2nd one ids not very important"*
       *     badges        two        cairn's globe label became `cairn.co.in`, design-system gained
       *                              a `Storybook` badge
       *     id/title/label/icon/href   NONE — byte-identical on all five
       *
       * So the migration WAS lossless and the two later divergences are content decisions taken with
       * the page in front of him. Freezing them would make this suite the reason copy cannot change.
       *
       * WHAT IS PINNED IS THE PART THAT MUST NEVER MOVE. `id` is the route and the join key,
       * `href` is the destination, `icon` and `label` are artwork, `title` is the name. A migration
       * or a later edit that dropped or transposed any of those is invisible in a five-record diff
       * and is exactly what this test was written to catch — that half is unchanged and still driven
       * from the OLD record's own keys, so a key that existed then and is missing now still fails.
       *
       * `tech` AND `badges` GET LIVE ASSERTIONS INSTEAD, below: still present, still non-empty, and
       * every badge still carrying a href and an icon. Dropping them from this loop without that
       * would have left two fields with no coverage at all.
       */
      expect(before).toBeDefined();
      if (!before) return;

      // The keys the migration wrote, plus the two Akhil has since revised. Named, not inferred.
      /*
       * `href` JOINED THIS LIST ON 2026-09-04, AND IT WAS HIDING A DEFECT.
       *
       * MEASURED by fetching every destination: `momentum`'s Play Store URL returns 404 while
       * `hued`'s returns 200. That URL was BOTH the badge's href and `project.href`, so the card's
       * stretched title link — its largest click target — pointed at a Google error page. It now
       * points at the repository, which exists.
       *
       * Pinning `href` byte-identical made a WRONG destination unfixable without editing this test,
       * which is the wrong way round: a pin catches a destination being LOST, it does not exist to
       * prevent one being corrected. It is replaced by the live assertion below — every badge href
       * absolute, and the record's own href never one the same record marks pending.
       */
      const EVOLVED_SINCE_MIGRATION = ['tech', 'badges', 'href'];
      const pinned = Object.keys(before).filter(
        (key) => !MIGRATED_KEYS.includes(key) && !EVOLVED_SINCE_MIGRATION.includes(key)
      );
      expect(
        pinned.length,
        'no key is pinned — the loop below would assert nothing'
      ).toBeGreaterThan(0);
      expect([...Object.keys(before)].sort()).toEqual([...PRE_MIGRATION_KEYS].sort());
      for (const key of pinned) {
        expect(JSON.stringify(project[key]), `${id}.${key} moved since the migration`).toBe(
          JSON.stringify(before[key])
        );
      }
    });

    it('still carries a usable tech list and badge list', () => {
      /*
       * THE COVERAGE THE NARROWING ABOVE WOULD OTHERWISE HAVE COST. Both fields are Akhil's to
       * revise; neither is his to empty, and `ProjectSchema` requires `tech` non-empty and
       * `badges` at least one — so this asserts the SHAPE the page depends on rather than the values.
       *
       * `record` is a typed alias for the same object. `describe.each` is given a tuple and types
       * the callback's parameters from the tuple's UNION, so `project` arrives wide enough that
       * `project.tech` resolves to `unknown` and `.length` on it is a typecheck error — which the
       * existing assertions never hit because they index with `project[key]`, and indexing an
       * unknown is legal. Bound once here rather than cast at each of the six uses.
       */
      const record = project as Project;

      expect(Array.isArray(record.tech), `${id}.tech is not an array`).toBe(true);
      expect(record.tech.length, `${id} lists no tech`).toBeGreaterThan(0);
      for (const entry of record.tech) {
        expect(typeof entry, `${id} has a non-string tech entry`).toBe('string');
        expect(entry.trim().length, `${id} has an empty tech entry`).toBeGreaterThan(0);
      }

      expect(record.badges.length, `${id} carries no badges`).toBeGreaterThan(0);
      for (const badge of record.badges) {
        expect(badge.label?.trim().length, `${id} has a badge with no label`).toBeGreaterThan(0);
        expect(badge.icon?.trim().length, `${id} has a badge with no icon`).toBeGreaterThan(0);
        expect(badge.href, `${id} has a badge with a relative href`).toMatch(/^https?:\/\//);
      }

      /*
       * 🔴 AND THE RECORD'S OWN DESTINATION IS NOT A BADGE IT MARKS PENDING.
       *
       * This is what replaces the `href` byte-pin, and it catches the real defect rather than any
       * change at all. `momentum` stored the same Play Store URL as `project.href` AND as a badge
       * href; that badge is now `pending` because the listing 404s — which left the card saying
       * "Coming Soon" beside a title that linked straight to it.
       *
       * A record that promises a destination must not also send the reader there.
       */
      const pendingHrefs = record.badges
        .filter((badge) => badge.pending === true)
        .map((badge) => badge.href);
      expect(
        pendingHrefs,
        `${id}.href is a destination the same record marks pending`
      ).not.toContain(record.href);
    });
  }
);

describe('the two token rules are the only departure from verbatim', () => {
  it(`substitutes exactly ${EXPECTED_SUBSTITUTION_SITES} site(s), all on one record`, () => {
    const sites = projects.flatMap((project) =>
      (['oneLiner', 'description'] as const).flatMap((field) =>
        tokensIn(project[field]).map((token) => ({ id: project.id, field, token }))
      )
    );
    expect(sites).toHaveLength(EXPECTED_SUBSTITUTION_SITES);
    expect(new Set(sites.map((site) => site.id)).size).toBe(1);
    expect(sites[0].id).toBe('design-system');
    expect(new Set(sites.map((site) => site.token))).toEqual(new Set(DOCUMENTED_TOKENS));
  });

  it('leaves every other record free of tokens', () => {
    const untokenised = projects.filter(
      (project) => tokensIn(project.oneLiner).length + tokensIn(project.description).length === 0
    );
    // Derived: everything except the one record that carries the figures.
    expect(untokenised).toHaveLength(PROJECT_COUNT - 1);
  });
});

describe('the §13.1 budgets, measured on the RESOLVED string', () => {
  it('resolves something — the anti-vacuity clause', () => {
    // Without this, a resolver that returned its input unchanged would still be green on four of
    // five records and red on the fifth for entirely the wrong reason. At least one resolved
    // length must differ from its stored length.
    const shortened = projects.filter((project) => {
      const r = resolved.find((entry) => entry.id === project.id);
      if (!r) return false;
      return (
        r.oneLiner.length !== project.oneLiner.length ||
        r.description.length !== project.description.length
      );
    });
    expect(shortened.length).toBeGreaterThan(0);
    // And the resolution is a real substitution, not a deletion: no `{{…}}` survives, and the
    // resolved text is shorter than the stored text because a figure is shorter than its token.
    for (const project of shortened) {
      const r = resolved.find((entry) => entry.id === project.id);
      if (!r) continue;
      expect(tokensIn(r.oneLiner)).toHaveLength(0);
      expect(tokensIn(r.description)).toHaveLength(0);
      expect(r.oneLiner.length).toBeLessThan(project.oneLiner.length);
      expect(r.description.length).toBeLessThan(project.description.length);
    }
  });

  it(`checks ${PROJECT_COUNT * 2} resolved strings, which is every field on every record`, () => {
    // ANTI-VACUITY for the per-record budget assertions: a suite that resolved three records and
    // reported on five would be the ninth vacuous gate in this project.
    expect(resolved).toHaveLength(PROJECT_COUNT);
  });

  describe.each(resolved.map((entry) => [entry.id, entry] as const))('%s', (_id, entry) => {
    it.each(['oneLiner', 'description'] as const)('resolved %s is inside its budget', (field) => {
      const [min, max] = BUDGETS[field];
      expect(entry[field].length).toBeGreaterThanOrEqual(min);
      expect(entry[field].length).toBeLessThanOrEqual(max);
    });
  });
});
