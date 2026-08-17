# Phase 0: Design & Ideation - Pattern Map

**Mapped:** 2026-08-17
**Files analyzed:** 41 artefact classes (≈ 60 concrete files, since 7 admin routes × N states collapse to 7 files under Pattern 2)
**Analogs found:** 31 / 41 with a real analog · 6 partial · 4 with none

---

## Read this first — what "analog" means in a design phase

Phase 0 writes **no production application code**. Almost everything it produces is either
(a) a throwaway Astro/React sketch under `.playground/`, or (b) a markdown design document
in this phase directory. So the analogs live in three places, none of them in the current
working tree of this repo:

| Analog source | Why it is the analog | How to reach it |
|---------------|----------------------|-----------------|
| **The legacy Next.js app** — `legacy/nextjs-portfolio` branch | The admin being redesigned, and the public pages being recoloured. **Purged from `main`; the working tree has no `src/`.** | `git show legacy/nextjs-portfolio:<path>` |
| **`../design-system`** (sibling checkout, v1.11.4) | The component APIs the sketches must call, the token-block shape `theme-charcoal.css` must mirror, and the test helpers the measurement scripts must port | Read-only filesystem |
| **`design_handoff_portfolio/*.dc.html`** | The verbatim ivory markup DSGN-03 resolves onto charcoal | In the working tree |

**Working-tree reality check.** `/Users/akhilsaxena/Documents/Personal/Repositories/portfolio/`
currently contains only `.planning/`, `data/`, `design_handoff_portfolio/`, `public/`,
`CLAUDE.md`, `README.md`. There is **no root `package.json`**, no `src/`, no `node_modules`.
CLAUDE.md's §Architecture describes the legacy app, which is on the branch, not on disk.
Any plan step that says "modify `src/…`" is wrong for this phase.

---

## File Classification

### Group A — Playground harness config (`.playground/`, gitignored, deleted at exit)

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `.playground/package.json` | config | — | `../design-system/package.json`; `git show legacy/nextjs-portfolio:package.json` | partial |
| `.playground/astro.config.mjs` | config | — | none in either repo — Astro is new to this codebase | **none** |
| `.playground/src/styles/theme-charcoal.css` | config / token layer | transform (build-time cascade) | `../design-system/src/tokens.css` | **exact** |
| `.playground/src/styles/fonts-charcoal.css` | config / font layer | file-I/O (asset delivery) | `../design-system/src/tokens.css:6-23` | role-match |
| `.playground/src/styles/manifest.css` | config | transform | `../design-system/package.json` `exports["./css/*"]` + `dist/css/` (74 sheets) | partial |
| `.playground/src/styles/density-compact.css` | config prototype | transform | **none** — no density axis exists anywhere | **none** |
| `.playground/fixtures/stub-theme-pkg/` (package.json + 2 empty CSS) | config fixture | — | `../design-system/package.json` `exports` + `src/packaging.test.ts` | **exact** |

### Group B — Measurement scripts (`.playground/*.mjs`, committed into the phase dir)

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `check-theme-exhaustive.mjs` | test (static) | transform | `../design-system/src/tokens.test.ts:9-25, 45-51` | **exact** |
| `check-contrast.mjs` | test (static) | transform | `../design-system/src/tokens.test.ts:107-187` | **exact** |
| `check-font-names.mjs` | test (static) | transform | `../design-system/src/tokens.test.ts:53-74` | role-match |
| `check-css-size.mjs` | test (build) | file-I/O batch | `../design-system/scripts/split-css.mjs --check` (`npm run css:check`) | role-match |
| `check-bundle.mjs` | test (build) | file-I/O batch | `00-RESEARCH.md:1254-1277` — **already written and executed** | verbatim |
| `check-no-js.sh` | test (build) | batch | `00-RESEARCH.md:1286-1292` — already executed | verbatim |
| `probe.mjs` | test (e2e) | request-response (browser) | `00-RESEARCH.md:1300-1331` + `../design-system/playwright.config.ts` | verbatim + role-match |
| `check-copy-length.mjs` | test (static) | transform | `../design-system/src/tokens.test.ts:28-36` (`walk()`) | partial |

### Group C — Playground layouts & shell

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `src/layouts/Public.astro` | layout | static render | `design_handoff_portfolio/Work.dc.html:21-31` (nav) + `:94-98` (footer); `legacy:src/app/layout.tsx` | role-match |
| `src/layouts/Admin.astro` | layout | static render | `../design-system/src/layout/AppShell/index.tsx:10-32` + `AppShell.stories.tsx:26-60` (`MockSidebar`); `legacy:src/components/admin/AdminTopBar.tsx` | role-match |
| `src/pages/index.astro` (contact sheet) | page / index | transform (`import.meta.glob`) | `../design-system/src/OverviewPage.tsx` + `src/Overview.mdx` | partial |

### Group D — Admin sketch routes (7 files, states via `?state=`)

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `src/pages/admin/index.astro` (S-dashboard) | page / screen | event-driven | `legacy:src/components/admin/DeployButton.tsx:54-73` (the pending diff) | role-match |
| `src/pages/admin/home.astro` (S-home) | page / screen | CRUD | `legacy:PropertiesPanel.tsx:669-807` | **exact** |
| `src/pages/admin/photos.astro` (S-photos) | page / screen | CRUD | `legacy:PropertiesPanel.tsx:335-418` + `DraggableMasonry.tsx` | **exact** |
| `src/pages/admin/resume.astro` (S-resume) | page / screen | CRUD | `legacy:PropertiesPanel.tsx:421-668, 893-937` | **exact** |
| `src/pages/admin/projects.astro` (S-projects) | page / screen | CRUD | `legacy:PropertiesPanel.tsx:499-577` | role-match |
| `src/pages/admin/projects/[id].astro` (S-project-detail) | page / screen | CRUD | `legacy:PropertiesPanel.tsx:499-577` for the card half; **nothing** for the case-study half | partial |
| `src/pages/admin/site.astro` (S-site) | page / screen | CRUD | `data/site_config.json` + `legacy:PropertiesPanel.tsx:261-334` | partial |

