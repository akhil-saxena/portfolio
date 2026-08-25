#!/usr/bin/env node
/**
 * Convert the stored résumé bullets from `<strong>`-bearing HTML strings to bold-only
 * inline markdown. It does that and nothing else.
 *
 * WHY THIS EXISTS
 * ---------------
 * The legacy app rendered `experience[].bullets[]` through `dangerouslySetInnerHTML`
 * (`Timeline.tsx:48`, plus three admin components) with no sanitiser anywhere in the
 * repository. ADR-001's answer was not to add one: a filter can be bypassed or forgotten,
 * whereas a stored shape with no production that emits an angle bracket cannot carry an
 * injection at all. This script performs that one-way move for the 13 records on disk.
 *
 * WHY IT IMPORTS THE GRAMMAR INSTEAD OF WRITING `**` ITSELF
 * ---------------------------------------------------------
 * It never concatenates a delimiter. It parses the HTML into `BulletRun[]` and hands that
 * array to `serializeBullet`, so the output encoding is by construction whatever
 * `src/lib/bullets.ts` says it is. A script that wrote `**` with its own `.replace()`
 * would be a second opinion about what a bullet is — the exact two-sources-of-truth
 * failure this phase exists to close — and the two opinions would agree right up until
 * the day escaping mattered.
 *
 * It then re-reads its own output through `parseBullet` and refuses to write unless the
 * round trip and both equalities hold per bullet. The independent proof lives in
 * `test/content/bullets-migration.unit.test.ts` and compares against the previous git
 * revision; this is the script's own pre-flight, not a substitute for it.
 *
 * WHAT IT REFUSES ON, AND WHY REFUSING IS THE POINT
 * -------------------------------------------------
 * Any tag that is not `strong`; an unbalanced open/close; a nested `<strong>`; a `<strong>`
 * whose content is empty or whitespace-only; a leftover `<` or `>` after the strong tags
 * are consumed; and — for a bullet it is about to convert — an existing `*` or `\`, which
 * would need escaping and would therefore change more than the encoding.
 *
 * None of these occur in the corpus today. That is precisely why they are here: a
 * conversion of reviewed content that guesses when it meets something it was not designed
 * for is indistinguishable from success in a diff.
 *
 * IDEMPOTENCE
 * -----------
 * A bullet carrying no `<strong>` is not converted. It is still parsed, so an
 * already-migrated file is re-validated rather than merely skipped, but it is written back
 * byte-identical. A second run reports 0 conversions and leaves the file unchanged.
 *
 * USAGE
 * -----
 *   node scripts/migrate-resume-bullets.mjs [--check]
 *
 * `--check` reports what would change and writes nothing (exit 1 if anything would).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RESUME_PATH = fileURLToPath(new URL('../data/resume.json', import.meta.url));
const GRAMMAR_PATH = new URL('../src/lib/bullets.ts', import.meta.url);

/**
 * `src/lib/bullets.ts` is TypeScript and this script is plain Node. Node enables
 * type-stripping by default from 22.18; `package.json` allows `>=22.12.0`, where it is
 * still behind `--experimental-strip-types`. `.nvmrc` pins 22.22.3, so the supported path
 * works — but a contributor on 22.12 would otherwise get a bare SyntaxError pointing at a
 * type annotation, which reads as a broken grammar module rather than an old runtime.
 */
