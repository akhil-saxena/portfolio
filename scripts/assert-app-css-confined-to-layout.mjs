#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const DEFAULT_SCAN_TARGETS = ['src'];
const SCAN_EXTENSIONS = ['.css', '.astro', '.tsx'];

const DS_TOKEN_SHEETS = [
  'node_modules/@akhil-saxena/design-system/dist/tokens.css',
  'node_modules/@akhil-saxena/design-system/dist/themes/monochrome.css',
];

const TOKEN_FAMILIES = Object.freeze({
  colour: [
    '--ink',
    '--ink-3',
    '--cream',
    '--cream-2',
    '--rule',
    '--wire',
    '--ochre-d',
    '--page-bg',
  ],
  fontFamily: ['--font', '--font-body', '--font-display', '--font-mono', '--display', '--mono'],
  fontSize: ['--text-base', '--text-xl'],
  fontWeight: ['--weight-regular', '--weight-medium', '--weight-bold'],
  lineHeight: ['--lh-normal', '--lh-snug'],
  letterSpacing: ['--ls-base', '--ls-wide'],
  radius: ['--radius-sm', '--radius-md', '--radius-lg'],
  motion: ['--dur-1', '--dur-2', '--ease-out'],
});

const NAMED_COLOURS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
    'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
    'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
    'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
    'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
    'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
  ).split(' ')
);

const COLOUR_FUNCTIONS =
  /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|device-cmyk)\s*\(/i;
const HEX_COLOUR = /#[0-9a-f]{3,8}\b/i;

const HANDOVER_KEYWORDS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'currentcolor',
  'none',
  'normal',
  '0',
]);

const LAYOUT = new Set(
  (
    'display position inset inset-block inset-inline top right bottom left z-index box-sizing ' +
    'margin margin-top margin-right margin-bottom margin-left margin-inline margin-block ' +
    'margin-inline-start margin-inline-end margin-block-start margin-block-end ' +
    'padding padding-top padding-right padding-bottom padding-left padding-inline padding-block ' +
    'padding-inline-start padding-inline-end padding-block-start padding-block-end ' +
    'width height min-width min-height max-width max-height inline-size block-size ' +
    'min-inline-size min-block-size max-inline-size max-block-size aspect-ratio ' +
    'flex flex-direction flex-wrap flex-flow flex-grow flex-shrink flex-basis ' +
    'align-items align-self align-content justify-content justify-items justify-self ' +
    'place-items place-content place-self order gap row-gap column-gap ' +
    'grid grid-template grid-template-columns grid-template-rows grid-template-areas ' +
    'grid-area grid-column grid-row grid-column-start grid-column-end grid-row-start grid-row-end ' +
    'grid-auto-flow grid-auto-columns grid-auto-rows ' +
    'columns column-count column-width column-fill column-span ' +
    'break-inside break-before break-after page-break-inside page-break-before page-break-after ' +
    'overflow overflow-x overflow-y overflow-wrap object-fit object-position ' +
    'background-size background-position background-repeat background-attachment background-clip ' +
    'background-origin ' +
    'scroll-snap-type scroll-snap-align scroll-snap-stop scroll-behavior overscroll-behavior ' +
    'scroll-margin scroll-margin-top scroll-margin-bottom scroll-padding scroll-padding-top ' +
    'animation-timeline animation-range animation-range-start animation-range-end ' +
    'scroll-timeline scroll-timeline-name scroll-timeline-axis ' +
    'view-timeline view-timeline-name view-timeline-axis view-timeline-inset timeline-scope ' +
    'container container-type container-name ' +
    'transform transform-origin translate rotate scale perspective perspective-origin ' +
    'contain isolation float clear visibility resize touch-action pointer-events ' +
    'text-align text-align-last white-space word-break hyphens vertical-align writing-mode ' +
    'direction text-indent tab-size'
  ).split(' ')
);

const TOKENISED = new Map(
  Object.entries({
    color: 'colour',
    'background-color': 'colour',
    background: 'colour',
    'background-image': 'colour',
    'border-color': 'colour',
    'border-top-color': 'colour',
    'border-right-color': 'colour',
    'border-bottom-color': 'colour',
    'border-left-color': 'colour',
    'border-block-color': 'colour',
    'border-inline-color': 'colour',
    border: 'colour',
    'border-top': 'colour',
    'border-right': 'colour',
    'border-bottom': 'colour',
    'border-left': 'colour',
    'border-block': 'colour',
    'border-inline': 'colour',
    'border-block-start': 'colour',
    'border-block-end': 'colour',
    'border-inline-start': 'colour',
    'border-inline-end': 'colour',
    'border-block-start-color': 'colour',
    'border-block-end-color': 'colour',
    'border-inline-start-color': 'colour',
    'border-inline-end-color': 'colour',
    'border-block-width': 'colour',
    'border-inline-width': 'colour',
    'border-block-style': 'colour',
    'border-inline-style': 'colour',
    'border-width': 'colour',
    'border-style': 'colour',
    outline: 'colour',
    'outline-color': 'colour',
    'box-shadow': 'colour',
    'text-shadow': 'colour',
    'text-decoration-color': 'colour',
    'caret-color': 'colour',
    'accent-color': 'colour',
    fill: 'colour',
    stroke: 'colour',
    font: 'type',
    'font-family': 'type',
    'font-size': 'type',
    'font-weight': 'type',
    'line-height': 'type',
    'letter-spacing': 'type',
    'word-spacing': 'type',
    'border-radius': 'radius',
    'border-top-left-radius': 'radius',
    'border-top-right-radius': 'radius',
    'border-bottom-left-radius': 'radius',
    'border-bottom-right-radius': 'radius',
    transition: 'motion',
    'transition-duration': 'motion',
    'transition-delay': 'motion',
    'transition-timing-function': 'motion',
    animation: 'motion',
    'animation-duration': 'motion',
    'animation-delay': 'motion',
    'animation-timing-function': 'motion',
  })
);

