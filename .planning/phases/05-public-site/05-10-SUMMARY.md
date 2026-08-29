---
phase: 05-public-site
plan: 10
subsystem: ui
tags: [astro, react, microdata, schema.org, print-css, seo, design-system, resume]

requires:
  - phase: 05-01
    provides: the design system installed from the registry, and the import contract that keeps /resume on subpaths
  - phase: 05-02
    provides: the reconciled resume.json shape — structured dates, bold-only bullet grammar
  - phase: 05-03
    provides: the `metric` field on every experience entry, and the dist/ placeholder refusal that guards it
  - phase: 05-06
    provides: PublicLayout, public-shell.css, <Seo>, the inline theme script's beforeprint/afterprint pair
provides:
  - "/resume — the whole record from data/resume.json, zero framework JavaScript"
  - "Person structured data as microdata (OQ-2 closed), validated by validator.schema.org"
  - "the print stylesheet — two pages of A4, every bullet, every URL, no token restated"
  - "the download control for public/resume.pdf"
  - "test/public/resume.node.test.ts — 13 HTTP controls over the built artefact"
affects: [05-14, 05-15, 06-case-studies, 08-cutover]

tech-stack:
  added: []
  patterns:
    - "microdata on plain-HTML elements, never on a React component — React 19 emits itemProp verbatim"
    - "a type role is declared on the element that carries the `ch` measure, not on a descendant"
    - "an artefact check scopes its count to the region it is about; `<li` also matches `<link`"

key-files:
  created:
    - src/pages/resume.astro
    - src/components/public/ResumeEntry.astro
    - src/styles/resume.css
    - test/public/resume.node.test.ts
  modified: []

key-decisions:
  - "OQ-2 closed as microdata. Options 2 (a fourth rule in gate:sinks) and 3 (a static public/ file) recorded as rejected."
  - "The download control is `Link`, not `Button`: Button has no `as` prop (MEASURED). Filed upstream; not hand-rolled."
  - "The Person's sameAs/email are plain `<link>`/`<meta>` elements, because React 19 does not lower-case itemProp."
  - "The résumé column takes PAGE_MAX.band (1080) via .pub-max-band — the only gated maximum that fits; §2.2 gives the route none of its own."
  - "§3.1 and §11.3 contradict each other on the bullet's type role; §3.1 is honoured for screen and §11.3's intent (nothing below --text-md on paper) for print."

patterns-established:
  - "Every planter asserts its own anchor and its own resulting digest, and every restore is verified byte-identical."
  - "A backup lives OUTSIDE the tree it protects — a concurrent `rm -rf dist` took three in-dist backups with it."
  - "An artefact control asserts the state it believes it created, at the moment it runs: a concurrent build regenerated a file between the `mv` and the check and produced a false PASS."

requirements-completed: [PUB-10, PUB-11, SEO-02, SEO-01]

duration: 55min
completed: 2026-08-29
---

# Phase 5 Plan 10: The Résumé Route Summary

**`/resume` renders all 15 stored bullets, 3 skill groups and the education record straight out of
`data/resume.json` with zero framework JavaScript, offers the committed PDF through the design
system's `Link` because `Button` has no `as` prop, carries `Person` microdata that
`validator.schema.org` parses to one Person with six properties and a nested Organization and zero
errors, and prints as two pages of light A4 with every bullet and every URL on paper.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3 of 3
- **Files created:** 4 · **Files modified:** 0
- **Commits:** `b46e8f9`, `f0e0a45`, `5f2da66`, `3294e59`, plus this summary

---

## The route as built

`src/pages/resume.astro` → `PublicLayout mainClass="pub-max-band rs-page"`, `<Seo>` into the named
head slot, then four blocks:

| # | Block | Source | Rendered by |
|---|---|---|---|
| 1 | `<h1>` name | `home_config.json` `title` | plain element, Playfair `--text-4xl` |
| 2 | current role · company · period | `resume.experience.find(e => e.isPresent)` + `formatPeriod()` | plain elements |
| 3 | Download the PDF · three contact links | `RESUME_PDF_PATH` · `home_config.socialLinks` | design system `Link` |
| 4 | Experience · Skills · Education | `resume.json` | `ResumeEntry.astro`, `Chip`, `Bullets` |

**Every count is derived.** There is no `13`, no `15`, no `3` in the page, the entry component, the
stylesheet or the suite. `formatPeriod()` is the only date formatter; "current" comes from
`isPresent`, never from array position — and when no record is current the role line and its
`jobTitle`/`worksFor` are simply absent rather than falling back to a job Akhil no longer holds.

Derived at build time from the committed fixture: **15 bullets** (13 experience + 2 education
leadership), **17 bold runs**, **1 literal `&`**, **3 skill groups / 16 items**, **3 social links**,
**1 education record**.

`src/lib/content.ts` is imported here, which is the first time anything has imported it. Plan 03-08
measured that its module-scope `ResumeSchema.parse` was **not** an enforcement point because nothing
imported it. From `b46e8f9` it is one.

---

## `metric` — how it renders, and where it would break

