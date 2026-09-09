#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RESUME_PATH = fileURLToPath(new URL('../data/resume.json', import.meta.url));
const GRAMMAR_PATH = new URL('../src/lib/bullets.ts', import.meta.url);

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