const FREE = new Map(
  Object.entries({
    'text-transform':
      'casing has no token. The system offers no `--case-*` and no component API for it.',
    'text-decoration':
      'underline/none has no token, and no design-system component paints an app anchor.',
    'text-decoration-line':
      'as text-decoration: whether a run of text is underlined has no token and no component API.',
    'text-decoration-thickness':
      'as text-decoration: the design system names no rule thickness, so there is nothing to hand through.',
    'text-underline-offset': 'no token names an underline offset.',
    'outline-offset':
      'the gap between a focus outline and the box it surrounds has no token — `grep -c ' +
      '"--focus-offset" dist/*.css` is 0 across the package, and the design system spells its own ' +
      'as a literal `outline-offset: 2px` on `.ds-atom-iconbtn:focus-visible` and ' +
      '`.ds-atom-segmented-btn:focus-visible`. It is FREE rather than TOKENISED because the ' +
      'dimension does not exist to be tokenised, and FREE rather than LAYOUT because an outline is ' +
      'drawn OUTSIDE the border box and takes part in no layout: moving it changes what is painted, ' +
      'never what is sized, positioned or flowed. NOTE this opens no colour hole — `outline` itself ' +
      'stays subject to the colour check, so `outline: 1px solid #000` is still refused as ' +
      'CSS-COLOUR while `outline: 1px solid var(--focus)` passes.',
    filter:
      'a blur radius has no token — `grep -c "--blur" dist/*.css` is 0 across the whole package, ' +
      'and the design system spells its own frosting as a literal `backdrop-filter: blur(14px)` ' +
      'on `.ds-atom-appbar`. It is FREE rather than TOKENISED because the dimension does not ' +
      'exist to be tokenised, and it is not LAYOUT because it moves no box: a filter paints, it ' +
      'does not size or position. NOTE that this does NOT open a colour hole — the colour check ' +
      'runs over every value regardless of classification, so `drop-shadow(0 0 4px #000)` is ' +
      'still refused as CSS-COLOUR.',
    'text-overflow':
      'whether an over-long run is clipped or ellipsised has no token and no component API, in ' +
      'the same way `text-transform` and `text-decoration` above do not. It names no colour, ' +
      'type, spacing or radius — the four dimensions this gate keeps out of app CSS — and its ' +
      'only meaningful values are keywords, so there is no value to hand through even in ' +
      'principle.',
    'clip-path':
      'the visually-hidden technique has no token and no component API. The design system uses ' +
      'this exact declaration for `.ds-visually-hidden` (`clip-path: inset(50%)` on a 1px box), ' +
      'and app CSS needs its own copy only because that utility is unconditional while the nav ' +
      'has to REVERSE it at 673px. A clip shape originates no colour, type, spacing or radius — ' +
      'the four dimensions this gate exists to keep out of app CSS — so there is nothing to hand ' +
      'through.',
    'transition-property':
      'it names WHICH property animates, not how fast or with what curve — a property NAME is not ' +
      'a value in any dimension the design system tokenises, and there is no `--transition-*` to ' +
      'hand through. It is FREE rather than TOKENISED because the `transition` SHORTHAND cannot ' +
      'be written without it and therefore cannot be written token-only at all: its first term is ' +
      'always a bare property name, which `originatesInDimension` reads as an origination. That is ' +
      'exactly what DEBT-CARD-TRANSITION records on /development. Splitting the shorthand into ' +
      '`transition-property` + `-duration` + `-timing-function` is the ONLY spelling in which a ' +
      'consumer transition is fully tokenised, so refusing this property would mandate the debt.',
    'animation-name':
      'it names WHICH keyframe set runs. An identifier is not a value in any dimension the design ' +
      'system tokenises, and there is no `--keyframes-*` to hand through — the same argument ' +
      '`transition-property` carries above, and for the same reason: the `animation` SHORTHAND ' +
      'cannot be written without it, so refusing this property would mandate the shorthand and ' +
      'with it a literal duration in every animation on the site.',
    'animation-fill-mode':
      'whether the first or last keyframe persists outside the active range is a temporal scoping ' +
      'rule, not an appearance value. No token names it and no component API exposes one.',
    'animation-iteration-count':
      'a repeat COUNT (or `infinite`), not a duration and not a curve. The design system names ' +
      'durations and easings; it names no number of repetitions, so there is nothing to hand over.',
    'animation-direction':
      'whether a loop alternates or restarts is a playback rule with no token — the same class of ' +
      'statement as animation-fill-mode, and neither describes how anything looks at rest.',
    'animation-play-state':
      'running vs paused is a playback state, not a design value; no token names one.',
    'font-style': 'italic/normal has no token; the system exposes no `--style-*`.',
    'font-variant-numeric': 'tabular figures are a rendering choice with no token.',
    'font-feature-settings': 'an OpenType feature is a rendering choice with no token.',
    '-webkit-font-smoothing': 'a rasterisation hint, not a design value.',
    '-moz-osx-font-smoothing':
      'as -webkit-font-smoothing: a rasterisation hint the design system does not and should not tokenise.',
    content:
      'generated content is markup, not appearance. Its one text-bearing use here is the print URL recovery PUB-11 measures.',
    'list-style':
      "a marker is a list's own furniture; the system tokenises no marker and ships no list component.",
    'list-style-type':
      "as list-style: the marker is the list's own furniture and the design system ships no list component.",
    'list-style-position':
      'as list-style: where the marker sits relative to the text box has no token and no component.',
    quotes:
      'as content: quotation marks are generated markup rather than an appearance value, and no token names them.',
    cursor: 'an affordance, not a design value; no token names one.',
    opacity:
      'a ratio, not a colour. A token would be `--opacity-*` and none exists; a literal colour hidden in an rgba() is caught by [CSS-COLOUR] instead.',
    'mix-blend-mode': 'a compositing mode with no token.',
    'will-change': 'a rendering hint, not a design value.',
    'print-color-adjust': 'a print rendering instruction with no token.',
    '-webkit-print-color-adjust':
      'as print-color-adjust: an instruction to the printer, not a value anything renders on screen.',
    appearance: 'a reset of UA styling, not an origination.',
    '-webkit-appearance':
      'as appearance: a reset of user-agent styling, which removes a decision rather than originating one.',
  })
);