Both halves are read whole from the record and rendered in the entry's right-hand column, mirroring
§10's employment band on `/work`: `entry.metric.value` in `--ochre-d-strong` (§4.3 entry 2, the
second of the six elements the accent is reserved for) and `entry.metric.label` on the ink ramp,
both IBM Plex Mono `--text-xs` with `--ls-wide`.

**Nothing anywhere encodes the current wording.** Not the page, not `ResumeEntry.astro`, not
`resume.css`, not `test/public/resume.node.test.ts`. The three values on disk are the placeholders
OQ-1b records; revising them changes rendered text and nothing else. Concretely, if Akhil edits
`data/resume.json`:

| Edit | What happens |
|---|---|
| A different figure or label | Renders. Nothing asserts on the wording. No test, gate or CSS rule changes. |
| A longer label (e.g. `PIPELINE THROUGHPUT`) | The entry header is `flex-wrap` with `space-between`; the aside stacks under the identity below the 673px rung already, so a long label wraps rather than overflowing. Not measured beyond the current corpus — the longest today is `FASTER PIPELINES` (16 chars). |
| An empty `value` or `label` | `ExperienceEntrySchema` is `z.strictObject({ value: min(1), label: min(1) })` — **the build refuses**, naming the file, the record and the field. |
| The field removed | `strictObject` refuses. **The build fails.** |
| A `{{…}}` placeholder token stored | Renders into `dist/`, and `scripts/assert-no-unresolved-placeholders.mjs` **fails the build**. This is OQ-1b's designed behaviour, and this plan widens its reach: the token now has a second route it can surface on. |