### Group E — Public sketch routes

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `src/pages/work-recolour.astro` (X-work-recolour) | page | static | `design_handoff_portfolio/Work.dc.html` — **verbatim source, recolour only** | **exact** |
| `src/pages/work.astro` (X-work, restructured D-44/D-45) | page | static | `Work.dc.html:39-92` for the parts kept; `legacy:src/components/ProjectCard.tsx` | role-match |
| `src/pages/photos.astro` (X-photos) | page | static | `design_handoff_portfolio/Photos.dc.html` + `legacy:src/components/MasonryGrid.tsx` + `legacy:src/styles/photography.css:88-110` | **exact** |
| `src/pages/case/long.astro` (X-case-long) | page / template | static | **NO ANALOG** — see §No Analog Found | none |
| `src/pages/case/short.astro` (X-case-short) | page / template | static | **NO ANALOG** | none |

### Group F — Islands (exactly 3 may hydrate, per UI-SPEC §Hydration Budget)

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `src/components/FocalPointSketch.tsx` | component | event-driven (pointer) | `legacy:PropertiesPanel.tsx:739-786` — a working mouse-drag focal control | **exact** (as precedent *and* as the evidence for G-1/D-09) |
| `src/components/SortableReorder.tsx` | component | event-driven (DnD) | `../design-system` `Sortable` API (`dist/index.d.ts:3515-3550`); `legacy:DraggableMasonry.tsx` for the surrounding grid | **exact** |
| `src/components/RichTextBullets.tsx` | component | event-driven (editor) | `../design-system` `RichText` API (`dist/index.d.ts:3200-3230`) | **exact** (and the source of G-3/G-4) |

### Group G — Measurement fixtures

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `src/pages/probe/casc-{a,b,c,d}.astro` | fixture | static | `00-RESEARCH.md:1333-1337` (the four constructed orders) | verbatim |
| `src/pages/probe/island.astro`, `probe/static.astro` | fixture | static / hydrated | `00-RESEARCH.md:483-518` (measured at v1.11.4) | verbatim |
| `src/fixtures/*.{populated,empty,loading,error,dirty,conflict,success}.json` | fixture data | — | `data/*.json` — **real content, never lorem** | **exact** |

### Group H — Committed markdown artefacts (survive the playground's deletion)

| New file | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `00-FINDINGS.md` | doc | — | `00-UI-SPEC.md:641-658` — the 16-row gap register is **already the seed** | **exact** |
| `00-THEME-API.md` | doc | — | `00-UI-SPEC.md:288-493` (token tables + rules) + `../design-system/CHANGELOG.md` register | role-match |
| `00-ADMIN-IA.md` | doc | — | `00-RESEARCH.md:853-863` (entity→screen map) + `legacy:PropertiesPanel.tsx:92-105` | **exact** |
| `00-COPY/one-liners.md` | doc | — | `data/resume.json` current one-liners; `../hued/README.md` (the good shape) | role-match |
| `00-COPY/case-{design-system,cairn,hued,momentum,timeshift}.md` | doc | — | `../cairn/.planning/REMOVED.md` + `../design-system/CHANGELOG.md` register | role-match |
| `screenshots/00-*.png` | artefact record | — | none | n/a |
| `.gitignore` (add `.playground/`) | config | — | existing `.gitignore` at repo root | **exact** |

---

## Pattern Assignments

### `theme-charcoal.css` (config / token layer, transform)

**Analog:** `/Users/akhilsaxena/Documents/Personal/Repositories/design-system/src/tokens.css`
**Match:** exact. This is the file charcoal is a sibling of; copy its *shape*, not its values.

**File-header pattern** (lines 1-4) — state the import contract and the cascade dependency:

```css
/* @akhil-saxena/design-system v1.5.0 - token layer.
   Imported via:
     import "@akhil-saxena/design-system/tokens.css";
   Use BEFORE primitives.css and utilities.css (cascade order matters). */
```

**Block-structure pattern** — light block, then a commented dark block. This is the exact
structure `check-theme-exhaustive.mjs` parses, so the formatting is load-bearing:

```css
/* ─── Light mode tokens ─────────────────────────────────────────────── */
:root {
	--font-body: "Inter", -apple-system, …;
	--ink: #1c1c1a;
	…
}                                       /* ← closing brace at column 0 */

/* ─── Dark mode overrides ─────────────────────────────────────────────
   .dark (scoped container dark - Storybook Docs inline story wrappers) */
:root.dark,
.dark {
	…
}
```

Charcoal's selectors are `:root[data-brand="charcoal"] {` and
`:root[data-brand="charcoal"].dark {` (D-27). **Both `block()` helpers find the block by
`css.indexOf(selector)` then `css.indexOf("\n}", open)`** — so the closing brace must be at
column 0 and the blocks must not nest.

**Alias-declaration pattern** (lines 38-42) — charcoal must restate these, not inherit them:

```css
	/* Back-compat aliases (published since v0.1.0). */
	--font: var(--font-body);
	--mono: var(--font-mono);
	--display: var(--font-display);
	--serif: var(--font-serif);
```

**Comment-as-contract pattern** (lines 44-54) — every ramp step carries its measured
contract inline. Charcoal's block should carry UI-SPEC's three-surface ratios the same way:

```css
	/* Ink ramp (text + dark surfaces). Sourced from Cairn.
	   Contrast contract — measured against the *lightest* surface each step is
	   used on in light mode and the *darkest* in dark mode:
	     --ink    primary text      >= 14:1
	     …
	     --ink-5  decorative only   — hairlines/separators. Never use for text. */
```

**The one thing NOT to copy:** lines 6-23, the fourteen `@import "@fontsource/…"` rules.
D-29 splits those into `fonts-charcoal.css`. Copying them into `theme-charcoal.css` is the
exact defect the split exists to remove (measured: 73 `@font-face` rules, 128 font files,
2.36 MB — `00-RESEARCH.md:637-652`).

---

### `fonts-charcoal.css` (config / font layer, file-I/O)

**Analog:** `../design-system/src/tokens.css:6-23`
**Match:** role-match — same mechanism, different file, different families.

```css
/* @fontsource - replaces Google Fonts CDN @import. Versioned with the package. */
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
…
@import "@fontsource-variable/newsreader/opsz.css";
@import "@fontsource-variable/newsreader/opsz-italic.css";
```

Charcoal's Option A form (`00-RESEARCH.md:783-786`) is four imports:
`@fontsource-variable/playfair-display/wght.css`, `@fontsource-variable/dm-sans/wght.css`,
`@fontsource/ibm-plex-mono/latin-400.css`, `@fontsource/ibm-plex-mono/latin-500.css`.