const DEBTS = [
  {
    id: 'DEBT-PRINT-PAPER',
    where: ['src/styles/public-shell.css'],
    property: '--paper-fixed',
    value: '#ffffff',
    why:
      'A colour literal, which is exactly what this gate exists to keep out of app CSS. It is ' +
      'registered rather than hidden because the value is unreachable any other way.',
    disposition:
      'The photo page mounts every photograph on a white card, as a print. THERE IS NO FIXED ' +
      'LIGHT TOKEN IN THE DESIGN SYSTEM: measured, every light-looking one flips with the theme — ' +
      '--cream, --cream-2, --cream-3, --paper, --paper-warm, --paper-deep, --ink-inverse — and ' +
      '--scrim, which is correctly fixed, has no foreground partner. The design system hit the ' +
      'same wall in its own component and wrote the same literal: `.ds-atom-lightbox-caption ' +
      '{ color: #ffffff }`. FILED as D-32. `--ink` was shipped first and Akhil rejected it: it is ' +
      '#f2f2f4 in dark but #111114 in light, so the print got a black frame in one theme — ' +
      '"white border on photos, not black". A mount is white in both themes or it is not a mount. ' +
      'RESOLVE by adding the partner token upstream (--paper-fixed, or --on-scrim beside ' +
      '--scrim) and re-pointing this one declaration at it. It is deliberately a single custom ' +
      'property so that swap is one line. It was `--pd-paper` on the photo page until the ' +
      "gallery's hover caption needed the same white; hoisting it to `.pub-shell` kept the count " +
      'of literals at one rather than two.',
  },
  {
    id: 'DEBT-RADIUS-10',
    where: ['src/styles/home.css', 'src/styles/photo-detail.css', 'src/styles/photography.css'],
    property: 'border-radius',
    value: '10px',
    why:
      'A photo frame corner radius the design system has no rung for: --radius-sm/md/lg/xl/pill ' +
      'are 4 / 8 / 12 / 16 / 999px and none is 10. This IS an origination under the definition ' +
      'above and is recorded as one rather than argued away.',
    disposition:
      'ALREADY FILED UPSTREAM as D-20 (05-DS-FINDINGS.md): "No --radius rung between 8 and 12 — ' +
      'the masonry tile wanted a value between the two and had to pick one." So this is the Core ' +
      'Value working, not a workaround: the gap was reported rather than absorbed. It stays a ' +
      'debt because 10px still ships. Resolve by upstreaming the rung, or by taking --radius-md ' +
      "or --radius-lg — a visual decision that is Akhil's and not an executor's.",
  },
  {
    id: 'DEBT-CARD-TRANSITION',
    where: ['src/styles/development.css'],
    property: 'transition',
    value: 'border-color 0.25s ease, box-shadow 0.15s ease',
    why:
      'Literal durations and easings where --dur-1..4 and --ease-out exist. An origination in a ' +
      'tokenised dimension.',
    disposition:
      'Belongs to D-14, already filed: the design system declares `transition: box-shadow .15s, ' +
      'border-color .15s` on the card OUTSIDE any motion query, using its own literals rather ' +
      'than its own tokens, and this block exists only to neutralise that under `reduce`. ' +
      'Re-pointing at --dur-2 (180ms) would make the reset disagree with the transition it is ' +
      'resetting. When D-14 lands upstream this block is DELETED, not re-pointed.',
  },
  {
    id: 'DEBT-AMBIENT-DURATION',
    where: ['src/styles/home.css'],
    property: 'animation-duration',
    value: '2.2s',
    why:
      'A literal duration where --dur-1..4 exist. An origination in a tokenised dimension, and ' +
      'the gate is right to flag it — `animation-duration` is a clock and the design system names ' +
      'clocks.',
    disposition:
      'FILED UPSTREAM AS D-24, and it is a GAP rather than a laziness. MEASURED, tokens.css: ' +
      '--dur-1..4 are 120, 180, 240 and 360ms. Every one of them is an INTERACTION duration — how ' +
      'long a control takes to answer a reader — and the design system names no AMBIENT one. The ' +
      "declaration this debt records is Home's scroll cue breathing on a 2.2s loop, which both the " +
      'approved prototype (`@keyframes nudge … 2.2s ease-in-out infinite`) and the owner ask for ' +
      'in as many words: "just a small animation with an arrow showcasing that I need to scroll". ' +
      'Pointing it at --dur-4 would make it a 360ms twitch, which is not the same feature rendered ' +
      'faster — it is a different and worse one. Resolve by upstreaming a --dur-ambient (or a ' +
      '--dur-5/6 continuation of the ramp) and re-pointing this line; a consumer cannot invent the ' +
      'rung, which is exactly why this is a finding and not a fix.',
  },
];

