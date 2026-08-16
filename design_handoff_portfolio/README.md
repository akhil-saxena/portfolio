# Handoff: Akhil Saxena — Portfolio Website

## Overview
A personal portfolio for Akhil Saxena — frontend engineer and photographer. Three pages: a two-act homepage (photography first viewport, dev work second), a Work page (own projects + Brevo engineering), and a Photos gallery page. The identity is calm and evergreen: dark charcoal canvas, Playfair Display serif voice, no gimmicks; a light theme is toggleable and persists.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to ship. The task is to **recreate these designs in the target codebase's environment** (the current live site is a static site deployed on Cloudflare Pages; Astro or plain HTML/CSS/JS are both good fits — pick whatever the repo already uses) following its established patterns. Do not copy the HTML verbatim.

## Fidelity
**High-fidelity** for layout, typography, spacing, color, and interaction behavior on the homepage; **high-fidelity structure with placeholder copy** on Work and Photos pages — project one-liners marked `[your one-liner]` and some résumé facts are placeholders the owner must replace. Photo URLs point at the owner's real Cloudflare R2 bucket and are final.

## Screens / Views

### 1. Home (`Akhil Saxena - Home.dc.html`)
Two full-height acts stacked vertically; the page scrolls.

**Top bar** (fixed-flow, not sticky): left — nav links `work`, `photographs` (13.5px DM Sans 500, muted #8F8B82, hover → #EAE7E0); right — theme toggle: 42px circle, 1px border #33332F, sun/moon glyph.

**Act 1 — identity + photo grid.** Fills the first viewport (`min-height: calc(100vh - 68px)`, content vertically centered):
- Name: Playfair Display 700, 60px, line-height 1, #EAE7E0, centered
- Subtitle: Playfair italic 20px, #8F8B82 — "Interfaces & Imagery"
- Tagline: Playfair 21px, #C9C5BC — "Building for the web. Photographing everything else."
- Photo grid: 3 columns × 2 rows, uniform `aspect-ratio: 3/2` crops (`object-fit: cover`), 14px gap, max-width 1080px, 8px radius. Last tile has an "ALL 39 →" badge (IBM Plex Mono 10px, white on rgba(22,22,22,0.65), 4px radius, bottom-right). Whole grid is one link → Photos page.
- Scroll cue: "↓ THE WORK" — IBM Plex Mono 10.5px, letter-spacing 0.2em, muted; animates: `@keyframes nudge` translateY 0→6px→0 with opacity 0.65→1→0.65, 2.2s ease-in-out infinite.

**Act 2 — the work.** Max-width 1080px, padding 72px 40px 24px:
- Heading row: "The work" (Playfair 700, 42px) + "ALL WORK →" link (Plex Mono 11px, muted)
- 2×2 grid of project entries (gap 40px 56px), each: 44px rounded-square icon (radius 11px, Playfair initial) + name (Playfair 24px) + one-liner (13.5px, #8F8B82, line-height 1.55). Whole grid links → Work page.
  - Design System — icon bg #EAE7E0 / text #161616 — "55 components — tokens, primitives and patterns, designed and built end to end."
  - hued — icon bg #B0722A, italic "h" — "A colour companion for everyday design work, on Android."
  - Momentum — icon bg #3E5A48 — "Habits and focus, quietly tracked."
  - TimeShift — icon bg #52585E — "A Chrome extension for working across time zones."
- Brevo strip below (44px top margin, 1px top border #262622): italic Playfair 17px #C9C5BC — "By day — engineering at Brevo: checkout for 2.5M+ users, a nav package across 18+ micro-frontends." + "RÉSUMÉ →" link.

**Footer**: centered row — GitHub · LinkedIn · Email · © 2026 Akhil Saxena (13px, muted). No rule above it.

### 2. Work (`Work.dc.html`)
Scrolling page, same nav (active link underlined 1.5px).
- Header: "Things I design / and build." Newsreader/Playfair ~52px, ochre period accent; sub-paragraph 15.5px muted, max-width 480px.
- Projects: 2×2 cards — bg #FFFEFB, 1px border #E6E0D2, radius 14px, padding 30px 32px; icon top-left, platform tag (Plex Mono 10.5px) top-right; name 21px/700; description 14.5px muted. Hover: border → accent.
- "ALSO — ENGINEERING AT BREVO" section: three hairline-separated rows — serif title (~21–23px) left, mono metric right in accent (`+15% CONVERSION`, `20% FASTER CYCLES`, `90% COVERAGE`).
- Footer: socials left, italic serif cross-link "see the photographs →" right.

> Note: `Work.dc.html` in this bundle is the ivory-theme iteration. If the final site keeps the dark home theme, port this page's structure onto the dark palette (tokens below) for consistency — the owner has approved the dark identity.

### 3. Photos (`Photos.dc.html`)
- Header: italic serif "Photographs" (~52px) + filter pills (Plex Mono 10.5px, 999px radius): active pill filled dark, others outlined.
- Gallery: CSS masonry via `column-count: 3; column-gap: 16px`, images natural aspect (no cropping), 16px bottom margin, 10px radius, hover scale 1.03 over 0.6s.
- "SHOWING 8 OF 39" counter — implement real pagination/lazy-load for all 39.
- Footer: socials + "← see the work".

## Interactions & Behavior
- **Theme toggle**: switches dark/light palettes (below), persists in `localStorage` key `asx-theme`, restores on load. Toggle glyph flips ☀/☾. Implement site-wide (prototype wires it on Home).
- **Photo hover**: `transform: scale(1.03–1.05)` over 0.6s ease, inside `overflow: hidden` rounded container.
- **Scroll cue**: nudge animation as specced; respect `prefers-reduced-motion` in production.
- **Navigation**: home Act-1 grid → /photos; Act-2 grid → /work; nav links likewise. No résumé button on home hero; résumé linked from Act-2 strip.
- Card hover on Work page: border-color transition 0.25s.

## State Management
- `theme: 'dark' | 'light'` — localStorage-persisted, default dark.
- Photos page: `activeFilter` (category) and photo list; 39 photos across 7 categories (architecture, wildlife, nature, abstract, street, etc. — confirm category names against the R2 bucket paths).

## Design Tokens
**Dark theme (primary):** bg #161616 · text-primary #EAE7E0 · text-secondary #C9C5BC · text-muted #8F8B82 · hairline #262622 · border #33332F · accent (ochre) #B0722A
**Light theme:** bg #F4F1EA · primary #1A1815 · secondary #44403A · muted #7A7568 · border #D5CFC2 · hairline #DFD9CC
**Ivory page theme (Work/Photos prototypes):** bg #F4F1EB · card #FFFEFB · card-border #E6E0D2 · muted #8D8779
**Project icon colors:** Design System #EAE7E0 (dark text) · hued #B0722A · Momentum #3E5A48 · TimeShift #52585E
**Type:** Playfair Display (400–700 + italics) for display/serif voice; DM Sans (400–700) for UI text; IBM Plex Mono (400–500) for labels/metadata. (Work/Photos prototypes use Newsreader for display — Playfair is the approved site voice; unify on Playfair.) Google Fonts, `display=swap`.
**Radii:** 8px photo tiles · 10-11px icons/cards (home) · 14px cards (work) · 999px pills. **Gaps:** 14px photo grid, 12-16px galleries, 40/56px project grid. **Page max-widths:** 1080px (home), 1280px (work/photos).

## Assets
All photographs load from the owner's Cloudflare R2 bucket:
`https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev/photos/<category>/<name>-sm|md.webp`
(e.g. `architecture/hawamahaldaytime-md.webp`, `wildlife/kingfisher-sm.webp`). Use `-sm` for tiles, `-md` for larger frames; keep `loading="lazy"` on below-the-fold images. No other image assets; project icons are typographic (serif initial on colored rounded square). Social icons: use simple line icons or text labels.

## Files
- `Akhil Saxena - Home.dc.html` — homepage (final approved structure, dark theme, theme-toggle JS in embedded script)
- `Work.dc.html` — work page (ivory iteration; port to dark)
- `Photos.dc.html` — gallery page (ivory iteration; port to dark)
- `Resume.dc.html` — résumé page scaffold (dark; contains `[placeholder]` facts to fill)

## Open items for the owner
1. Replace `[your one-liner]` project descriptions and résumé placeholders with real copy.
2. Confirm the 7 photo category names + counts against the R2 bucket.
3. Decide whether Work/Photos adopt the dark theme (recommended) or stay ivory.
