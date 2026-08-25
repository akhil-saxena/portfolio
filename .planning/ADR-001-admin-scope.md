# ADR-001 · The admin edits photos and the Home landing, not prose

**Date:** 2026-08-19 · **Status:** SUPERSEDED by [ADR-002](ADR-002-admin-scope-revised.md) · **Decided by:** Akhil

> **Superseded the same day, before anything was built.** Reviewing the real screens at 00-17 showed
> this decision applied the right argument at the wrong granularity: *a form is worse than an editor
> for text* holds for long-form prose, not for short structured records. ADR-002 moves the line from
> "which entities" to "which kind of content" — five routes, with only case-study authoring and site
> config leaving. **Its storage decisions survive** (bold-only markdown bullets, the referential
> integrity rule, the PDF drift check); its route list and the 01-17 skip do not.
**Supersedes:** D-05 (route-per-entity, six routes), D-20, D-21, D-24, D-26 in part
**Reached at:** Phase 1 plan 16 of 21, before Phase 3 drafts schemas and before Phase 7 is planned

## Decision

The admin CMS is **three routes**:

| Route | Owns | Why it must be a screen |
|---|---|---|
| `/admin` | the pending set | Publish, deploy status, photos mid-pipeline |
| `/admin/photos` | `portfolio_images.json` | Upload → pipeline → reorder in the live layout; metadata |
| `/admin/home` | `home_config.json` | Six peek photos and a **focal point per photo** — inherently visual |

Everything else is JSON, edited in an editor, reviewed in git:
`resume.json` · `projects.json` · case-study prose · `site_config.json` · `public/resume.pdf`

## Why

**The operator is the author of the repository.** The stated value of the admin was editing
"without touching a terminal." For a developer with the repo checked out, a form is *worse* than an
editor for text: it loses git history, review and diffing, and adds a deploy round trip. The
advantage it buys — no terminal — is one this operator does not need.

**Photos are the opposite case.** Upload → R2 → GitHub Actions → committed JSON is not a
hand-editable pipeline, and a crop focal point cannot be chosen by typing `"50% 25%"` into JSON and
redeploying to see whether the horizon landed. `home_config.json` records this in the data itself:
**`peekPositions` has one of six entries set.** The other five run on defaults because setting them
by hand is not worth the round trip. That is the gap the admin exists to close.

**The component this retires was already known-broken.** Browser prose editing requires `RichText`,
recorded as **E10 / G-3 / G-4 / F-14-1 / F-14-2**: `toolbar={null}` does not suppress the toolbar,
marks cannot be restricted (⌘I / ⌘U / ⌘K stay live), there is no lossless output shape, and it
downloads a **six-language syntax highlighter (12,718 B gzip) to edit a prose bullet.** The IA's own
assessment of a bold-only serializer over it: *"would silently drop an italic run on save — data
loss, not a styling miss."*

## What this changes

**Skipped:** plan **01-17** in its entirety — E10, G-3, G-4, F-14-1, F-14-2. `RichText` has no
consumer left in this project. The findings stay on the register as design-system truths; they are no
longer this project's to fix.

**Retired from the admin IA:** four routes (`/admin/resume`, `/admin/projects`,
`/admin/projects/[id]`, `/admin/site`), five `Selection` variants (`role`, `skillGroup`,
`education`, `project`, `resume`), the `/api/upload-resume` route, and ~14 field-catalog rows.
Artefacts fall from 35 to roughly 27.

**Unchanged, and this is the honest part:** every treatment and every overlay. The hard surfaces are
per-*system*, not per-*entity* — publish and discard semantics, dirty state in three places (D-13),
truthful deploy status, `TypeToConfirm` on global discard, re-auth, and **D-16's conflict resolution,
which the IA calls the largest single admin surface.** The conflict surface thins from six files to
three; it does not disappear. **This decision removes screens, not difficulty.**

## Consequent decisions

**1. Résumé bullets are stored as bold-only inline markdown, not segment arrays.** D-20 chose
`[{text}, {text, emphasis}]` so that no HTML string exists anywhere and the legacy stored-XSS class
(`Timeline.tsx:48` plus three admin components using `dangerouslySetInnerHTML` with no sanitiser) is
*designed out* rather than filtered. **That property is preserved** — markdown with only `**` is not
HTML and cannot carry an injection — while the stored form stays hand-editable:

```
"Reduced **p95 latency** by 40%"
```

Parsed to segments at build time. The corpus supports it: **all 18 bullets across three experience
entries contain only `<strong>`** — no anchors, italics or spans. D-21 (RichText bold-only) is void.

**2. `site_config.json` needs a referential-integrity rule in Phase 3, and it is now load-bearing.**
`/admin/site` was the guard against renaming a category `id` and silently orphaning photos. With the
screen gone, the schema module must assert **every `photo.category` exists in `site_config`'s ids**,
so a bad hand-edit fails the build instead of shipping quietly. D-25's record shape
(`{id, label, columns}`) is still correct and still kills the Title-case/lowercase drift between
`portfolio_images.json` (`architecture`) and `site_config.json` (`Architecture`) — a transform that
does not exist cannot disagree with the data.

**3. The résumé PDF drift guard becomes a CI check.** D-26 mitigated drift with an
`AlertBanner tone="warning"` in the admin. Replace it: **fail the build when a commit changes
`resume.json` without touching `public/resume.pdf`.** Stronger than a banner that gets learned and
ignored, and it survives the screen's removal.

**4. `ADMIN-01` is reworded rather than left unmet.** See `REQUIREMENTS.md`.

## What was given up

Fixing a résumé typo from a phone. Examined and accepted: **recruiters read the PDF**, which is
hand-maintained in a design tool and was never editable from a phone under any scope. The admin would
only have let the web résumé be corrected while the PDF stayed wrong — which is drift, not a fix.

## Design-system gaps on what remains

| Gap | Status |
|---|---|
| G-3, G-4 (`RichText`) | **retired by this decision** |
| G-6 (`FormErrorSummary` anchors) | closed — 01-11 |
| G-8 (`AppShell` banner slot) | closed — 01-13 |
| G-13 (`Sortable` announces nothing) | closed — 01-15 |
| **G-1 (no crop picker)** | **open — 01-19 builds it. Load-bearing: it is the reason `/admin/home` exists.** |
| G-5 (`StatusPill` job-domain-locked) | open — 01-18 |
| G-7 (conflict diff, zero coverage) | open — thinner, not gone |

`F-15-5` (D-45's three statuses indistinguishable by fill) was initially assessed as dropping with
`/admin/projects`. **That was wrong:** the badges render on the **public** Work page
(`00-PUBLIC-DESIGN-NOTES.md:1630`, `:1475`). It stays in 01-18's scope, and its primary mode is
monochrome *dark*, not the light the finding's text names.