const OPAQUE_STYLE_SOURCES = new Map([]);

function stripVars(value) {
  let previous;
  let current = value;
  do {
    previous = current;
    current = current.replace(/var\(\s*--[a-z0-9-]+\s*(?:,([^()]*))?\)/gi, (_, fallback) =>
      fallback === undefined ? ' ' : ` ${fallback} `
    );
  } while (current !== previous);
  return current;
}

export function originatesColour(value) {
  const rest = stripVars(value);
  if (HEX_COLOUR.test(rest)) return true;
  if (COLOUR_FUNCTIONS.test(rest)) return true;
  for (const word of rest.toLowerCase().match(/[a-z][a-z0-9-]*/g) ?? []) {
    if (NAMED_COLOURS.has(word)) return true;
  }
  return false;
}

export function originatesInDimension(value) {
  const rest = stripVars(value);
  const words = rest.match(/[^\s,/]+/g) ?? [];
  for (const word of words) {
    const w = word.toLowerCase().replace(/;$/, '');
    if (w.length === 0) continue;
    if (HANDOVER_KEYWORDS.has(w)) continue;
    return true;
  }
  return false;
}

function blankComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

export function parseDeclarations(css, origin) {
  const text = blankComments(css);
  const found = [];
  const stack = [];
  let buffer = '';
  let line = 1;
  let declLine = 1;
  let quote = null;
  let depth = 0;

  const flush = (terminator) => {
    const raw = buffer.trim();
    buffer = '';
    if (terminator === '{') {
      stack.push(raw.replace(/\s+/g, ' '));
      return;
    }
    if (raw.length === 0) return;
    const colon = raw.indexOf(':');
    if (colon < 1) return;
    const property = raw.slice(0, colon).trim().toLowerCase();
    if (!/^-{0,2}[a-z][a-z0-9-]*$/.test(property)) return;
    found.push({
      origin,
      line: declLine,
      context: stack.join(' >> '),
      property,
      value: raw
        .slice(colon + 1)
        .trim()
        .replace(/\s+/g, ' '),
    });
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') line++;
    if (buffer.trim().length === 0 && !/\s/.test(ch)) declLine = line;

    if (quote !== null) {
      buffer += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buffer += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth > 0) {
      buffer += ch;
      continue;
    }
    if (ch === '{') {
      flush('{');
      continue;
    }
    if (ch === '}') {
      flush(';');
      stack.pop();
      continue;
    }
    if (ch === ';') {
      flush(';');
      continue;
    }
    buffer += ch;
  }
  flush(';');
  return found;
}

const kebab = (name) =>
  name
    .replace(/^Webkit/, '-webkit-')
    .replace(/^Moz/, '-moz-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

function styleBlocks(text) {
  const blocks = [];
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const before = text.slice(0, m.index + m[0].indexOf('>') + 1);
    blocks.push({ css: m[1], lineOffset: before.split('\n').length - 1 });
  }
  return blocks;
}