**The trap this analog does not show you:** the DS's own families have no `Variable` suffix
mismatch, so `tokens.css` gets away with `--font-serif: "Newsreader Variable", Georgia, serif`
matching Fontsource's registered name by luck of a single family. Charcoal names **two**
variable families. `check-font-names.mjs` exists because of this (UI-SPEC:125-131).

---

### `check-theme-exhaustive.mjs` (test, static analysis)

**Analog:** `/Users/akhilsaxena/Documents/Personal/Repositories/design-system/src/tokens.test.ts`
**Match:** exact — the new script is the *mirror* of an assertion that already ships.

**Parser helpers to copy verbatim** (lines 9-25) — the only two functions needed:

```ts
/** Extract the declarations inside the first `{...}` block of a selector. */
function block(css: string, selector: string): string {
	const start = css.indexOf(selector);
	if (start === -1) throw new Error(`selector not found: ${selector}`);
	const open = css.indexOf("{", start);
	// Token blocks are flat (no nesting), so the next `}` at column 0 closes it.
	const close = css.indexOf("\n}", open);
	return css.slice(open, close);
}

function declaredIn(css: string): Set<string> {
	const out = new Set<string>();
	for (const m of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) out.add(m[1]!);
	return out;
}

const lightTokens = declaredIn(block(tokensCss, ":root {"));
const darkTokens = declaredIn(block(tokensCss, ":root.dark,"));
```

**The assertion being mirrored** (lines 46-51) — read the comment, it is the whole
justification for the new check:

```ts
	it("declares a light value for every token the dark theme overrides", () => {
		// A token that exists only under .dark silently resolves to nothing in
		// light mode. --rule-strong shipped that way.
		const darkOnly = [...darkTokens].filter((t) => !lightTokens.has(t));
		expect(darkOnly).toEqual([]);
	});
```

Charcoal needs the **opposite direction**: every *light* token restated in *dark*
(`00-RESEARCH.md:1339-1366` has the finished script). Both assertions should exist in
`00-THEME-API.md`'s handoff to Phase 1, because they catch different bugs.

---

### `check-contrast.mjs` (test, static analysis)

**Analog:** `../design-system/src/tokens.test.ts:107-187`
**Match:** exact. Do **not** hand-roll a WCAG formula — this one is tested and in CI.

**The ratio helpers** (lines 107-126) — copy verbatim:

```ts
function srgb(c: number) {
	const v = c / 255;
	return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string) { /* …expands #abc → #aabbcc, then 0.2126/0.7152/0.0722 */ }
function contrast(a: string, b: string) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi! + 0.05) / (lo! + 0.05);
}
```

**The `var()`-following resolver** (lines 135-144) — this is the non-obvious part, and it
is exactly why `--focus: var(--ochre-d)` can be declared once and still resolve per-mode:

```ts
function resolve(css: string, selector: string, name: string): string {
	const read = (sel: string) => {
		const re = new RegExp(`${name}:\\s*([^;]+);`);
		return block(css, sel).match(re)?.[1]?.trim();
	};
	const raw = read(selector) ?? read(":root {");
	if (!raw) throw new Error(`${name} not declared in ${selector} or :root`);
	const alias = raw.match(/var\((--[a-z0-9-]+)\)/);
	return alias ? resolve(css, selector, alias[1]!) : raw;
}
```

**The three-surface loop** (lines 153-169) — the shape UI-SPEC's Rule C-4 demands
("contrast is measured against **all three surfaces** of a mode, never the page alone"):

```ts
const lightSurfaces = ["--cream", "--cream-2", "--cream-3", "--panel", "--bg", "--paper-deep"];
for (const [mode, sel] of [["light", LIGHT], ["dark", DARK]] as const)
	for (const ink of ["--ink", "--ink-2", "--ink-3", "--ink-4"])
		for (const surf of …) {
			const ratio = contrast(resolve(tokensCss, sel, ink), resolve(tokensCss, sel, surf));
			if (ratio < 4.5) failures.push(`${mode} ${ink} on ${surf} = ${ratio.toFixed(2)}`);
		}
```

For charcoal, the threshold splits: **7:1** for `--ink-3`/`--ink-4` and `--ochre-d-strong`
(D-46/AAA-1), **4.5:1** for `--ochre-d`, **3:1** for `--wire` and `--focus`.

---

### `check-css-size.mjs` and `manifest.css` (config, transform)

**Analog:** `../design-system/scripts/split-css.mjs` (invoked as `npm run css:check`) and
`../design-system/scripts/postbuild.mjs:35-39`
**Match:** role-match — the DS *produces* the 74 split sheets; the manifest *consumes* them.

**Why the split sheets exist** (`postbuild.mjs:35-39`) — read this before writing the manifest:

```js
// ── 2. Per-component stylesheets ────────────────────────────────────────────
// Emitted into dist/css/ so a consumer can import only what they render:
// `base.css` (3KB) plus one file per component, instead of the whole 165KB
// sheet. See scripts/split-css.mjs for the round-trip integrity guarantee.
execFileSync(process.execPath, [join(root, "scripts", "split-css.mjs")], { stdio: "inherit" });
```

**The throw-don't-warn convention** (`postbuild.mjs:29-33`) — carry this into the manifest's
own verification:

```js
// package.json `exports` maps ./tokens.css, ./primitives.css and
// ./utilities.css directly at these paths, so a silent failure here publishes a
// package whose documented stylesheet entrypoints 404. Throwing is the point.
```

**The extensionless-specifier trap** (`../design-system/package.json` `exports["./css/*"]`,
confirmed measured at `00-RESEARCH.md:667-685`):

```js
import "@akhil-saxena/design-system/css/base.css";  // -> dist/css/base.css.css  ❌ build fails
import "@akhil-saxena/design-system/css/base";      // -> dist/css/base.css      ✅
```

74 sheets exist in `dist/css/`; the manifest picks ~14 for public, ~38 for admin.

---

### `stub-theme-pkg/` fixture (config fixture)

**Analog:** `../design-system/package.json:20-40` and `../design-system/src/packaging.test.ts`
**Match:** exact.

**Current `exports` map — the shape D-35 extends** (`package.json:20-40`):

```json
"exports": {
	".":               { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
	"./hooks":         { "types": "./dist/hooks/index.d.ts", "import": "./dist/hooks/index.js" },
	"./icons":         { "types": "./dist/icons/index.d.ts", "import": "./dist/icons/index.js" },
	"./tokens.css":     "./dist/tokens.css",
	"./primitives.css": "./dist/primitives.css",
	"./utilities.css":  "./dist/utilities.css",
	"./css/*":         { "style": "./dist/css/*.css", "default": "./dist/css/*.css" }
}
```

