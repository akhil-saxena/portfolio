# ADR-002 · The admin is five routes; case-study authoring and site config leave

**Date:** 2026-08-22 · **Status:** ACCEPTED · **Decided by:** Akhil
**Supersedes:** [ADR-001](ADR-001-admin-scope.md) — same day, before either was built
**Reached at:** 00-17's pass 2, reviewing the seven sketched admin screens against the real thing

## Decision

| Route | Owns | Editing |
|---|---|---|
| `/admin` | the pending set | publish, deploy status, photos mid-pipeline |
| `/admin/photos` | `portfolio_images.json` | upload, metadata, reorder in the live layout, focal point |
| `/admin/home` | `home_config.json` | identity block, six peek photos, crops |
| `/admin/resume` | `resume.json` | structured content **and** the hand-maintained PDF |
| `/admin/projects` | `projects.json` | the list, **edited inline** — no detail screen |

**Removed:** `/admin/projects/[id]` (case-study authoring) and `/admin/site` (category config).

## What changed from ADR-001, and why this line is better

ADR-001 cut résumé and projects to three routes on the argument that *a form is worse than an editor
for text*. Reviewing the actual screens showed that argument was applied at the wrong granularity.
It holds for **long-form prose** — a case study is an essay, and an essay wants an editor, git
history and review. It does **not** hold for **short structured fields**: a résumé bullet, a company
name, a tech chip, a status badge. Those are records, not documents, and a form handles a record
better than a text editor handles JSON.

So the line moves from *"which entities"* to *"which kind of content"*:

- **Records → the browser.** Résumé entries, skill groups, education, project cards, photo metadata,
  home config.
- **Essays → an editor.** Case-study bodies. This is the only content the admin no longer touches.

**`/admin/site` goes for a different reason.** It was eight rows of `{id, label, columns}` touched
maybe twice a year, and its real value was never the editing — it was the *guard* against renaming a
category `id` and silently orphaning photos. A guard does not need a screen.

## Consequences

**1. Plan 01-17 is un-skipped, and this was accepted knowingly.** Résumé bullets are edited in a
browser again, and the choice was explicitly **WYSIWYG over a plain markdown field**. So **G-3** and
**G-4** are live again:

- **G-3** — `RichText` cannot restrict its marks: ⌘I / ⌘U / ⌘K stay live regardless of the toolbar.
- **G-4** — no lossless output shape. The IA's verdict on a bold-only serializer over today's
  component: *"would silently drop an italic run on save — data loss, not a styling miss."*

That data-loss path is the one that matters. 01-17 must make the editor round-trip the stored shape
losslessly; the toolbar and the 12,718 B gzip six-language highlighter are real costs but secondary.

**2. The stored bullet shape stays bold-only inline markdown.** ADR-001's storage decision survives
its editing decision. `Reduced **p95 latency** by 40%` — no HTML string can be expressed, so the
legacy stored-XSS class (`Timeline.tsx:48` plus three admin components using
`dangerouslySetInnerHTML` with no sanitiser) stays *designed out* rather than filtered. The corpus
supports it: all 18 bullets across three experience entries contain only `<strong>`. **WYSIWYG is
the editing surface; markdown is the storage.** Making those two agree losslessly is 01-17's actual
job.

**3. Project card fields are edited inline on the list.** With no detail screen, a read-only list
would be a screen showing five rows you cannot change. `InlineEdit` already exists in the design
system — it was `/admin/site`'s planned mechanism, so the component survives its original consumer.

**4. Phase 3 must assert referential integrity for `site_config`, and it is now load-bearing.**
Unchanged from ADR-001 and the reason `/admin/site` can go at all: the schema module must assert
**every `photo.category` exists in `site_config`'s ids**, so a bad hand-edit fails the build rather
than shipping quietly. D-25's record shape (`{id, label, columns}`) stays correct — it kills the
Title-case/lowercase drift between `portfolio_images.json` (`architecture`) and `site_config.json`
(`Architecture`), and a transform that does not exist cannot disagree with the data.

**5. D-26's PDF drift warning returns, and the CI check is kept anyway.** `/admin/resume` is back, so
the `AlertBanner tone="warning"` on drift is buildable again. Keep the CI check regardless — fail the
build when `resume.json` changes without `public/resume.pdf` — because it also catches drift
introduced *outside* the admin, which the banner cannot.

**6. `ADMIN-01` needs rewording again.** ADR-001 narrowed it to "photo metadata and home config"; it
should now read résumé, home config, project cards and photo metadata — with **site config
explicitly excluded** and pointed at the schema rule instead.

## Screens and artefacts

Seven sketched screens → **five**. Of the 35 admin artefacts, `S-project-detail`, `S-site` and
`R-case-study-authoring`'s phone-only framing are affected — though **`R-case-study-authoring` is now
*more* justified, not less**: it was a refusal to author long prose on a phone, and long-form
authoring has now left the admin entirely, making it a permanent design position rather than a
viewport limitation.

**Unchanged, as in ADR-001, and worth restating because it is the honest part:** every treatment and
every overlay survives. The hard surfaces are per-*system*, not per-*entity* — publish and discard
semantics, dirty state in three places (D-13), truthful deploy status, `TypeToConfirm` on global
discard, re-auth, and D-16's conflict resolution. **This decision moves a boundary; it does not
remove difficulty.**

D-16's conflict surface now spans four files rather than three or six — and 00-17's pass 5 verified
structurally that per-file resolution is already expressed in the sketch, with no all-or-nothing
path.
</content>
</invoke>