export function parseInlineStyles(text, origin) {
  const found = [];
  const opaque = [];
  const lineAt = (index) => text.slice(0, index).split('\n').length;

  for (const m of text.matchAll(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/g)) {
    for (const d of parseDeclarations(m[2], origin)) {
      found.push({ ...d, line: lineAt(m.index), context: 'inline style attribute', inline: true });
    }
  }

  for (const m of text.matchAll(/\bstyle\s*=\s*\{`([\s\S]*?)`\}/g)) {
    const staticText = m[1].replace(/\$\{[^}]*\}/g, 'var(--interpolated)');
    for (const d of parseDeclarations(staticText, origin)) {
      found.push({
        ...d,
        line: lineAt(m.index),
        context: 'inline style template literal',
        inline: true,
      });
    }
  }

  for (const m of text.matchAll(/\bstyle\s*=\s*\{\{([\s\S]*?)\}\}/g)) {
    for (const pair of m[1].matchAll(/([A-Za-z][A-Za-z0-9]*)\s*:\s*(['"])([\s\S]*?)\2/g)) {
      found.push({
        origin,
        line: lineAt(m.index),
        context: 'inline style object',
        property: kebab(pair[1]),
        value: pair[3].trim().replace(/\s+/g, ' '),
        inline: true,
      });
    }
  }

  for (const m of text.matchAll(/\bstyle\s*=\s*\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}/g)) {
    opaque.push({ origin, line: lineAt(m.index), identifier: m[1] });
  }

  return { found, opaque };
}

function readOpaqueSource(identifier, file) {
  const absolute = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolute)) return { declarations: [], problem: `${file} does not exist` };
  const text = fs.readFileSync(absolute, 'utf8');
  const m = new RegExp(
    `\\b(?:const|let|var)\\s+${identifier}\\s*(?::[^=]*)?=\\s*\\{([\\s\\S]*?)\\}`
  ).exec(blankComments(text));
  if (m === null) {
    return { declarations: [], problem: `${file} declares no object literal named ${identifier}` };
  }
  const declarations = [];
  for (const pair of m[1].matchAll(/([A-Za-z][A-Za-z0-9]*)\s*:\s*(['"])([\s\S]*?)\2/g)) {
    declarations.push({
      origin: file,
      line: text.slice(0, m.index).split('\n').length,
      context: `const ${identifier}`,
      property: kebab(pair[1]),
      value: pair[3].trim().replace(/\s+/g, ' '),
      inline: true,
    });
  }
  return { declarations, problem: declarations.length === 0 ? `${identifier} is empty` : null };
}

/** @returns {null | { rule: string, why: string }} */
export function judge(declaration) {
  const { property, value } = declaration;

  if (property.startsWith('--')) {
    if (originatesColour(value)) {
      return {
        rule: 'CSS-COLOUR',
        why: 'a custom property that ORIGINATES a colour. Point it at a design-system colour token.',
      };
    }
    return null;
  }

  if (originatesColour(value)) {
    return {
      rule: 'CSS-COLOUR',
      why:
        'this ORIGINATES a colour. The design system names every colour this site uses; an ' +
        'application stylesheet may hand one through (`var(--ink-3)`) and may never invent one. ' +
        'There is no exemption for this rule.',
    };
  }

  if (LAYOUT.has(property)) return null;

  const dimension = TOKENISED.get(property);
  if (dimension !== undefined) {
    if (dimension === 'colour') return null; // already colour-checked above
    if (originatesInDimension(value)) {
      return {
        rule: 'CSS-ORIGINATES',
        why:
          `\`${property}\` carries ${dimension}, and the design system already names every ` +
          `${dimension} value — so this must be a var(--…) or a handover keyword, not a literal.`,
      };
    }
    return null;
  }

  if (FREE.has(property)) return null;

  return {
    rule: 'CSS-UNKNOWN',
    why:
      'this property is in none of the three permitted sets. That is deliberate: the partition is ' +
      'an ALLOW-list, so a property nobody classified is a loud false alarm rather than a silent ' +
      'hole. Classify it — LAYOUT if it positions/sizes/flows a box, TOKENISED if the design ' +
      'system names its dimension, FREE with a written reason if it names none.',
  };
}

const CANARIES = [
  ['a hex colour', 'color', '#6b6560', 'CSS-COLOUR'],
  ['a named colour', 'color', 'red', 'CSS-COLOUR'],
  ['an rgba()', 'background-color', 'rgba(0, 0, 0, 0.5)', 'CSS-COLOUR'],
  ['an oklch()', 'color', 'oklch(0.7 0.1 200)', 'CSS-COLOUR'],
  ['a colour smuggled into a shorthand', 'border-bottom', '1px solid #ddd', 'CSS-COLOUR'],
  ['a colour in a LOGICAL border shorthand', 'border-block-start', '1px solid #ddd', 'CSS-COLOUR'],
  ['a colour smuggled into a shadow', 'box-shadow', 'inset 0 0 0 1px #000', 'CSS-COLOUR'],
  ['a colour smuggled into a LAYOUT property', 'background-position', 'center #fff', 'CSS-COLOUR'],
  ['a colour in a custom property', '--hm-tile-bg', '#101010', 'CSS-COLOUR'],
  ['a colour beside a token', 'color', 'var(--ink) #fff', 'CSS-COLOUR'],
  ['a colour in a var() FALLBACK', 'color', 'var(--nope, #fff)', 'CSS-COLOUR'],
  ['a literal font stack', 'font-family', 'system-ui, sans-serif', 'CSS-ORIGINATES'],
  ['a quoted family', 'font-family', '"DM Sans", sans-serif', 'CSS-ORIGINATES'],
  ['a literal font-size', 'font-size', '15px', 'CSS-ORIGINATES'],
  ['a literal font-weight', 'font-weight', '500', 'CSS-ORIGINATES'],
  ['a literal line-height', 'line-height', '1.5', 'CSS-ORIGINATES'],
  ['a literal letter-spacing', 'letter-spacing', '0.1em', 'CSS-ORIGINATES'],
  ['a literal radius', 'border-radius', '10px', 'CSS-ORIGINATES'],
  ['a literal duration', 'transition', 'border-color 0.25s ease', 'CSS-ORIGINATES'],
  ['a literal beside a token', 'font-size', 'var(--text-lg) 4px', 'CSS-ORIGINATES'],
  ['a literal animation duration', 'animation-duration', '2.2s', 'CSS-ORIGINATES'],
  [
    'a literal easing on an animation',
    'animation-timing-function',
    'ease-in-out',
    'CSS-ORIGINATES',
  ],
  [
    'the animation shorthand, which always carries a literal',
    'animation',
    'nudge 2.2s ease',
    'CSS-ORIGINATES',
  ],
  ['a colour smuggled into a scroll range', 'animation-range', '0 #fff', 'CSS-COLOUR'],
  ['an unclassified property', 'backdrop-filter', 'blur(4px)', 'CSS-UNKNOWN'],
  ['a vendor property nobody classified', '-webkit-text-stroke', '1px', 'CSS-UNKNOWN'],
];

const ANTI_CANARIES = [
  ['a token colour', 'color', 'var(--ink-3)'],
  ['a handover', 'color', 'inherit'],
  ['currentColor', 'border-color', 'currentColor'],
  ['a hairline with a token colour', 'border-bottom', '1px solid var(--rule)'],
  ['a logical hairline with a token colour', 'border-block-start', '1px solid var(--rule)'],
  ['a ring with a token colour', 'box-shadow', 'inset 0 0 0 1px var(--rule)'],
  ['a token font stack', 'font-family', 'var(--font-display)'],
  ['a token size', 'font-size', 'var(--text-xl)'],
  ['a token weight', 'font-weight', 'var(--weight-medium)'],
  ['layout arithmetic', 'margin-top', 'calc(var(--space-11) + 72px)'],
  ['a measured viewport fraction', 'min-height', '60svh'],
  ['a photograph aspect ratio', 'aspect-ratio', '3 / 2'],
  ['a spacing literal in a layout property', 'padding-bottom', '96px'],
  ['a custom property built from spacing tokens', '--hm-above', 'calc(var(--space-11) + 44px)'],
  ['a background placement', 'background-size', 'cover'],
  ['casing, which has no token', 'text-transform', 'uppercase'],
  ['an underline, which has no token', 'text-decoration', 'underline'],
  ['zero radius', 'border-radius', '0'],
  ['transition: none under reduce', 'transition', 'none'],
  ['a border reset', 'border-bottom', '0'],
  ['a scroll-progress timeline', 'animation-timeline', 'scroll(root block)'],
  ['a scroll range in viewport fractions', 'animation-range', '0 34svh'],
  ['a scroll range handed through tokens', 'animation-range', 'var(--a) var(--b)'],
  ['a containment context', 'container-type', 'inline-size'],
  ['a keyframe set by name', 'animation-name', 'hm-dock'],
  ['a fill mode', 'animation-fill-mode', 'both'],
  ['an infinite loop', 'animation-iteration-count', 'infinite'],
  ['a token easing on an animation', 'animation-timing-function', 'var(--ease-out)'],
];

const selfTestFailures = [];
let canariesChecked = 0;

for (const [label, property, value, expected] of CANARIES) {
  canariesChecked++;
  const verdict = judge({ property, value });
  if (verdict === null) {
    selfTestFailures.push(`canary "${label}" (${property}: ${value}) was NOT flagged at all.`);
  } else if (verdict.rule !== expected) {
    selfTestFailures.push(
      `canary "${label}" was flagged [${verdict.rule}], expected [${expected}].`
    );
  }
}

for (const [label, property, value] of ANTI_CANARIES) {
  canariesChecked++;
  const verdict = judge({ property, value });
  if (verdict !== null) {
    selfTestFailures.push(
      `anti-canary "${label}" (${property}: ${value}) was flagged [${verdict.rule}] — the rule is ` +
        'too broad and would be turned off rather than obeyed.'
    );
  }
}

{
  canariesChecked++;
  const parsed = parseDeclarations(
    '@media print { .a, .b { content: "x;y"; background-image: url(a;b.png); color: var(--ink) } }',
    '__canary__'
  );
  const props = parsed.map((d) => d.property).join(',');
  if (props !== 'content,background-image,color') {
    selfTestFailures.push(
      `the parser canary yielded "${props}" — a \`;\` inside a string or a url() ended a ` +
        'declaration, so every scan it has ever run read the wrong values.'
    );
  }
  if (parsed[0]?.context !== '@media print >> .a, .b') {
    selfTestFailures.push(`the parser lost its at-rule/selector stack: "${parsed[0]?.context}".`);
  }
}

{
  canariesChecked++;
  const { found, opaque } = parseInlineStyles(
    `<a style="color:#fff">x</a>\n<b style={\`aspect-ratio: \${w} / \${h}\`}/>\n` +
      `<c style={{ fontFamily: 'var(--font-display)', WebkitFontSmoothing: 'antialiased' }}/>\n` +
      `<d style={SOMETHING}/>`,
    '__canary__'
  );
  const shape = found.map((d) => d.property).join(',');
  if (shape !== 'color,aspect-ratio,font-family,-webkit-font-smoothing') {
    selfTestFailures.push(`the inline-style canary yielded "${shape}".`);
  }
  if (opaque.length !== 1 || opaque[0].identifier !== 'SOMETHING') {
    selfTestFailures.push('the inline-style canary did not report the opaque identifier.');
  }
}

for (const [property, reason] of FREE) {
  if (typeof reason !== 'string' || reason.trim().length < 20) {
    selfTestFailures.push(`FREE entry "${property}" carries no usable reason.`);
  }
}
for (const debt of DEBTS) {
  if (debt.why.trim().length < 20 || debt.disposition.trim().length < 20) {
    selfTestFailures.push(`debt "${debt.id}" carries no usable reason or disposition.`);
  }
  if (judge({ property: debt.property, value: debt.value }) === null) {
    selfTestFailures.push(
      `debt "${debt.id}" records a declaration the rules do NOT flag. A debt register entry for ` +
        'something that is not a violation is a claim nobody checked.'
    );
  }
}

let tokenSheetBytes = 0;
{
  const declared = new Set();
  for (const sheet of DS_TOKEN_SHEETS) {
    const absolute = path.resolve(process.cwd(), sheet);
    if (!fs.existsSync(absolute)) {
      selfTestFailures.push(`the design system's token sheet is missing: ${sheet}`);
      continue;
    }
    const text = fs.readFileSync(absolute, 'utf8');
    tokenSheetBytes += text.length;
    for (const m of text.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) declared.add(m[1]);
  }
  for (const [family, names] of Object.entries(TOKEN_FAMILIES)) {
    for (const name of names) {
      if (!declared.has(name)) {
        selfTestFailures.push(
          `TOKEN_FAMILIES.${family} names "${name}", which the installed design system does not ` +
            'declare. This gate would be refusing literals in a dimension that has no token to ' +
            'point at — re-read the vocabulary before trusting a single run.'
        );
      }
    }
  }
}

if (selfTestFailures.length > 0) {
  err('assert-app-css-confined-to-layout: SELF-TEST FAILED — the gate cannot be trusted.');
  for (const f of selfTestFailures) err(`  x ${f}`);
  process.exit(1);
}

/* ---------------------------------------------------------------------------------------------
 * 8. The scan
 * ------------------------------------------------------------------------------------------- */

const args = process.argv.slice(2);
for (const a of args) {
  if (a.trim().length === 0) {
    err('assert-app-css-confined-to-layout: REFUSED — a scan root argument is present but empty.');
    err("  path.resolve(cwd, '') is cwd, so this would have scanned the entire repository.");
    process.exit(1);
  }
}
const targets = args.length === 0 ? DEFAULT_SCAN_TARGETS : args;

const failures = [];
const files = [];

for (const target of targets) {
  const absolute = path.resolve(process.cwd(), target);
  if (!fs.existsSync(absolute)) {
    failures.push({
      where: target,
      detail: 'scan root is missing',
      why: 'there is nothing to scan there, so a PASS would be a statement about an empty set.',
    });
    continue;
  }
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (SCAN_EXTENSIONS.includes(path.extname(absolute))) files.push(absolute);
    continue;
  }
  const walk = (dir) => {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        continue;
      }
      if (entry.isFile() && SCAN_EXTENSIONS.includes(path.extname(entry.name))) files.push(p);
    }
  };
  walk(absolute);
}