Also copy the `files` and `sideEffects` fields — `"files": ["dist", "README.md", "LICENSE"]`
and `"sideEffects": ["*.css"]` — because both bear on where the new CSS must land and on the
DS-09 measurement (three `sideEffects` variants were tried and produced byte-identical
output, `00-RESEARCH.md:508-512`).

`src/packaging.test.ts` already asserts *"every path in `exports` actually exists in dist"*
including wildcard patterns — so the new `./themes/*.css` and `./fonts/*.css` entries get
coverage free in Phase 1. Cite that in `00-THEME-API.md`.

---

### `src/layouts/Admin.astro` (layout, static render)

**Analog:** `../design-system/src/layout/AppShell/index.tsx` + `AppShell.stories.tsx`
**Match:** role-match.

**The prop contract the sketch must call** (`index.tsx:10-32`) — note the **four slots**,
which is precisely G-8:

```ts
export interface AppShellProps {
	/** Sidebar nav component - receives collapsed + onToggleCollapse via cloneElement */
	sidebar: ReactElement<{ collapsed?: boolean; onToggleCollapse?: () => void }>;
	/** Topbar component (AppBar DS-72 or any ReactNode) */
	topbar: ReactNode;
	/** Main page content */
	main: ReactNode;
	/** Optional footer (DS-73 or any ReactNode) */
	footer?: ReactNode;
	storageKey?: string | null;   // localStorage key; null disables persistence
	sidebarWidth?: number;        // @default 240
	className?: string;
	style?: CSSProperties;
}
```

**There is no `banner` slot.** D-15's persistent pipeline strip has nowhere to live — that
is G-8 (`00-UI-SPEC.md:651`), re-tiered to `should-fix-in-Phase-1`. The sketch should
compose the strip *into* `topbar` and record that it does not survive as a distinct region.

**Two SSR hazards this component carries** — relevant because the admin sketches are static:
`readStorage()` guards `typeof window === "undefined"` (lines 34-42) and `useState` +
`useEffect` mean the collapse state renders at its initial value under SSR. That is fine for
a sketch and must be *noted*, not worked around.

**Composition pattern to copy** (`AppShell.stories.tsx:26-60`) — how a sidebar child is
written so `cloneElement` can inject into it:

```tsx
const NAV_ITEMS = [
	{ label: "Dashboard", initial: "D" }, { label: "Projects", initial: "P" }, …
];

function MockSidebar({ collapsed, onToggleCollapse }:
	{ collapsed?: boolean; onToggleCollapse?: () => void }) {
	return (
		<div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4,
		              height: "100%", background: "var(--surf-2)" }}>
			<Button variant="ghost" size="sm" onClick={onToggleCollapse}
			        aria-label="Toggle sidebar" style={{ justifyContent: "center", marginBottom: 4 }}>
				{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
			</Button>
```

`sidebarWidth` defaults to **240**; UI-SPEC's compact target is **208** (`--ds-sidebar-w`,
which the D-31 allowlist marks MUST-NOT-redefine by a brand theme — so it is a density
concern, G-2, not a charcoal one).

---

### `src/pages/admin/photos.astro` (page / screen, CRUD)

**Analog:** `git show legacy/nextjs-portfolio:src/components/admin/PropertiesPanel.tsx` lines 335-418
**Match:** exact — this is the field catalog, verbatim.

**The `Selection` union — the whole IA in 13 lines** (`PropertiesPanel.tsx:92-105`). Copy
this into `00-ADMIN-IA.md` and map each variant onto a D-05 route:

```ts
export type Selection =
  | { type: "none"; tab: "home" | "photography" | "dev" }
  | { type: "photo"; photo: PortfolioPhoto }
  | { type: "role"; entry: ExperienceEntry; entryIndex: number }
  | { type: "project"; project: ProjectEntry; projectIndex: number }
  | { type: "skillGroup"; group: SkillGroup; groupIndex: number }
  | { type: "education"; entry: EducationEntry; entryIndex: number }
  | { type: "homeTitle" }
  | { type: "homeSubtitle" }
  | { type: "homeIntro" }
  | { type: "homeGallery"; photoIndex: number }
  | { type: "homeSocial" }
  | { type: "homeCta"; ctaIndex: number }
  | { type: "resume" };
```

**The field-markup pattern to replace** (lines 347-368) — this is the shape every admin
sketch converts from bespoke markup to DS `Field` + `TextInput` / `Select`:

```tsx
<label className="admin-field">
  <span className="admin-field-label">Title</span>
  <input type="text" value={photo.title}
         onChange={(e) => onUpdatePhoto(photo.id, { title: e.target.value })}
         className="admin-input" />
</label>
<label className="admin-field">
  <span className="admin-field-label">Category</span>
  <select value={photo.category} onChange={…} className="admin-input">
    {CATEGORIES.map((c) => (
      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
    ))}
  </select>
</label>
```

Note `c.charAt(0).toUpperCase()` — **that Title-casing at render time is the D-25 drift**,
made visible. `00-ADMIN-IA.md` should cite this line as the origin.

**The label typography the legacy admin used** (`legacy:src/styles/admin.css:714-726`) —
which UI-SPEC's admin table already restates as mono 9.5px + `--ls-wide`:

```css
.admin-field { display: flex; flex-direction: column; gap: 4px; }
.admin-field-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
}
```

**The EXIF sub-form** (lines 382-409) — 6 fields, each spreading a full null-defaults object.
`product-peppers` has no EXIF at all and `architecture-redbuilding` has camera only
(`00-CONTEXT.md` §Specific Ideas), so the sketch must show **omitted rows, never `—`**.

**DS composition target** (`00-UI-SPEC.md:592`): `DataGrid` (list) · `Sortable`/`SortableItem`
+ `onReorder` (grid) · `FileInput variant="dropzone"` · `Chip` (category filter) · `Badge`
(pipeline state) · `EmptyState`.

**`DataGrid`'s relevant props** (`../design-system/dist/index.d.ts:3178-3197`) — it already
has the loading state D-03 needs, and the comment explains why:

