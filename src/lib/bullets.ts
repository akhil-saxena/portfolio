/**
 * The one grammar for a stored résumé bullet.
 *
 * ## What the shape is, and why it is this shape
 *
 * A bullet is **bold-only inline markdown**: prose, with zero or more spans wrapped in
 * `**`. That is the whole language. There is no `_`, no `` ` ``, no `[]()`, no `#`, and —
 * the point of the exercise — **no production that emits `<` or `>`**.
 *
 * The legacy app rendered these strings through `dangerouslySetInnerHTML`
 * (`Timeline.tsx:48`, plus three admin components) with no sanitiser anywhere in the
 * repository. ADR-001's answer was not to add one. A filter can be bypassed or forgotten;
 * a shape that cannot express markup cannot carry an injection. So the security property
 * here is structural and mechanically checkable: read the emitters below — a bold
 * delimiter, an escape, and run text — and note that none of them can produce an angle
 * bracket that was not already a character of some run's `text`. Adding one would be a
 * visible code change to this file, not a missed call site somewhere else.
 *
 * ## Escaping, which is dead code today on purpose
 *
 * A literal `*` in run text serialises as `\*`, and a literal `\` as `\\`. The current
 * corpus contains **zero** of either character, so every line of the escape handling is
 * unreachable against the data on disk right now. It is written anyway, because the first
 * time someone types "5 * 3" into the Phase 7 editor it stops being unreachable, and the
 * cost of writing it then — under a half-finished WYSIWYG, against reviewed content — is
 * not the cost of writing it now.
 *
 * ## Why malformed input throws instead of degrading
 *
 * 00-ADMIN-IA §2's **G-4** finding is that a bold-only serializer over the design system's
 * `RichText` *"would silently drop an italic run on save — data loss, not a styling miss"*.
 * The operative word is *silently*. So an unbalanced `**`, a lone unescaped `*` and an
 * unrecognised escape sequence are all a named throw carrying the offending bullet and the
 * offending index. That makes `parseBullet` accept **exactly** the language
 * `serializeBullet` emits, which in turn is what lets the round-trip property be total
 * rather than best-effort: a save that cannot be represented fails loudly instead of
 * quietly rewriting the author's text.
 *
 * ## Constraints on this file
 *
 * - **No Node-only imports.** This module is imported by the content schema, which runs
 *   inside `workerd` during prerender. A `node:` specifier here is a build failure there.
 * - **No renderer.** `parseBullet` returns data. Turning runs into React elements is plan
 *   03-07's job and lives in a component, so that the render boundary can be proven
 *   against `renderToStaticMarkup` independently of the grammar.
 * - **No nested-quantifier regex.** The parser is a single linear scan (threat
 *   T-03-02-06). There is no catastrophic-backtracking surface because there is no
 *   backtracking.
 */

/** One contiguous span of a bullet: its text, and whether it is emphasised. */
export type BulletRun = { text: string; bold: boolean };

/** The emphasis delimiter. Two characters, and the only markup this grammar knows. */
const DELIMITER = '**';

/** The two characters `serializeBullet` escapes, and the only two `\` may precede. */
const ESCAPABLE = new Set(['\\', '*']);

/**
 * The named throw. Deliberately NOT exported: the plan fixes this module's public surface
 * at three functions and one type, and consumers can discriminate on `error.name`, which
 * survives module boundaries and bundler duplication in a way `instanceof` does not.
 * Exporting it later is a decision, not an oversight to be quietly corrected.
 */
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

/**
 * Parses a stored bullet into its ordered runs.
 *
 * The normal form it produces, which `serializeBullet` is the exact inverse of:
 *
 *  - no empty plain run is ever emitted, so `**a**` is one run and not three;
 *  - an empty BOLD run *is* emitted, because `a ****b` has to survive a round trip and
 *    dropping it would change the string;
 *  - adjacent bold runs are never merged, because `**b****c**` and `**bc**` are different
 *    strings and merging them would make the round trip lossy at a run boundary — which
 *    is precisely the silent loss G-4 names.
 *
 * @throws a `BulletSyntaxError` (`error.name`, plus `.bullet` and `.index`) on an
 *   unclosed `**`, a lone unescaped `*`, or an unrecognised escape sequence.
 */
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
        // Closing. Pushed unconditionally, empty text included: see the note above.
        runs.push({ text, bold: true });
        bold = false;
      } else {
        // Opening. The plain run is pushed only if it has content, so no empty plain run
        // is ever produced.
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

/**
 * Serialises runs back to the stored string. The exact inverse of `parseBullet` on the
 * normal form `parseBullet` produces.
 *
 * Note what is NOT here: any handling of `<`, `>`, `&` or `"`. Those are ordinary
 * characters of run text and are emitted verbatim, because this function's output is a
 * JSON string in `data/resume.json`, not HTML. Escaping them here would be an encoding
 * applied at the wrong layer — it would corrupt the stored text and still tell you nothing
 * about what a renderer does. Making the payload inert at the render boundary is plan
 * 03-07's assertion; this layer's contribution is that it never manufactures one.
 */
export function serializeBullet(runs: BulletRun[]): string {
  let out = '';
  for (const run of runs) {
    const escaped = escapeRunText(run.text);
    out += run.bold ? DELIMITER + escaped + DELIMITER : escaped;
  }
  return out;
}

/** Escapes the two characters that would otherwise re-parse as grammar. */
function escapeRunText(text: string): string {
  let out = '';
  for (const ch of text) {
    if (ESCAPABLE.has(ch)) out += '\\';
    out += ch;
  }
  return out;
}

/**
 * True when `source` contains something a browser would parse as a tag.
 *
 * This is a *recogniser*, not a sanitiser, and nothing downstream should treat it as one.
 * Its job is to let the migration script and the 03-06 schema **refuse** input rather than
 * clean it: the grammar above is what makes markup unrepresentable, and this predicate is
 * how a string that never went through the grammar gets rejected at the door.
 *
 * The rule is `<` or `</` followed immediately by an ASCII letter, or `<!` / `<?`, up to
 * the next `>`. The "immediately" is what keeps the comparison operators in real bullets
 * out of it: `p95 < 50ms`, `a < b > c` and `2 <3` all put a non-letter after the `<`, and
 * browsers do not open a tag on those either — an unquoted `<` followed by whitespace or a
 * digit is text in the HTML tokeniser too, so the predicate and the parser agree.
 *
 * `<!` and `<?` are included beyond the four cases the plan named. They cover `<!-- -->`,
 * `<!DOCTYPE>` and processing instructions, none of which is a script-execution vector on
 * its own but all of which are markup, and none of which any plausible résumé bullet
 * contains. This was added after trying to walk the predicate through: `<!--` was the only
 * input found that carried markup while the narrower rule returned false.
 */
export function containsHtmlTag(source: string): boolean {
  return /<(?:\/?[a-zA-Z]|[!?])[^>]*>/.test(source);
}