if (files.length === 0 && failures.length === 0) {
  failures.push({
    where: targets.join(', '),
    detail: 'zero files scanned',
    why: `no file matched ${SCAN_EXTENSIONS.join(' ')}. This run checked nothing and cannot pass.`,
  });
}

const declarations = [];
const opaqueFindings = [];
let filesWithDeclarations = 0;
let bytesRead = 0;

for (const absolute of files) {
  const relative = path.relative(process.cwd(), absolute).split(path.sep).join('/');
  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch (e) {
    failures.push({
      where: relative,
      detail: `unreadable — ${e.message}`,
      why: 'a file in scope that cannot be read has not been checked.',
    });
    continue;
  }
  bytesRead += text.length;
  const before = declarations.length;

  if (path.extname(absolute) === '.css') {
    declarations.push(...parseDeclarations(text, relative));
  } else {
    for (const block of styleBlocks(text)) {
      for (const d of parseDeclarations(block.css, relative)) {
        declarations.push({ ...d, line: d.line + block.lineOffset });
      }
    }
    const inline = parseInlineStyles(text, relative);
    declarations.push(...inline.found);
    opaqueFindings.push(...inline.opaque);
  }
  if (declarations.length > before) filesWithDeclarations++;
}

// Opaque `style={IDENT}` — refused unless registered, and a registered one is READ, not trusted.
const opaqueResolved = [];
for (const finding of opaqueFindings) {
  const source = OPAQUE_STYLE_SOURCES.get(finding.identifier);
  if (source === undefined) {
    failures.push({
      where: `${finding.origin}:${finding.line}`,
      detail: `[CSS-OPAQUE] style={${finding.identifier}} — an inline style this gate cannot read`,
      why:
        'an inline style assembled elsewhere is the one shape that walks straight past a ' +
        'declaration scan. Either inline the object literal here, or register the identifier in ' +
        'OPAQUE_STYLE_SOURCES with the module it comes from — the register READS it, so it is a ' +
        'pointer rather than a pardon.',
    });
    continue;
  }
  if (opaqueResolved.some((r) => r.identifier === finding.identifier)) {
    // Two call sites, one source. Resolve it once: counting its declarations twice would inflate
    // the judged total and print the same register line twice.
    opaqueResolved.find((r) => r.identifier === finding.identifier).sites++;
    continue;
  }
  const { declarations: resolved, problem } = readOpaqueSource(finding.identifier, source.file);
  if (problem !== null) {
    failures.push({
      where: `${finding.origin}:${finding.line}`,
      detail: `[CSS-OPAQUE] registered identifier ${finding.identifier} could not be read — ${problem}`,
      why: 'a register entry that resolves to nothing is an exemption nobody is checking.',
    });
    continue;
  }
  opaqueResolved.push({
    identifier: finding.identifier,
    file: source.file,
    count: resolved.length,
    sites: 1,
  });
  declarations.push(...resolved);
}