```ts
interface DataGridProps extends React.HTMLAttributes<HTMLDivElement> {
	columns: DataGridColumn[];
	rows: DataGridRow[];
	page?: number; totalPages?: number; onPageChange?: (page: number) => void;
	onSelectionChange?: (ids: Array<string | number>) => void;
	/**
	 * Show a loading row instead of the body while rows are being fetched. An
	 * empty grid and a grid that has not loaded look identical otherwise, so the
	 * user cannot tell "no matches" from "not yet".
	 */
	loading?: boolean;
	loadingText?: string;   // @default "Loading…"
}
```

---

### `src/pages/admin/home.astro` + `src/components/FocalPointSketch.tsx`

**Analog:** `legacy:PropertiesPanel.tsx:723-807`
**Match:** exact — a working focal-point control already exists, and its *defects* are the
evidence for both G-1 and D-09's desktop-only refusal.

**The existing implementation** (lines 739-786) — mouse-only, inverted delta, `/2` damping,
0-100 clamp, live `objectPosition`:

```tsx
<span className="admin-field-label">Position (drag to adjust)</span>
<div className="admin-pan-frame"
  onMouseDown={(e) => {
    e.preventDefault();
    const frame = e.currentTarget;
    const img = frame.querySelector("img") as HTMLImageElement;
    if (!img) return;
    const startX = e.clientX, startY = e.clientY;
    const pos = (currentPosition || "50% 50%").split(" ");
    const startPosX = parseFloat(pos[0]) || 50;
    const startPosY = parseFloat(pos[1]) || 50;
    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      const newX = Math.max(0, Math.min(100, startPosX - (dx / 2)));
      const newY = Math.max(0, Math.min(100, startPosY - (dy / 2)));
      const newPos = `${Math.round(newX)}% ${Math.round(newY)}%`;
      img.style.objectPosition = newPos;
      frame.dataset.currentPos = newPos;
    };
    const handleUp = () => { /* removeEventListener ×2, then onUpdateHomePeekPosition */ };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }}>
  <img src={currentPhoto.url} className="admin-pan-img"
       style={{ objectPosition: currentPosition || "50% 50%" }} draggable={false} />
  <div className="admin-pan-crosshair" />
</div>
<p className="admin-props-hint">Drag the image to adjust which part shows in the card</p>
```

**Three defects to record in `00-FINDINGS.md` under G-1**, each visible above:
`onMouseDown` only (no pointer/touch events), no `tabIndex`/`onKeyDown` (keyboard cannot
reach it at all), and `document`-level listeners with no cleanup on unmount.

**The 3:2 frame CSS** (`legacy:src/styles/admin.css:1777-1797`) — D-23's "real 3:2 frame"
already exists:

```css
.admin-pan-frame {
  position: relative; width: 100%; aspect-ratio: 3 / 2;
  overflow: hidden; border-radius: 8px; border: 1px solid var(--border);
  cursor: grab; user-select: none;
}
.admin-pan-frame:active { cursor: grabbing; }
.admin-pan-img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
```

**Real data to sketch against:** `data/home_config.json` — `peekIds` has 6 entries,
`peekPositions` has exactly one, `50% 25%`. That single value is D-23's whole argument
against a preset grid; put it in the sketch.

---

### `src/pages/admin/resume.astro` + `src/components/RichTextBullets.tsx`

**Analog:** `legacy:PropertiesPanel.tsx:421-668` (role / skillGroup / education branches),
`:893-937` (resume PDF)
**Match:** exact for the field catalog.

Recovered field labels, verbatim (`00-RESEARCH.md:839-844`): Company, Role, Period, Location,
Icon, URL, Bullets, Skill Group/Skills, School, Degree, CGPA, Leadership, Resume PDF /
Upload New Resume, Replace with, Actions.

**The type drift to reconcile** (`legacy:src/types.ts` header comment): the admin splits
dates into `startMonth/startYear/endMonth/endYear/isPresent` while `data/resume.json` stores
a single `period` string. `00-ADMIN-IA.md` must pick one and say so — this is a defined port
task, not a discovery.

**`RichText`'s actual prop surface** (`dist/index.d.ts:3200-3230`) — read it before drawing
a bullet editor, because two of D-20/D-21's requirements are impossible against it:

```ts
interface RichTextProps {
	/** Controlled HTML string (default) or TipTap JSON Doc object when `outputFormat="json"`. */
	value: string | object;
	onChange: (value: string | object) => void;
	placeholder?: string;
	readOnly?: boolean;
	/** @default "html" */
	outputFormat?: "html" | "json";
	/** Replace the default toolbar with a custom ReactNode; pass `null` to suppress the toolbar entirely. */
	toolbar?: ReactNode;
	className?: string; ariaLabel?: string; style?: CSSProperties;
	inline?: boolean;
}
```

No `marks` / `extensions` prop (**G-3** — ⌘I/⌘U/⌘K stay live even with `toolbar={null}`),
and no `"segments"` in `outputFormat` (**G-4**). The sketch's job is to *show* the failure,
not route around it.

**`FileInput` for the PDF** (`dist/index.d.ts:2547-2600`) — `variant: "dropzone" | "button"`,
`accept`, `maxSizeBytes`, `onError(reason)`, plus a `ref` to the hidden input whose docstring
records the bug it fixed ("a second upload of the same file fired no `change` event").

---

### `src/pages/work.astro` / `work-recolour.astro` (page, static)

**Analog:** `/Users/akhilsaxena/Documents/Personal/Repositories/portfolio/design_handoff_portfolio/Work.dc.html`
**Match:** exact — this is the literal ivory source DSGN-03 resolves. **All 103 lines are
inline styles with hardcoded hex; there is not one class name in the file.** Every
substitution is therefore mechanical *and* individually reviewable.

**Header + the ochre period** (line 35) — the one accent that stays `--ochre-d` (44px display):

```html
<div style="font-family: 'Newsreader', serif; font-size: 52px; line-height: 1.08; letter-spacing: -0.01em;">Things I design<br>and build<span style="color: #B0722A;">.</span></div>
<div style="font-size: 15.5px; color: #8D8779; line-height: 1.6; max-width: 480px; margin-top: 18px;">Products shipped on my own — a component system and a few apps — alongside frontend engineering at Brevo.</div>
```

**Project card** (lines 41-48) — the card whose boundary inverts on dark (Ivory rule 3:
`#E6E0D2` → **`--wire` `#727268`**, not `--rule`):