let grammar;
try {
  grammar = await import(GRAMMAR_PATH.href);
} catch (error) {
  console.error(
    `Could not load src/lib/bullets.ts on Node ${process.version}.\n` +
      'TypeScript type-stripping is on by default from Node 22.18; before that it needs\n' +
      '--experimental-strip-types. Use the version in .nvmrc (22.22.3).\n' +
      `Original error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}
const { parseBullet, serializeBullet, containsHtmlTag } = grammar;

const checkOnly = process.argv.includes('--check');

/** Every tag in the string, by name, whether opening or closing. */
function tagCensus(source) {
  return [...source.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g)].map((m) =>
    m[1].toLowerCase()
  );
}

class RefusalError extends Error {
  constructor(id, reason, bullet) {
    super(`refusing to convert ${id}: ${reason}\n  ${JSON.stringify(bullet)}`);
    this.name = 'RefusalError';
  }
}

/**
 * Splits a `<strong>`-bearing bullet into runs. A single linear regex walk with a
 * non-greedy body; every character not consumed by a tag becomes plain-run text, so
 * nothing can be dropped without the projection check downstream noticing.
 */
function htmlToRuns(id, bullet) {
  const runs = [];
  let cursor = 0;
  for (const match of bullet.matchAll(/<strong>([\s\S]*?)<\/strong>/g)) {
    const content = match[1];
    if (content.includes('<strong>')) throw new RefusalError(id, 'nested <strong>', bullet);
    if (content.trim() === '') {
      throw new RefusalError(id, 'a <strong> with empty or whitespace-only content', bullet);
    }
    if (/^\s|\s$/.test(content)) {
      // Not a refusal: the grammar represents it faithfully. Worth saying out loud,
      // because CommonMark would not treat "** x **" as emphasis and a future renderer
      // swap would then disagree with this file.
      console.warn(`  note ${id}: <strong> content has whitespace against a delimiter`);
    }
    const before = bullet.slice(cursor, match.index);
    if (before.length > 0) runs.push({ text: before, bold: false });
    runs.push({ text: content, bold: true });
    cursor = match.index + match[0].length;
  }
  const tail = bullet.slice(cursor);
  if (tail.length > 0) runs.push({ text: tail, bold: false });
  return runs;
}

function convertBullet(id, bullet) {
  const tags = tagCensus(bullet);
  const foreign = [...new Set(tags.filter((t) => t !== 'strong'))];
  if (foreign.length > 0) {
    throw new RefusalError(id, `tags other than <strong>: ${foreign.join(', ')}`, bullet);
  }

  const opens = (bullet.match(/<strong>/g) || []).length;
  const closes = (bullet.match(/<\/strong>/g) || []).length;
  if (opens !== closes) {
    throw new RefusalError(id, `unbalanced <strong>: ${opens} open, ${closes} close`, bullet);
  }

  // Nothing to convert. Still parsed, so a re-run re-validates rather than rubber-stamps.
  if (opens === 0) {
    if (containsHtmlTag(bullet))
      throw new RefusalError(id, 'contains a tag after the census said it did not', bullet);
    try {
      parseBullet(bullet);
    } catch (error) {
      throw new RefusalError(id, `does not parse under the grammar: ${error.message}`, bullet);
    }
    return { converted: false, text: bullet };
  }

  if (bullet.includes('*') || bullet.includes('\\')) {
    throw new RefusalError(
      id,
      'already contains * or \\, which would need escaping — converting it would change more than the encoding',
      bullet
    );
  }

  const runs = htmlToRuns(id, bullet);

  // Every character is accounted for: the concatenated run text is the bullet with only
  // its strong tags removed. Catches a regex that silently ate a character.
  const projection = runs.map((r) => r.text).join('');
  const stripped = bullet.replace(/<\/?strong>/g, '');
  if (projection !== stripped) {
    throw new RefusalError(id, 'the runs do not reconstruct the tag-stripped bullet', bullet);
  }
  if (projection.includes('<') || projection.includes('>')) {
    throw new RefusalError(
      id,
      'an angle bracket survives after the strong tags are consumed',
      bullet
    );
  }

  const text = serializeBullet(runs);

  // Pre-flight against the grammar itself, not against this script's expectations.
  const reparsed = parseBullet(text);
  if (JSON.stringify(reparsed) !== JSON.stringify(runs)) {
    throw new RefusalError(id, 'the serialised form does not parse back to the same runs', bullet);
  }
  if (serializeBullet(reparsed) !== text)
    throw new RefusalError(id, 'the round trip is not stable', bullet);
  if (containsHtmlTag(text))
    throw new RefusalError(id, 'the converted bullet still contains a tag', bullet);

  const oldEmphasis = [...bullet.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((m) => m[1]);
  const newEmphasis = reparsed.filter((r) => r.bold).map((r) => r.text);
  if (JSON.stringify(oldEmphasis) !== JSON.stringify(newEmphasis)) {
    throw new RefusalError(id, 'the emphasised spans changed', bullet);
  }

  return { converted: true, text };
}

const before = readFileSync(RESUME_PATH, 'utf8');
const data = JSON.parse(before);

let converted = 0;
let inspected = 0;
for (const entry of data.experience) {
  entry.bullets = entry.bullets.map((bullet, index) => {
    inspected += 1;
    const result = convertBullet(`${entry.id}#${index}`, bullet);
    if (result.converted) converted += 1;
    return result.text;
  });
}

const after = `${JSON.stringify(data, null, 2)}\n`;
const changed = after !== before;

console.log(`inspected ${inspected} bullets, converted ${converted}`);

if (checkOnly) {
  console.log(changed ? 'would rewrite data/resume.json' : 'no change');
  process.exit(changed ? 1 : 0);
}

if (!changed) {
  console.log('data/resume.json is unchanged — nothing written');
  process.exit(0);
}

writeFileSync(RESUME_PATH, after);
console.log('wrote data/resume.json');