if (files.length > 0 && bytesRead === 0) {
  failures.push({
    where: targets.join(', '),
    detail: `${files.length} file(s) scanned, 0 bytes read`,
    why: 'every file in scope was empty, so the rules were applied to nothing.',
  });
}
if (files.length > 0 && declarations.length === 0 && failures.length === 0) {
  failures.push({
    where: targets.join(', '),
    detail: `${files.length} file(s) scanned, 0 declarations parsed`,
    why:
      'no CSS declaration was found anywhere in scope. Either the parser broke or the stylesheets ' +
      'moved; a verdict over zero declarations is the vacuous gate this file exists not to be.',
  });
}

/* ---------------------------------------------------------------------------------------------
 * 9. Judgement, with the debt register applied last
 * ------------------------------------------------------------------------------------------- */

const debtHits = new Map(DEBTS.map((d) => [d.id, 0]));
const byRule = new Map();
let judged = 0;

for (const declaration of declarations) {
  judged++;
  const verdict = judge(declaration);
  if (verdict === null) continue;

  const debt = DEBTS.find(
    (d) =>
      d.property === declaration.property &&
      d.value === declaration.value &&
      d.where.some((w) => declaration.origin === w)
  );
  if (debt !== undefined) {
    debtHits.set(debt.id, debtHits.get(debt.id) + 1);
    continue;
  }

  byRule.set(verdict.rule, (byRule.get(verdict.rule) ?? 0) + 1);
  failures.push({
    where: `${declaration.origin}:${declaration.line}`,
    detail: `[${verdict.rule}] ${declaration.property}: ${declaration.value}   @ ${declaration.context || '(top level)'}`,
    why: verdict.why,
  });
}