```html
<div style="background: #FFFEFB; border: 1px solid #E6E0D2; border-radius: 14px; padding: 30px 32px; display: flex; flex-direction: column; gap: 16px; transition: border-color 0.25s ease;" style-hover="border-color: #B0722A;">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <span style="width: 44px; height: 44px; border-radius: 11px; background: #26231E; color: #F4F1EB; …font-size: 21px;">D</span>
    <span style="font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #8D8779;">55 COMPONENTS</span>
  </div>
  <span style="font-weight: 700; font-size: 21px;">Design System</span>
  <span style="font-size: 14.5px; color: #8D8779; line-height: 1.6;">A complete component library — tokens, primitives and patterns — designed and built end to end. <span style="color: #C4BDAD;">[expand with your details]</span></span>
</div>
```

Three defects live in that one block: **`55 COMPONENTS` is wrong** (README says 80 —
UI-SPEC:1062), the `#C4BDAD` placeholder markers are **deleted not recoloured** (DSGN-06
supplies real copy), and the hued card at line 51 uses `background: #B0722A; color: #FFF`
— **3.97:1, fails** (Ivory rule 2 → `#161616` ink).

**Brevo band** (lines 77-91) — the `+15% CONVERSION` metrics that become `--ochre-d-strong`,
and the `letter-spacing: 0.18em` eyebrow that becomes `--ls-wide` 0.1em with the delta recorded:

```html
<div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: #8D8779; margin-bottom: 8px;">ALSO — ENGINEERING AT BREVO</div>
…
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 24px; padding: 18px 0; border-bottom: 1px solid #E6E0D2;">
  <span style="font-family: 'Newsreader', serif; font-size: 21px;">Checkout redesign for 2.5M+ users</span>
  <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #B0722A;">+15% CONVERSION</span>
</div>
```

D-44 promotes this from an "ALSO —" tail to the **first** band; Ivory rule 8 caps it at 1080px.

**Cross-link** (line 97) — 22px→16px italic serif, the ambiguous-case ruling in Rule C-6:

```html
<a href="Photos.dc.html" style="font-family: 'Newsreader', serif; font-style: italic; font-size: 16px; color: #B0722A;">see the photographs →</a>
```

**Structural analog for the DS-composed card:** `legacy:src/components/ProjectCard.tsx` (55
lines) is the closest existing React rendering of this same card; read it for prop shape, but
the *visual* authority is the handoff above.

---

### `src/pages/photos.astro` (page, static)

**Analogs (three, all needed):**
`design_handoff_portfolio/Photos.dc.html` (visual authority) ·
`legacy:src/components/MasonryGrid.tsx` (the LQIP + sizes pattern) ·
`legacy:src/styles/photography.css:88-110` (the column mechanics)

**Handoff masonry** (`Photos.dc.html:47-55`) — 3 columns, 16px gap, 10px radius, 0.6s scale hover:

```html
<div style="column-count: 3; column-gap: 16px;">
  <div style="break-inside: avoid; margin-bottom: 16px; border-radius: 10px; overflow: hidden;">
    <img src="https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev/photos/architecture/hawamahaldaytime-md.webp" alt="Hawa Mahal" style="width: 100%; display: block; transition: transform 0.6s ease;" style-hover="transform: scale(1.03);">
  </div>
  …
</div>
<div style="text-align: center; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: #8D8779; margin-top: 16px;">SHOWING 8 OF 39</div>
```

Photos load straight from `pub-2d90aedeebcf4142afe524930c3b6471.r2.dev` — the playground has
an empty `public/`, so the sketch uses these live URLs (`00-RESEARCH.md:1044`).

**Filter pills** (`Photos.dc.html:36-42`) — the active pill that **flips** on dark (Ivory rule 6):

```html
<span style="border: 1px solid #26231E; background: #26231E; color: #F4F1EB; border-radius: 999px; padding: 7px 15px;">ALL · 39</span>
<span style="border: 1px solid #DDD6C8; color: #8D8779; border-radius: 999px; padding: 7px 15px;">ARCHITECTURE</span>
```

Render these as **`Chip` / `Link` anchors, never `SegmentedControl`** (G-9 — it is a WAI-ARIA
radiogroup with no anchor semantics, and it uses hooks, so it would force hydration).

**LQIP + responsive-source pattern to preserve** (`legacy:MasonryGrid.tsx:37-48`):

```tsx
<Image
  src={index < 8 ? photo.urls.medium : (photo.urls.small || photo.urls.medium)}
  width={w} height={h}
  sizes="(max-width: 480px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
  alt={photo.title}
  loading={index < 4 ? "eager" : "lazy"} priority={index < 4}
  className="masonry-img"
  style={{ width: "100%", height: "100%", objectFit: "cover",
           backgroundImage: `url(${photo.urls.thumb})`, backgroundSize: "cover" }}
  onLoad={() => handleLoad(photo.id)}
/>
```

`photo.urls.thumb` is the base64 LQIP. **Ivory rule 5: that placeholder must sit on the
charcoal page colour, not white** — a white-backed blur-up flashes hard on `#161616`.
`aspectRatio: ${w} / ${h}` from `photo.dimensions` is already in the data for all 39 photos.

**Column mechanics** (`legacy:src/styles/photography.css:88-110`):

```css
.masonry-grid { columns: 4; column-gap: 1rem; }
.masonry-grid[data-columns="3"] { columns: 3; }
.masonry-item {
  display: block; width: 100%; margin-bottom: 1rem; break-inside: avoid;
  border: none; padding: 0; background: none; cursor: pointer;
  position: relative; border-radius: 8px; overflow: hidden;
}
```

This stays **app layout CSS** — G-10, explicitly accepted (QUAL-03 permits layout CSS).

---

### `src/pages/admin/index.astro` — the pending dashboard (event-driven)

**Analog:** `legacy:src/components/admin/DeployButton.tsx:54-73`
**Match:** role-match — same job (decide what is pending, then commit it), wrong mechanism.

The legacy diff is `JSON.stringify(current) !== JSON.stringify(initial)` per file, and it
posts `baseSha: "latest"`, which bypasses `/api/deploy`'s own conflict check. **Both defects
are the reason D-10 puts the baseline SHA in a D1 draft row.** The dashboard sketch replaces
a modal-only pending list with a permanent screen; cite the legacy behaviour in
`00-ADMIN-IA.md` as the thing being fixed, and do not reproduce its UI.

**DS composition** (`00-UI-SPEC.md:590`): `AppShell` · `Card` per entity group · `Badge`
(draft/ready) · `RelativeTime` · `Button` "Publish changes" · `EmptyState` · `ProgressBar`.

---

### `00-FINDINGS.md` (doc)

