# akhilsaxena.com

Personal portfolio and photography site. Currently being rebuilt.

## Status

`main` was intentionally emptied of the previous Next.js application on 2026-08-16.
The new site is an **Astro + React islands** app built on
[`@akhil-saxena/design-system`](https://www.npmjs.com/package/@akhil-saxena/design-system).

The previous application is preserved in full on the **`legacy/nextjs-portfolio`**
branch and remains restorable from git history.

## What survived the purge

| Path | Why |
|------|-----|
| `data/*.json` | Site content — 39 photos with EXIF, résumé, home and site config |
| `public/resume.pdf` | Hand-maintained downloadable résumé |
| `public/assets/*.png` | Project icons |
| `public/favicon.svg` | Favicon |
| `design_handoff_portfolio/` | Design reference — HTML prototypes and spec |
| `.planning/` | Planning artifacts, including a map of the legacy codebase |

## Planning

This project is managed with [GSD](https://github.com/glamp/get-shit-done).
Start at `.planning/ROADMAP.md`; `.planning/codebase/` documents the legacy app
that the admin CMS and content pipeline are being ported from.