**The one place it is fragile, stated plainly:** the metric is not in §11.1's structure list. §11.1
enumerates six items and the metric is not among them — it was specified for `/work` (§10 item 4,
and `src/schemas/resume.ts`'s own comment says "the right-aligned figure at the end of each
employment row on /work"). Rendering it here is a deliberate departure taken on the orchestrator's
instruction, recorded under *Contradictions* below. If the human review in 05-15 decides the résumé
should not carry it, deleting the `<p class="rs-metric">` block from `ResumeEntry.astro` and the two
rules from `resume.css` removes it completely; no test or gate depends on it.

---

## The PDF download — the mechanism, and the file

**`public/resume.pdf` EXISTS.** 131,710 bytes, committed, last touched 2026-06-17. It is copied to
`dist/client/resume.pdf` by the build and served from the same origin. The suite fetches it and
asserts `200`, a `pdf` content type, a non-zero body and the `%PDF-` magic — because a control
pointing at a 404 is indistinguishable from a working one until it is clicked.

The control itself:

```astro
<Link href={RESUME_PDF_PATH} download variant="default">Download the PDF</Link>
```

which renders `<a class="ds-atom-link" data-variant="default" href="/resume.pdf" download="">`.

### 🔴 Design-system gap: `Button` has no `as` prop

§11.1 prescribes `<Button as="a" href="/resume.pdf" download>`. **That is not implementable.**
MEASURED against the installed `2.0.0-beta.1`: `ButtonProps extends
ButtonHTMLAttributes<HTMLButtonElement>` with `variant`, `size`, `loading`, `icon` and nothing else.
`Link` does have `as` (`as?: ElementType`, default `"a"`).

Option (a) was taken. Option (c) — an anchor with hand-rolled button CSS — is the bespoke-over-
design-system trade the Core Value settles and was not taken.

**The visual consequence, recorded honestly for 05-15's review:** the primary call to action on this
page reads as a *link*, not as a filled button. It has no fill, no border and no padding; it sits in
a flex row beside the three contact links, distinguished from them only by `variant="default"`
against their `variant="quiet"`. A recruiter scanning for a download button will find a sentence.
`variant="action"` was considered — the design system's bold call-to-action link — and **not** taken,
because it appends a trailing arrow whose meaning is "you will navigate", and this control hands
over a file.

**Filed upstream for `2.0.0-beta.2`:** `Button` should accept `as`, mirroring `Link`. A download is
the commonest case where the visual contract is "button" and the semantic is "anchor", and every
consumer that meets it today either drops to a link or hand-rolls the CSS.

---

## SEO-02 — OQ-2 closed, and validated by an external consumer

Microdata on plain elements. **Zero script bytes**, `gate:sinks` exactly as strict as Phase 3 left
it, and no allowlist entry added.

### The verdict from `validator.schema.org`

The built `dist/client/resume/index.html` was POSTed to `https://validator.schema.org/validate`.
Verdict: **1 object · `numErrors: 0` · `numWarnings: 0`.**

| Recognised | Value |
|---|---|
| `itemtype` | **Person** |
| `name` | `Akhil Saxena` |
| `jobTitle` | `Senior Software Engineer` |
| `url` | `https://akhilsaxena.com/resume` |
| `sameAs` | `https://github.com/akhil-saxena` |
| `sameAs` | `https://www.linkedin.com/in/akhil-saxena` |
| `email` | `saxena.akhil42@gmail.com` — the bare address, no scheme |
| `worksFor` (nested node) | **Organization** → `name: Brevo (Formerly Sendinblue)`, 0 errors |

Google's Rich Results Test was **not** used: it takes a public URL and the live site is down until
cutover. `validator.schema.org` is the alternative the plan names, and it is the same parser family.

### 🔴 React 19 emits `itemProp` / `itemScope` / `itemType` VERBATIM

The first implementation put `itemProp` on the design system's `Link`. MEASURED through
`renderToStaticMarkup` with the installed `react-dom@19.2.8`, for a bare element and through `Link`:

```
h('a', { href: '/x', itemProp: 'sameAs' })            ->  <a href="/x" itemProp="sameAs">x</a>
h('a', { href: '/x', itemScope: true, itemType: T })  ->  <a itemScope="" itemType="https://schema.org/Person">
h(Link, { href: '/x', itemProp: 'sameAs' })           ->  <a class="ds-atom-link" … itemProp="sameAs">
```

It is React's doing, not the design system's, and React's own `HTMLAttributes` type declares all
three — so the types promise a mapping the renderer does not perform.

**What it does and does not cost, measured rather than assumed.** The camel-cased page was submitted
to the same validator: it parses to the **same single Person with the same six properties and the
same nested Organization, zero errors**. HTML attribute names are ASCII case-insensitive, so a
consumer running an HTML parser is unaffected.

The cost is to **verification**. The bytes say `itemProp`, so every case-sensitive reader of the
artefact misses it — and the first such reader was this plan's own gate, which passed the page while
reporting **zero** `sameAs`. Shipping the camel-cased form would have shipped microdata that works
and that no artefact-level check could confirm.

So the two URL-valued properties are plain elements Astro renders itself:

```html
<link itemprop="url" href="https://akhilsaxena.com/resume">
<link itemprop="sameAs" href="https://github.com/akhil-saxena">
<link itemprop="sameAs" href="https://www.linkedin.com/in/akhil-saxena">
<meta itemprop="email" content="saxena.akhil42@gmail.com">
```

and the suite carries the regression guard: **no camel-cased `itemProp`/`itemScope`/`itemType`
anywhere in the served bytes.** It fires the moment microdata is put back onto a React component.

### The rejected options, recorded so they are not re-proposed

- **Option 2 — a fourth rule in `gate:sinks`** permitting Astro's raw-HTML directive on a
  `<script type="application/ld+json">`. Rejected: it puts a hole in the gate that closed a real
  historical stored-XSS class, and the gate's own documentation states an allowlisted occurrence is
  still refused if it is a use, so the exemption path was never available anyway.
- **Option 3 — a static JSON-LD file in `public/` referenced by URL.** `application/ld+json` is not
  fetched by reference. It does not work at all.

The suite asserts the negative half — **zero `ld+json`, zero `type="module"`, and no literal `{j}`,
`{{` or `${` in any script body** (the exact broken-JSON-LD symptom §12.3 measured) — because that
is what stops someone "improving" this into the mechanism that does not work.

---

## The print stylesheet — five observations, from a real browser

Chromium via Playwright, against the **built** `dist/client/`, `page.pdf({ format: 'A4',
preferCSSPageSize: true, printBackground: true })`.

| # | §11.3 asks | Measured |
|---|---|---|
| i | Page count | **2**. `/Count 2` in the PDF, and two single-page prints. |
| ii | The field is light, not black | **Light.** After `beforeprint`, `documentElement` loses `dark`, `body` computes `background-color: rgb(250, 250, 251)` and `color: rgb(17, 17, 20)`. Before it, `rgb(13, 13, 15)` on `rgb(242, 242, 244)`. |
| iii | All bullets present | **15 of 15.** `.rs-bullets li` with a client rect, in print media, counted against the derived total. |
| iv | Every external URL printed after its link text | **4 of 4.** `::after` content resolved to `" (https://github.com/akhil-saxena)"`, `" (https://www.linkedin.com/in/akhil-saxena)"`, `" (https://www.brevo.com)"` and `" (mailto:saxena.akhil42@gmail.com)"`. |
| v | The download button absent | **Absent.** `.rs-actions` computes `display: none`; `.pub-bar` and `.pub-footer` likewise, from the shell. |

Type roles, measured in both media: bullet **15px → 15px**, entry title **22px → 17px**, lede
**13px → 15px**. Nothing on paper below `--text-md`.

### The OQ-5 residual is narrower than recorded

§11.3 and OQ-5 accept the risk that "some headless print-to-PDF paths do not fire `beforeprint`".
MEASURED here: **headless Chromium's `page.pdf()` DOES fire it** — the listener counter incremented
during the PDF call, and `afterprint` fired on completion. The residual is real for *other* headless
paths, but the one this project would most plausibly hit is not among them. Recorded as a narrowing
of a known risk, not as a closure.

### 🔴 The planted `break-inside` defect — the rule IS load-bearing

The plan anticipated that this assertion might not fire at the current content length. It does.

Plant: the served page's inline print rule rewritten in flight from
`.rs-entry,.rs-skill-group,.rs-education{break-inside:avoid}` to `…{break-inside:auto}`. The planter
refuses if its anchor is absent — proven by running it with a deliberately wrong anchor
(`REFUSED: /resume answered 500 — ANCHOR NOT FOUND`, exit **1**).

| | page 1 | page 2 |
|---|---|---|
| `break-inside: avoid` | 117,093 bytes | 122,098 bytes |
| `break-inside: auto` | **129,829** bytes | **101,297** bytes |

12,736 bytes of content moved from page 2 onto page 1. Independently confirmed by measuring the
un-paginated print flow at A4 width (page box `((297−30)/25.4)×96 = 1009px`):

```
rs-entry  Brevo (Formerly Sendinblue)   top  143  bottom  501   straddles: no
rs-entry  PharmEasy                     top  533  bottom  749   straddles: no
rs-entry  MAQ Software                  top  781  bottom 1052   straddles: YES
rs-skill-group ×3, rs-education                                 straddles: no
```

**The MAQ Software entry crosses the page boundary and the rule is what pushes it whole onto page
2.** It is currently load-bearing, not defensive.

### The measure, and a correction to the plan's arithmetic

`.rs-prose { max-width: min(68ch, 100%) }`, not restated in the print block. MEASURED: DM Sans
Variable's `0` advance at `--text-md` is **10.19px**, so 68ch is **~698px** — *wider* than an A4
column, which at the shell's 15mm margins is **680px**. At A4 width the column measures **680px of
680px**, so on paper the `100%` half of the `min()` binds, not the `68ch` half. The two answers are
within 3% of each other, the declaration is still right and still the only one, and this is written
down so nobody "corrects" it after measuring 680 and expecting 698.

A real defect was found here and fixed in `5f2da66`: the `--text-md` role was declared on the `<ul>`
one level below the element carrying the cap, so `ch` resolved against the inherited 16px body size.
The column came out **744px where the role gives 698px, 6.6% too wide**, with nothing on the page
looking broken.

---

## Every gate proven able to fail

Four steps each: **plant → FAIL naming it · FAIL given nothing to check · PASS on correct code ·
walk-through**. The interactive shell here is **zsh 5.9**; every gate body ran under **bash
5.3.9(1)-release** via `bash <file>`, and the shell is named per control below.

Two of my own controls were **defective and are recorded as such**, because that is the point.

### A. The print-block colour check (task 3) — shell: bash 5.3.9(1)-release

Verbatim, as run:

```bash
bash -c 'set -e; node -e "const fs=require(\"fs\");const css=fs.readFileSync(\"src/styles/resume.css\",\"utf8\");const body=css.split(/@media\s+print\s*\{/)[1]||\"\";const clean=body.split(/\r?\n/).filter(l=>!/^\s*(\/\*|\*|\/\/)/.test(l)).join(\"\n\");const bad=clean.match(/#[0-9a-fA-F]{3,8}\b|--(cream|ink|paper|wire|rule)[a-z0-9-]*\s*:/g);process.stdout.write(\`print-block violations: \${bad?bad.join(\", \"):\"none\"}\n\`);if(!body){process.stdout.write(\"FAIL: no @media print block found to check\n\");process.exit(1)}if(bad){process.exit(1)}"'
```

| # | Control | Result |
|---|---|---|
| D1 | correct code | `print-block violations: none` · exit **0** |
| D2 | plant `color: #0d0d0f` inside the print block | `print-block violations: #0d0d0f` · exit **1** |
| D3 | plant `--ink:` / `--cream:` restatements | `print-block violations: --ink:, --cream:` · exit **1** |
| D4 | print block removed (`@media print {` → `@media screen and (min-width: 99999px) {`) | `FAIL: no @media print block found to check` · exit **1** — it refuses rather than passing vacuously |

Every plant asserted its own anchor and its own resulting digest; every restore was verified
byte-identical to the pre-plant original.

**Walk-through — three inputs that satisfy the check while violating its intent. All OPEN:**

| Probe inside the print block | Verdict |
|---|---|
| `color: rgb(13 13 15);` | exit 0 — **ACCEPTED.** The pattern knows hex, not functional notation. |
| `color: black;` | exit 0 — **ACCEPTED.** Named colours are invisible to it. |
| `--ochre-d: rgb(180 120 40);` | exit 0 — **ACCEPTED.** The token deny-list is `cream\|ink\|paper\|wire\|rule`; the accent ramp is not on it. |

And one **false-positive** shape: the comment filter drops lines that *start* with a comment marker,
so a TRAILING comment is scanned — `margin-bottom: var(--space-8); /* never write #0d0d0f here */`
fails the check on prose. Recorded rather than fixed: a check that fires on a comment is loud and
fixable, and tightening it toward a real CSS parser is out of this plan's scope.

### B. The bullet / double-encoding artefact check (task 1) — shell: bash 5.3.9(1)-release

🔴 **The plan's own command is defective and was replaced. See "Three defects in the plan's verify
commands" below.** The corrected command, verbatim:

```bash
set -e; node -e "const fs=require(\"fs\");const h=fs.readFileSync(\"dist/client/resume/index.html\",\"utf8\");const r=require(\"./data/resume.json\");const nb=r.experience.reduce((a,e)=>a+e.bullets.length,0)+r.education.reduce((a,e)=>a+e.leadership.length,0);const blocks=[...h.matchAll(/<div class=\"rs-bullets[^\"]*\">([\s\S]*?)<\/div>/g)].map(m=>m[1]);const li=blocks.reduce((a,b)=>a+(b.match(/<li[\s>]/g)||[]).length,0);process.stdout.write(\`bullets \${nb} blocks \${blocks.length} li \${li}\n\`);if(nb===0){process.stdout.write(\"FAIL: resume.json yielded no bullets — this check would compare nothing\n\");process.exit(1)}if(blocks.length===0){process.stdout.write(\"FAIL: no rs-bullets block in the built page — the renderer is missing, not the data\n\");process.exit(1)}if(li!==nb){process.stdout.write(\`FAIL: \${li} rendered bullet(s) against \${nb} stored\n\`);process.exit(1)}if((h.match(/&amp;amp;/g)||[]).length){process.stdout.write(\"FAIL: double-encoded ampersand\n\");process.exit(1)}process.stdout.write(\"OK: every stored bullet rendered, no double encoding\n\")"; test -f dist/client/resume.pdf
```

| # | Control | Result |
|---|---|---|
| B1 | correct artefact | `bullets 15 blocks 4 li 15` · `OK` · exit **0** |
| B2 | one `<li>` deleted from the built page | `bullets 15 blocks 4 li 14` · `FAIL: 14 rendered bullet(s) against 15 stored` · exit **1** |
| B3 | the stored `&` double-encoded to `&amp;amp;` | `FAIL: double-encoded ampersand` · exit **1** |
| B4 | the renderer removed (`class="rs-bullets rs-prose"` → `class="rs-gone"`), data intact | `bullets 15 blocks 3 li 9` · `FAIL: 9 rendered bullet(s) against 15 stored` · exit **1** |
| B5 | the built page absent | refuses with `ENOENT … open 'dist/client/resume/index.html'` · exit **1** |
| B6 | `dist/client/resume.pdf` absent | exit **1** — see the false control recorded below |

**Walk-through — two inputs that satisfy the corrected check while violating its intent. Both OPEN,
and both are closed by `test/public/resume.node.test.ts` instead:**

| Probe in the built page | Verdict |
|---|---|
| a bullet's TEXT replaced, element kept | exit 0 — **ACCEPTED.** It counts elements, not text. The suite compares decoded text to the stored string and catches this. |
| `<strong>6×</strong>` → literal `**6×**` | exit 0 — **ACCEPTED.** Markup shape is not checked. The suite derives the `<strong>` count from the `**` pairs and catches this. |

### C. The JSON-LD / module-script greps (task 2) — shell: bash 5.3.9(1)-release

| # | Control | Result |
|---|---|---|
| C1 | correct artefact | `OK: no JSON-LD` · `OK: no module script` · exit **0** |
| C2 | plant `<script type="application/ld+json">{j}</script>` | `FAIL: JSON-LD present` · exit **1** |
| C3 | plant `<script type="module" src="/_astro/x.js">` | `FAIL: framework JS on /resume` · exit **1** |
| C4 | the built page absent | `FAIL: dist/client/resume/index.html does not exist — the assertion below would pass having read nothing` · exit **1** |

C4 was **first recorded before the route existed at all**, when `dist/client/resume/` was genuinely
absent, and the unguarded shape was shown to pass vacuously in the same breath:

```
--- the UNGUARDED shape, against the same absent file ---
OK: no JSON-LD  <-- VACUOUS: it read nothing
grep raw exit against a missing file:  grep exit = 2
```

`grep` exits **2** on a missing file and an `if` reads that as "not found". Every `! grep` in this
plan carries a `test -f` guard as its own failing step.

**Walk-through — two OPEN holes in the plan's greps:**

| Probe appended before `</body>` | Verdict |
|---|---|
| `<script type='module' src='/x.js'></script>` | exit 0 — **ACCEPTED.** The grep matches only the double-quoted spelling. This is 03-06's exact defect class. Astro emits double quotes today, so it is a shape rather than a live hole. **Closed by the suite**, which matches both quote forms. |
| `<script>import("/x.js")</script>` | exit 0 — **ACCEPTED.** Framework JavaScript with no `type="module"` at all. **NOT closed by the suite.** 05-14's bundle gate is the right owner. |
| `<script type="application/ld+json" >{}</script>` (extra space) | exit 1 — refused. |

### D. `test/public/resume.node.test.ts` — 13 controls, shell: zsh 5.9 driving `npx vitest run`

Green: **13 passed**, against the built artefact served by real `workerd`. Evidence lines, verbatim
(written with `process.stdout.write` — `console.log` prints nothing under this repo's vitest setup):

```
resume: 18943 bytes of HTML from http://127.0.0.1:57471/resume
bullets: 15 stored, 15 rendered, all matching exactly
bold runs: 17 stored, 17 <strong> elements rendered
ampersands: 1 stored, 0 double-encoded occurrences in the served page
skills: 3 group(s), 16 item(s), all present
pdf: /resume.pdf served, 131710 bytes, magic %PDF- present
person: name/jobTitle/worksFor/url present; url === canonical === https://akhilsaxena.com/resume
sameAs 2/2 · email 1/1 · links 3
microdata casing: no itemProp/itemScope/itemType in the served bytes
json-ld: 0 occurrences (OQ-2 option 1 — microdata, no sink, no script)
scripts: 1 tag(s) on the page, 0 of type=module, 0 astro-island
script bodies: 1 inspected, 0 carrying {j} / {{ / ${
print css: 130516 bytes served; print block, breaks, 68ch measure and href^=http present
```

**Planted defect, in SOURCE, through the suite's own `astro build`:** `itemtype="https://schema.org/
Person"` removed from the wrapper.

```
FAIL  |integration| … > carries a Person itemscope with name, jobTitle, worksFor and url
AssertionError: expected '<!DOCTYPE html><html lang="en" data-b…' to contain 'itemtype="https://schema.org/Person"'
Tests  1 failed | 12 passed (13)
```

It goes red **naming the missing property**, and the other twelve stay green — the failure is scoped
to the claim that broke. Reverted; `git status` reports the file byte-identical to the committed one.

**Anti-vacuity:** every derived expectation in the suite is preceded by an assertion that the
fixture is non-trivial — bullets > 0, bold runs > 0, ampersands > 0, skills > 0, socialLinks > 0,
`rs-bullets` blocks > 0, script bodies > 0, CSS bytes > 0, and a current experience record exists.
A suite that derives `0` from an emptied fixture and then passes zero comparisons is the failure
this phase's register is full of.

### Two of my own controls were DEFECTIVE, and here is how each was caught

1. **A `zsh` `echo` round-trip silently broke the check.** I wrote the corrected artefact command to
   a file with `echo "$VAR" > file`. zsh's builtin `echo` interprets `\n`, so every `\n` inside the
   embedded JavaScript string literals became a real newline and the file was a **syntax error**.
   Three controls then ran it: one reported "refused with ENOENT" (it never printed ENOENT), and two
   reported clean exits. **Caught because each control prints the check's own diagnostic line, not
   just an exit code** — the syntax error was visible where "ENOENT" should have been. Rewritten
   with a quoted heredoc, which does not interpret. This is 05-05's "two false PASSes" in a new
   costume.

2. **A reporting line took `sed`'s exit status, not the check's.** `bash "$CHK" | sed 's/^/   /'; echo "-> exit $?"`
   reports the exit of the *last* command in the pipeline. Controls C2, C3 and C4 printed their
   `FAIL:` lines and then `-> exit 0`. Caught by reading the output rather than the status.
   Re-run capturing the status into a variable before the pipe. (In zsh the array is
   `${pipestatus[1]}`, one-indexed; `${PIPESTATUS[0]}` is the bash spelling and is wrong here.)

### And one FALSE CONTROL caused by the shared tree

Control B6 — "the PDF absent" — reported `OK … exit 0` the first time. A concurrent plan's build
**regenerated `dist/client/resume.pdf` between my `mv` and the check**. Re-run with an explicit
presence assertion at test time (`is dist/client/resume.pdf present at test time? no`) it exits
**1** correctly. **Standing rule this adds: in a shared-artefact wave, a control asserts the state
it believes it created, at the moment it runs.**

---

## 🔴 Three defects in the plan's own `<verify>` commands

All three are in Task 1's and Task 2's blocks as written, and all three were found by detonating
them rather than by reading them.

### 1. `/<li/g` also matches `<link` — and this plan adds three `<link>` elements

The plan counts bullets with `(h.match(/<li/g)||[]).length`. On the built page that returns **24**
where there are **15** bullets: 3 contact `<li>` and **6 `<link>` elements**, three of which are the
`<link itemprop="sameAs">` tags this very plan introduces. **A gate whose slack grows with the
feature it guards.** Fixed with `/<li[\s>]/g`, scoped to the `.rs-bullets` blocks.

### 2. `li < nb` is a floor, not an equality — a deleted bullet PASSES

Measured, not inferred. With `<li>Lead, NASA-sponsored CAMS-SETI</li>` deleted from the built page:

```
bullets 15 li 23
OK: no double encoding
   -> exit 0
```

The predicate has nine elements of slack and cannot fire until nine bullets are gone. Fixed with
`li !== nb`.

### 3. No anti-vacuity on the block count

The original refuses only when `nb === 0`. If the renderer disappeared and the data stayed, `li`
would be 9 (the contact and link elements) and, under the original floor, could still pass. The
corrected command refuses separately when it finds **no `rs-bullets` block at all**, with a message
that distinguishes "the renderer is missing" from "the data is missing" — control B4.

**Task 3's command was found sound** and is quoted verbatim above; its three walk-through holes are
properties of its pattern, not defects in its wiring.

---

## Contradictions with the plan and the UI-SPEC

| # | Where | What |
|---|---|---|
| 1 | §11.1 item 3 | `<Button as="a" href="/resume.pdf" download>` — **not implementable.** `Button` has no `as`. The plan's `<interfaces>` already flags this; recorded again because the UI-SPEC body still carries the prescription. |
| 2 | §3.1 vs §11.3 | §3.1 gives the résumé bullet the `--text-md` (15px) role **on screen**; §11.3 says print "moves body from the `--text-base` (13px) role to `--text-md`", which presumes the bullet is 13px on screen. Resolved: §3.1 honoured for the bullet, §11.3's intent (nothing on paper below `--text-md`) honoured by moving the 13px META roles up. |
| 3 | §11.3 "the 68ch cap becomes the print column" | Arithmetically it is the other way round: 68ch at `--text-md` is ~698px and the A4 column is 680px, so `100%` binds. Measured at A4 width: 680 of 680. Same declaration, opposite half of the `min()`. |
| 4 | §11.3 links rule | §11.3 gives only `a[href^="http"]`. The contact row's email anchor reads "Email", which recovers nothing on paper, so `a[href^="mailto:"]` was added — the intent §11.3 states is "every URL recoverable on paper". |
| 5 | §11.1 structure list | Does not include the `metric`, and `src/schemas/resume.ts` scopes it to `/work`. It is rendered here on the orchestrator's instruction. Flagged for 05-15. |
| 6 | Plan task 2 | Specifies `<a itemprop="sameAs">` per social link. Implemented as `<link itemprop="sameAs">` plus `<meta itemprop="email">`, because React 19 will not lower-case an attribute on the design system's `Link`. Counts are still derived per social link and their sum asserted. |
| 7 | UI-SPEC §11.2 / plan `<interfaces>` | Both say "13 bullets". Correct for `experience`; the plan's own verify formula (and this page) also render the **2** education `leadership` items, so the page total is **15**. Neither figure is written down anywhere in code. |
| 8 | 05-06's summary | "Builds have become slow… exceeded 10 minutes twice." Not reproduced: four clean `rm -rf dist && npm run build` runs completed in **2–4 minutes** each. |
| 9 | OQ-5 residual | "some headless print-to-PDF paths do not fire `beforeprint`" — measured: Chromium's `page.pdf()` **does** fire it. |

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — Bug] The `68ch` measure resolved against the inherited font size**
- **Found during:** task 3's browser verification
- **Issue:** the `--text-md` role was on `.rs-bullets ul`; the cap was on `.rs-bullets`. `ch`
  resolves against the font of the element the property is on, so the cap used the inherited 16px.
- **Fix:** the role moved to the wrapper; the `<ul>` inherits it. 744px → 698px.
- **Files:** `src/styles/resume.css` · **Commit:** `5f2da66`

**2. [Rule 1 — Bug] Microdata attributes shipped camel-cased**
- **Found during:** task 2's first artefact read (`grep` reported zero `sameAs` on a correct page)
- **Issue:** React 19 emits `itemProp`/`itemScope`/`itemType` verbatim.
- **Fix:** the two URL-valued properties moved to plain `<link>`/`<meta>` elements; a regression
  guard added to the suite.
- **Files:** `src/pages/resume.astro`, `test/public/resume.node.test.ts` · **Commit:** `b46e8f9`

**3. [Rule 2 — Missing critical functionality] `mailto:` links were unreadable on paper**
- **Fix:** `a[href^="mailto:"]::after` added beside §11.3's `http` rule.
- **Files:** `src/styles/resume.css` · **Commit:** `b46e8f9`

**4. [Rule 2 — Missing critical functionality] The plan's task-1 verify could not detect a missing
bullet.** Replaced with a scoped, exact-equality command carrying its own anti-vacuity refusals.
Recorded in full above and quoted verbatim so 05-14/05-15 use the corrected form.

**5. [Rule 1 — Bug, in my own comments] Two numeric claims were computed rather than measured.**
The CSS header asserted "68ch is ~517px" and the fix comment asserted "a fifth too wide". Both were
wrong (698px and 6.6%). Corrected in `5f2da66` against the browser measurement.

### Deliberate non-actions

- **No escaper anywhere.** React escapes text children by construction; the corpus's single `&`
  renders once, and the suite asserts zero `&amp;amp;` and zero `&#38;#38;`.
- **`gate:sinks` untouched.** No rule added, no allowlist entry added.
- **No local `@media print` colour.** Not one token restated; the mode change stays the shell's.
- **The Footer underline defect** (05-06, `Link variant="footer"` inline
  `textDecorationColor: rgba(0,0,0,.25)`) reaches this page through the shared shell and was **not**
  patched locally — same reasoning as 05-06.
- **`data/resume.json` and `data/portfolio_images.json` were read and never written.**

---

## Concurrency notes for the coordinator

This plan ran beside **05-07** and **05-11** in one working tree, and the tree bit three times:

1. **`dist/` is shared and every wave-4 plan rebuilds it.** A concurrent `rm -rf dist` landed in the
   middle of an artefact control run: the harness refused at every step (`REFUSED: … does not
   exist`) rather than reporting a pass, but three restores did not happen because **the backups
   were inside `dist/`**. Backups moved outside the tree they protect. If any plan reads
   `dist/client/**` and believes it, it must rebuild first and hold its reference copy elsewhere.
2. **A concurrent build regenerated a file between a control's `mv` and its check**, producing a
   false PASS (control B6). Fixed by asserting presence at test time.
3. **`npm run build` was red at 08:04 on 05-07's `src/pages/photos/[category]/index.astro`**
   (`gate:schema` / `HAND-ROLLED-VALIDATOR`) and green from 08:12 onward. 05-07 also wired
   `gate:ladder` into `gate:content` — the item 05-06 carried forward — and it passes with this
   route consuming `PublicLayout`.
4. **`npm run check` is currently RED and none of it is mine.** `scripts/assert-ds-import-contract.mjs`,
   `scripts/lib/r2.mjs`, `test/pipeline/workflow-contract.unit.test.ts`,
   `test/public/home.node.test.ts`, and two `*.tmp.mjs` probe files left at the repo root
   (`measure-05-11.tmp.mjs`, `probe-loadsnap.tmp.mjs`). Zero occurrences of "resume" in the log; my
   four files pass `biome check` and `prettier --check` in isolation. **Those two `.tmp.mjs` files
   must not be committed.**
5. **Only my own paths were ever staged.** No `git add -A`, no `git add` from a verify step, no
   `git checkout`/`stash`/`reset`/`clean`/`worktree`.

---

## Verification

| Command | Result |
|---|---|
| `npm run build` | **exit 0** (clean `rm -rf dist` rebuild; `gate:content` = schema · sinks · origin · routes · ds · ladder) |
| `npm run typecheck` | **exit 0** — 0 errors, 0 warnings, 7 pre-existing hints |
| `npx vitest run test/public/resume.node.test.ts` | **13 passed** |
| `node scripts/assert-no-raw-html-sinks.mjs` | **exit 0** — 5/5 rules flagged their canary, allowlist unchanged at 2 entries |
| `node scripts/assert-ds-import-contract.mjs` | **exit 0** — 3/3 rules, 18 canaries |
| `node scripts/assert-gutter-ladder.mjs` | **exit 0** — 4 rungs, 4 maxima, `.pub-max-band min(1080px,100%)` = `PAGE_MAX.band` |
| `node scripts/assert-no-unresolved-placeholders.mjs` | **exit 0** — 2/2 rules, 12 canaries, 0 tokens in `dist/` |
| `npm run check` | **RED, and none of it is this plan's** — see concurrency note 4 |
| `npm test` | **exit 0** — 37 files, **1354 passed**, 0 failed (all three projects: unit, integration, workers) |
| `git add` inside a verify step | **never** |

---

## Known Stubs

None. Every element on the page is wired to `data/resume.json` or `data/home_config.json`; there is
no placeholder text, no empty array flowing to a renderer and no "coming soon".

The three `metric` values ARE placeholders in the editorial sense (OQ-1b) — but they are real
committed data rendered from the record, not stubs in the code, and the mechanism that catches a
`{{…}}` token reaching a reader is wired and passing.

## Threat Flags

None. The page introduces no network endpoint, no auth path, no file access and no schema change.
`T-05-10-01` (stored XSS through bullets) is mitigated as planned — `Bullets` renders elements and
text children, `gate:sinks` re-run and unchanged. `T-05-10-02` (structured data) is mitigated: the
microdata lands in attributes and text nodes Astro escapes, and the JSON-LD path that would need a
sink is not taken and its absence is asserted. `T-05-10-03` (`public/resume.pdf` public) is accepted
as planned.

## For the plans that depend on this one

- **05-14 (bundle / JS budget):** `/resume` ships **one** `<script>` tag — the shell's inline theme
  block — zero `type="module"`, zero `astro-island`. The suite asserts all three. **Not closed by
  anything today: a dynamic `import()` inside a classic script.** That is your gate.
- **05-15 (human review):** two things to look at. (i) The download CTA reads as a link, not a
  button — the `Button`-has-no-`as` consequence. (ii) The `metric` renders on this page, and §11.1
  does not list it; if it should go, it is one block in `ResumeEntry.astro` and two rules in
  `resume.css`, with no test depending on it.
- **Anyone writing microdata or any `item*` attribute:** do NOT put it on a React component. React
  19 emits it camel-cased. Use a plain element; the suite's casing guard will catch you.
- **Anyone using a `ch` measure:** declare the type role on the same element as the cap.
- **Anyone reading `dist/`:** rebuild first, and keep your reference copy outside `dist/`.
- **Upstream, for `2.0.0-beta.2`:** `Button` should accept `as`, mirroring `Link`.

---

## Self-Check: PASSED

All five files this plan claims to have created exist on disk; `public/resume.pdf` and both built
artefacts (`dist/client/resume/index.html`, `dist/client/resume.pdf`) are present. All four commit
hashes quoted above resolve in `git log`.

```
FOUND: src/pages/resume.astro
FOUND: src/components/public/ResumeEntry.astro
FOUND: src/styles/resume.css
FOUND: test/public/resume.node.test.ts
FOUND: .planning/phases/05-public-site/05-10-SUMMARY.md
FOUND: public/resume.pdf              (131,710 bytes, committed 2026-06-17)
FOUND: dist/client/resume/index.html
FOUND: dist/client/resume.pdf
FOUND: b46e8f9  feat(05-10): /resume — the whole record, the PDF, Person microdata and the print sheet
FOUND: f0e0a45  test(05-10): the /resume HTTP suite — microdata, no JSON-LD, no module script
FOUND: 5f2da66  fix(05-10): the 68ch measure resolved against the wrong font size
FOUND: 3294e59  docs(05-10): the React 19 microdata finding, reframed against a measured consumer
```
