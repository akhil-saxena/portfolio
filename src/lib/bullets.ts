export type BulletRun = { text: string; bold: boolean };

const DELIMITER = '**';

const ESCAPABLE = new Set(['\\', '*']);

class BulletSyntaxError extends Error {
  readonly bullet: string;
  readonly index: number;

  constructor(bullet: string, index: number, reason: string) {
    super(`BulletSyntaxError at index ${index}: ${reason} — in bullet ${JSON.stringify(bullet)}`);
    this.name = 'BulletSyntaxError';
    this.bullet = bullet;
    this.index = index;
  }
}

export function parseBullet(source: string): BulletRun[] {
  const runs: BulletRun[] = [];
  let text = '';
  let bold = false;
  let openIndex = -1;
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === '\\') {
      const next = source[i + 1];
      if (next === undefined) {
        throw new BulletSyntaxError(source, i, 'a trailing backslash escapes nothing');
      }
      if (!ESCAPABLE.has(next)) {
        throw new BulletSyntaxError(
          source,
          i,
          `unrecognised escape sequence "\\${next}" — only \\\\ and \\* are defined`
        );
      }
      text += next;
      i += 2;
      continue;
    }

    if (ch === '*') {
      if (source[i + 1] !== '*') {
        throw new BulletSyntaxError(
          source,
          i,
          'a lone "*" is not emphasis and is not literal — write "\\*" for a literal asterisk'
        );
      }
      if (bold) {
        runs.push({ text, bold: true });
        bold = false;
      } else {
        if (text.length > 0) runs.push({ text, bold: false });
        bold = true;
        openIndex = i;
      }
      text = '';
      i += DELIMITER.length;
      continue;
    }

    text += ch;
    i += 1;
  }

  if (bold) {
    throw new BulletSyntaxError(
      source,
      openIndex,
      'this "**" is never closed — emphasis delimiters must balance'
    );
  }
  if (text.length > 0) runs.push({ text, bold: false });

  return runs;
}

export function serializeBullet(runs: BulletRun[]): string {
  let out = '';
  for (const run of runs) {
    const escaped = escapeRunText(run.text);
    out += run.bold ? DELIMITER + escaped + DELIMITER : escaped;
  }
  return out;
}

function escapeRunText(text: string): string {
  let out = '';
  for (const ch of text) {
    if (ESCAPABLE.has(ch)) out += '\\';
    out += ch;
  }
  return out;
}

export function containsHtmlTag(source: string): boolean {
  return /<(?:\/?[a-zA-Z]|[!?])[^>]*>/.test(source);
}