**Analog:** `00-UI-SPEC.md:641-658` — the 16-row gap register is already written.
**Match:** exact. This is a transcription-plus-measurement task, not an authoring task.

Rows already seeded with component, disposition, gap, proposed upstream fix and `tiers`:
AAA-1, G-1 … G-15. **The schema is `tiers: string[]`** (D-04 as revised), values
`blocks-Phase-5` · `should-fix-in-Phase-1` · `backlog` · `blocks-Phase-7` ·
`blocks-Phase-06.1`. G-1 and G-7 carry two tiers each — that pairing is the reason the
vocabulary was widened, so preserve it.

**Corrections the register already encodes, which the planner must not re-litigate:**
`StatusPill.stage` is `"wishlist" | "applied" | "screening" | "interviewing" | "offer" |
"closed"` (`dist/index.d.ts:1020`) — a closed job-domain union, so **G-5** stands and
CONTEXT.md's §Reusable Assets claim that it covers D-15 is wrong. `FormErrorSummaryProps`
is `{ errors: string[]; title?: string; className?: string }` (`dist/index.d.ts:3350-3354`)
— no `href`, so **G-6** stands.

---

### `00-COPY/*.md` (docs)

**Analog for the `[NEEDS AKHIL]` convention:** `00-RESEARCH.md:1374-1389` — the finished
example, with the HTML comment recording what was searched.
**Analog for the register to write in:** `../design-system/CHANGELOG.md` and
`../cairn/.planning/REMOVED.md`, both of which already name the option not taken and its cost:

> *"`--ink-4` … was historically equal to `--ink-3` in light but a much dimmer grey in dark,
> which silently dropped ~28 text usages to 2.4:1 in dark mode. Aliasing keeps both modes
> honest."*

**Current one-liners to rewrite** live in `data/resume.json`. Per D-43 and confirmed against
the repos: hued and TimeShift already have the right shape; **Momentum** and the
**Design System** are plain feature lists. Budgets from UI-SPEC §Copywriting: one-liner
**60-110 chars / 2 lines**, card description **120-200 chars / 3 lines**.

**Do not draft the design-system case study from `../design-system/.planning/PROJECT.md`** —
it is titled *"JobDash Design System"*, claims 53 sections against the README's 80, and
documents `body.dark` when `src/tokens.css:291-292` ships `:root.dark, .dark`.

---

## Shared Patterns

### 1. Flat token blocks with a column-0 closing brace
**Source:** `../design-system/src/tokens.css:26-285` and `:291-386`
**Apply to:** `theme-charcoal.css`, `density-compact.css`, and every `check-*.mjs` that parses them