// A debt that no longer matches anything is a failure: the violation was fixed and the register
// was not, and a standing permission for a declaration that no longer exists is a hole.
//
// Only on the DEFAULT scan, and that is `gate:ds`'s precedent rather than a softening: a run
// narrowed to one file cannot see whether a debt in another file still matches, and reporting
// every other entry as stale would make a narrowed run unusable and teach people to ignore the
// staleness line. CI and the build both run the default targets, so the check always runs where
// it decides anything.
for (const debt of DEBTS) {
  if (args.length === 0 && debtHits.get(debt.id) === 0) {
    failures.push({
      where: debt.where.join(', '),
      detail: `debt ${debt.id} (${debt.property}: ${debt.value}) matched nothing`,
      why:
        'the entry is stale. Delete it — the violation it records has been fixed or moved, and a ' +
        'register nobody prunes stops being a register.',
    });
  }
}

/* ---------------------------------------------------------------------------------------------
 * 10. Report
 * ------------------------------------------------------------------------------------------- */

if (failures.length > 0) {
  err('');
  err('==============================================================================');
  err('  BUILD REFUSED — application CSS is not confined to layout');
  err('==============================================================================');
  err('');
  err(`  scan targets: ${targets.join(', ')}`);
  err('');
  err('  The definition: application CSS may ARRANGE (a layout property) or HAND A');
  err('  DESIGN-SYSTEM TOKEN THROUGH. It may never ORIGINATE a value in a dimension the');
  err('  design system already names — colour, type, radius or motion.');
  err('');
  for (const f of failures) {
    err(`  x ${f.where}: ${f.detail}`);
    err(`      ${f.why}`);
  }
  err('');
  err(`  ${failures.length} finding(s). Requirement QUAL-03.`);
  err('');
  process.exit(1);
}

out('assert-app-css-confined-to-layout: PASS');
out(`  scan targets: ${targets.join(', ')}${args.length === 0 ? ' (default)' : ''}`);
out(
  `  ${files.length} file(s) matching ${SCAN_EXTENSIONS.join(' ')} (${bytesRead} bytes); ` +
    `${filesWithDeclarations} carry CSS; ${judged} declaration(s) judged`
);
out(
  '  definition: the application ARRANGES (layout) or HANDS A TOKEN THROUGH — it never ORIGINATES'
);
out(
  `  partition: ${LAYOUT.size} layout · ${TOKENISED.size} tokenised · ${FREE.size} free · ` +
    'everything else refused by name'
);
out(
  `  tokenised dimensions, verified declared by the installed design system ` +
    `(${tokenSheetBytes} bytes read): colour, type, radius, motion`
);
out('  spacing is EXCLUDED by argument (DS-11: brand themes do not own spacing) — see the header');
out(
  `  self-test: ${CANARIES.length} canaries flagged with the right rule, ${ANTI_CANARIES.length} ` +
    `anti-canaries left alone, ${canariesChecked} checks in total`
);
for (const { identifier, file, count, sites } of opaqueResolved) {
  out(
    `  opaque inline style resolved: ${identifier} from ${file} — ${count} declaration(s) checked, ` +
      `used at ${sites} call site(s)`
  );
}
out('');
out(
  `  ${DEBTS.length} REGISTERED DEBT(S) — declarations that VIOLATE the definition and still ship:`
);
for (const debt of DEBTS) {
  out(`    ${debt.id}  ${debt.property}: ${debt.value}   (${debtHits.get(debt.id)} occurrence(s))`);
  out(`      where:       ${debt.where.join(', ')}`);
  out(`      why it is a violation: ${debt.why}`);
  out(`      disposition: ${debt.disposition}`);
}