Both `block()` implementations (the DS test and RESEARCH's script) find the block end with
`css.indexOf("\n}", open)`. A nested rule or an indented closing brace silently truncates the
token set and the exhaustiveness check passes for the wrong reason.

### 2. Test-as-regression-narrative comments
**Source:** `../design-system/src/tokens.test.ts` — every `it()` opens with the bug it caught
**Apply to:** all eight measurement scripts, and `00-FINDINGS.md`

```ts
	it("declares a light value for every token the dark theme overrides", () => {
		// A token that exists only under .dark silently resolves to nothing in
		// light mode. --rule-strong shipped that way.
```

```ts
		// The regression this guards: a wave of components was authored against
		// --font-body / --font-display / --font-mono while the token layer only
		// defined --font / --display / --mono, so 28 font-family declarations
		// were dropped by the browser as invalid at computed-value time.
```

This convention is why the DS's own tests read as documentation. Phase 0's scripts hand
themselves to Phase 1 and Phase 5, so the same rule applies: each failure message must name
the failure mode, not just the assertion. RESEARCH's exhaustiveness script already does:

```js
  console.error(
    "FAIL: these charcoal tokens are declared in light but not restated in dark.\n" +
    "Each ties with :root.dark at (0,2,0), so its dark value depends on stylesheet order:\n  " +
    missing.join("\n  "));
```

### 3. Fail loud, never degrade
**Source:** `../design-system/scripts/postbuild.mjs:29-33, 58-64`
**Apply to:** every measurement script, and the D-33 manifest

```js
// A build that stamps nothing means the directive silently stopped being
// applied — the exact regression this script exists to prevent.
if (stamped === 0) {
	throw new Error('postbuild: stamped 0 files with "use client" — expected at least the 3 entrypoints');
}
```

Same reasoning as D-29's font split ("fails *loudly* at integration if the font import is
omitted") and D-33's stated failure mode ("a visibly unstyled component"). No script should
`console.warn` and exit 0.

### 4. Real data, never lorem
**Source:** `data/resume.json` · `data/portfolio_images.json` (39 photos) ·
`data/home_config.json` · `data/site_config.json`
**Apply to:** every sketch and every fixture

The legacy app imported these directly (`legacy:src/app/portfolio/page.tsx:11-12`):

```tsx
import portfolioData from "../../../data/portfolio_images.json";
import siteConfig from "../../../data/site_config.json";
```

The playground copies or symlinks them into `src/data/` (`00-RESEARCH.md:1050`). D-40's whole
argument — that build phases must work against real text lengths — collapses if a fixture is
invented. Known sharp edges already in the data: `product-peppers` has no EXIF, one
`peekPosition` (`50% 25%`), lowercase categories vs `site_config` Title-case keys.

### 5. Extensionless per-component CSS specifiers
**Source:** `../design-system/package.json` `exports["./css/*"]` · measured at `00-RESEARCH.md:667-685`
**Apply to:** `manifest.css`, and G-12 in `00-FINDINGS.md`

```
import "@akhil-saxena/design-system/css/base.css";  ❌  -> dist/css/base.css.css
import "@akhil-saxena/design-system/css/base";      ✅  -> dist/css/base.css
```

`import.meta.resolve()` reports the broken form as resolvable — it substitutes the pattern
without stat-ing the target — so a Node-level check passes while `astro build` fails.

### 6. Seven dead admin components — do not draw a wireframe from any of them
**Source:** verified by `git grep` across `legacy/nextjs-portfolio` this session

`PhotoGrid.tsx`, `PhotoEditModal.tsx`, `PreviewPanel.tsx`, `ExperienceEditor.tsx`,
`EducationEditor.tsx`, `ProjectEditor.tsx`, `SkillsEditor.tsx` — **zero import sites**
outside their own definitions. (`PreviewPanel` appears once more, in a comment at
`src/app/admin/page.tsx:158`.) They are a superseded grid+modal+split-preview design that the
inline WYSIWYG replaced.

The **five wired** components are the only admin analogs: `PropertiesPanel.tsx` (937 lines,
the field catalog), `DraggableMasonry.tsx`, `PhotoUploadZone.tsx`, `AdminTopBar.tsx`,
`DeployButton.tsx`.

Note the irony worth recording: the dead `PreviewPanel` was a **split** preview; D-07 chose a
**full-width toggle** instead. That is a decision the legacy code already tried and dropped.

### 7. Hydration budget — 3 islands, everything else static
**Source:** `00-UI-SPEC.md:665-679`, derived from the measured DS-09 failure
**Apply to:** every `.astro` page in the playground

Every hydrated island currently costs ~177 KB gzip / 99 modules. `client:*` is permitted
**only** on `FocalPointSketch`, `SortableReorder` and `RichTextBullets`. Dialogs, sheets,
error summaries, the conflict diff and skeletons are all sketched **open and static** via
`?state=`. A sketch that hydrates makes MEASURE-1 unreadable.

Hook-free components (render correctly as static HTML): `Chip`, `Text`, `Heading`, `Card`,
`Link`, `Divider`, `Eyebrow`, `Button`, `Badge`, `Timeline`, `StatCard`, `AppBar`, `Footer`,
`EmptyState`, `StatusPill`, `ProgressBar`.
Hook-using: `SegmentedControl`, `Lightbox`, `DataGrid`, `Sheet`, `Sortable`, `RichText`,
`AppShell`, `ConfirmDialog`, `Wizard`, `InlineEdit`, `FileInput`, `Modal`.

---

## No Analog Found

The planner should use RESEARCH.md and UI-SPEC.md patterns for these rather than searching
the codebase.

| File | Role | Data Flow | Reason — and the nearest structural cousin |
|------|------|-----------|--------------------------------------------|
| `src/pages/case/long.astro` · `case/short.astro` | page / template | static | **No case-study page has ever existed in this repo.** The handoff (`design_handoff_portfolio/`) contains no design for it — that void is explicitly DSGN-02's reason to exist. Nearest cousins: `Resume.dc.html` (the only long-scroll editorial page in the handoff, for measure and heading rhythm) and `../design-system/CHANGELOG.md` (the register the *prose* should be written in). Structure per RESEARCH §"What done well looks like": problem → decisions **naming the option not taken** → outcome. |
| `src/styles/density-compact.css` | config | transform | **No density axis exists anywhere.** Measured: 0% of 95 height declarations, 13.5% of padding, 10.8% of gaps in `../design-system/src/primitives.css` use a spacing token, and `Button` sets `padding: "7px 14px"` as an inline style object unreachable by CSS at any specificity. Nearest cousin is only the *shape* of `tokens.css`'s dark-override block. Target numbers are UI-SPEC §Density's table (30px controls / 32px rows / 208px sidebar). Every override that cannot be expressed as a `--space-*` change is one line of evidence for **G-2**. |
| `.playground/astro.config.mjs` | config | — | **Astro appears nowhere in either repo.** The legacy app is Next.js 15 + `@cloudflare/next-on-pages`; the DS is tsup + Storybook. Use RESEARCH §Standard Stack verbatim — `integrations: [react()]` and nothing else. The **absence** of `@astrojs/cloudflare` is D-02's enforcement mechanism, so an "analog" from the legacy Next config would actively harm the fence. |
| `src/pages/index.astro` (contact sheet) | page / index | transform | No index-of-artefacts page exists. Nearest cousin: `../design-system/src/OverviewPage.tsx` + `src/Overview.mdx` (a component catalog with `overview-links.test.ts` asserting completeness — the same "no blank cell" idea). The four-part structure and the `import.meta.glob` + `STATES` contract are specified in full at `00-UI-SPEC.md:732-789`. |

**Partial-analog warnings** (a match exists but does not carry the whole job):

- `admin/projects/[id].astro` — the card half maps cleanly to `PropertiesPanel.tsx:499-577`;
  the **case-study authoring half has no analog at all**, because D-24 invents the pairing.
- `admin/site.astro` — `data/site_config.json` is 176 bytes with one key (`categoryColumns`).
  D-25's canonical category records (id / label / columns) plus the rename-and-reassign path
  are new; only the `NumberStepper` column-count field has a precedent.
- `check-copy-length.mjs` — no prose-linting precedent in either repo. `tokens.test.ts:28-36`
  (`walk()`) is the file-traversal analog; the ≥ 40-words rule is new.
- `.playground/package.json` — the legacy `package.json` and the DS's both exist but neither
  is an Astro app. Copy only the conventions worth keeping: a committed lockfile, and the DS's
  `"engines": { "node": ">=20" }` habit (Astro 7 needs **>= 22.12.0**).

---

## Metadata

**Analog search scope:**
- `legacy/nextjs-portfolio` branch of this repo (86 files; 14 extracted and read)
- `/Users/akhilsaxena/Documents/Personal/Repositories/design-system` — `src/tokens.css`,
  `src/tokens.test.ts`, `src/packaging.test.ts`, `src/layout/AppShell/{index.tsx,AppShell.stories.tsx}`,
  `scripts/postbuild.mjs`, `package.json`, `dist/index.d.ts`, `dist/css/` (74 sheets)
- `design_handoff_portfolio/` — `Work.dc.html`, `Photos.dc.html` (read in full)
- `data/` — 4 committed JSON files
- `.planning/phases/00-design-ideation/` — CONTEXT, RESEARCH, UI-SPEC, VALIDATION

**Files scanned:** ~120 · **Files read in full or in targeted ranges:** 24

**Verified this session (not taken on trust):**
- The working tree has **no `src/`** and **no root `package.json`** — CLAUDE.md's architecture
  section describes the branch, not the disk.
- All seven "dead" admin components have **zero import sites** on the legacy branch.
- `StatusPillStage` is a closed six-literal union (`dist/index.d.ts:1020`).
- `FormErrorSummaryProps` is `{ errors: string[] }` — no `href` (`dist/index.d.ts:3350`).
- `AppShellProps` has exactly four slots — no `banner` (`src/layout/AppShell/index.tsx:10-32`).
- `RichTextProps` has no `marks` prop and `outputFormat: "html" | "json"` only
  (`dist/index.d.ts:3200`).
- `../design-system` `exports` has no `themes` or `fonts` entry today (`package.json:20-40`).

**Pattern extraction date:** 2026-08-17
