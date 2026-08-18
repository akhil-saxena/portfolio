# Deferred items — Phase 0 design ideation

Out-of-scope discoveries, logged rather than fixed. Each names the plan that found it, the
plan that owns the file, and why it was not fixed in place.

---

## D-15-1 · The dashboard's `.adm-group-link` is 23px at every coarse-pointer class

**Found by:** plan 15, in the Chromium audit (`.playground/audit15.mjs`)
**Owns the file:** plan 12 — `.playground/src/pages/admin/[...state].astro`
**Status:** not fixed. Out of scope: the offending class is in another plan's route file and
is not reached by anything plan 15 changed.

Measured on the built `dist/`, at 344, 390, 673, 768 and 1024, all coarse pointer:

```
/admin/    3 x  <a class="adm-group-link">   23px    floor 44px
```

Zero offenders at 1440 fine pointer, where the floor does not apply. It is the same shape as
the two failures plan 14 measured — a link that inherits its line box because it sits inside a
row of text — and the fix is the same: give it its own row, or add it to the route's existing
`@media (pointer: coarse)` block. `.adm-group-link` is plan 12's own class, so the rule is
reachable from that file's scoped style block with no design-system change.

**Why it matters beyond three links.** `00-RESPONSIVE-CONTRACT.md` is binding and its 44px
floor applies to five of the six device classes. The dashboard is `S-dashboard` and
`E-dashboard`, the screen the admin is in most of the time, and it is also the screen plan 17
screenshots first. A floor failure there is the one a reviewer sees first.

**Note on why it was not caught earlier.** It is not a regression — nothing in plan 15 touched
the dashboard. The three links have measured 23px since plan 12; plan 15 is simply the first
pass to walk every focusable box on that route in a browser rather than on its own screens.

**Suggested owner:** plan 16, as a one-line correction while it reviews the dashboard, or
Phase 7 when the dashboard is built for real.

**Plan 16 did not take it.** The suggestion above is a suggestion, and the SCOPE BOUNDARY rule
is the reason it was declined: nothing plan 16 wrote reaches `.adm-group-link`, and reaching
into another plan's route file to fix a floor it did not break is how a "one-line correction"
becomes an unreviewed edit in a file somebody else is accountable for. Still open. Still 23px.

### RESOLVED by plan 00-24

**Status: closed.** Plan 00-24 is a gap-closure plan chartered to close this item, so it holds
the explicit permission plan 16 lacked — that is the whole difference. The objection above was
never that the fix was wrong; it was that an unchartered plan reaching into somebody else's route
file turns a one-line correction into an unreviewed edit. A charter removes the objection without
weakening it.

**Measured before and after, in Chromium, on the built `dist/`, at all six device classes:**

| Device class | Pointer | Before | After | Floor |
|--------------|---------|--------|-------|-------|
| 344 folded | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** | 44px |
| 390 phone | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** | 44px |
| 673 foldable-unfolded | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** | 44px |
| 768 tablet-portrait | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** | 44px |
| 1024 tablet-landscape | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** | 44px |
| 1440 laptop | fine | 23 / 23 / 23 px | 23 / 23 / 23 px | n/a |

`audit15.mjs /admin/` went from **3 offenders at every coarse class** to **0 at every coarse
class**. 45px rather than exactly 44 is `min-height: 44px` plus the 1px hairline under a
content-box; the floor is a minimum. The 1440 row is unchanged **on purpose** — the rule is keyed
on `pointer: coarse`, so a fine pointer keeps the drawn 23px geometry. A rule that also fired at
1440 would be a rule keyed on the wrong thing and passing by accident.

**Where it was fixed.** `.playground/src/pages/admin/[...state].astro`, inside the
`@media (pointer: coarse)` block that already existed at the end of that file's style block —
exactly where this entry suggested. Three declarations:

```css
.adm-group-link { display: inline-flex; align-items: flex-end; min-height: 44px; }
```

**The floor is on the hit area, and the drawn geometry is byte-for-byte unchanged.** The label is
a 17px display-face link with a 1px `--wire` hairline 1px below its glyph run.
`align-items: flex-end` pins the text line box to the BOTTOM of the grown box, so the border
stays directly under the text and all 22px of new height is added ABOVE, where nothing is drawn.
Measured with a `Range` over the text node: **the gap from the bottom of the glyph run to the
border edge is 1px before and 1px after, at every one of the six classes**, and computed
`font-size` is 17px in both states.

**Why not the two obvious alternatives.**

- **`padding-block`** grows the box but pushes the hairline away from the word it underlines. The
  drawn geometry would have changed.
- **An `::after` overlay** does not work *at all* here, and the reason generalises: `audit15.mjs`
  measures the **anchor's own bounding box**. A pseudo-element hit area would have left the element
  still reporting 23px while the real target was 44 — the fix would have been invisible to the
  check that exists to prove it. **Reaching the floor and reporting it have to be the same
  measurement.** Worth remembering the next time a floor is closed with an overlay.

**Keyed on `pointer: coarse`. Not on width, and not on the ANY-prefixed pointer query** — a mouse
plugged into a tablet must not inherit touch geometry, and a width query would hand a
phone-sized desktop window touch targets. The literal ANY-prefixed query string is deliberately
not written into that file even in prose, because an acceptance grep asserts its absence and
cannot tell a live media condition from a comment about one.

**Nothing else in plan 12's route file changed.** The single edit is the three-declaration rule
above, added inside the pre-existing coarse-pointer block. No markup, no other selector, no
import, no frontmatter. Verified by a negative control: removing exactly that rule returns 3
offenders at 23px at all five coarse classes, and restoring it is **SHA-256-identical**
(`2d21ce75f56c6bac37bd5f8846722329460aef17602ea13fba6792a9b7b0cf26`).

**Deliberately left as they were:** every other deferred item in this file. **D-16-1 stays open**
— see the next entry and the paragraph appended to it.

---

## D-16-1 · `Public.astro`'s AppBar and Footer are under the 44px floor on every public route

**Found by:** plan 16, in the Chromium audit (`.playground/audit15.mjs`), while auditing the
contact sheet after filling Parts 2 and 3
**Owns the file:** plan 09 — `.playground/src/layouts/Public.astro`, and the design system's
own `AppBar` / `Footer`
**Status:** not fixed. Out of scope: the offending elements are design-system components placed
by another plan's layout, on **every** public sketch, and nothing plan 16 changed reaches them.

Measured on the built `dist/`, at 344, 390, 673, 768 and 1024, all coarse pointer:

```
/          3 x  <a>  (AppBar brand + nav)              20px  (40px at 344)   floor 44px
/          3 x  <a class="ds-atom-link ds-atom-footer-link">   22.5px        floor 44px
/work/     the same 6, plus 1 x <a class="wk-xlink">   30px                  floor 44px
```

**It is not a regression and it is not specific to the contact sheet.** `/work` is untouched by
plan 16 and reports the identical six, so the six belong to the shared public layout. Plan 16
fixed the **78** offenders it created or now owns on `/` — `.cs-id` (30, 18px), and the three
matrix link classes `.cs-matrix-cell` (40, 14px), `.cs-matrix-host` (31, 39px) and
`.cs-matrix-screen` (7, 15px) — with one `@media (pointer: coarse)` block in that file, and
left these six alone.

**Two of the three are a design-system finding rather than a layout one.** `AppBar`'s brand
link and `Footer`'s link list both paint their own geometry, so a consumer fixing this reaches
past the component to restate it — the same shape as `F-15-7` and the `G-2` control-geometry
family. Worth a look when Phase 1 works through G-2.

**One more thing the same run caught, on a route plan 16 does not own:** `/work` **scrolls
horizontally at 344 and 390** (`doc=385/344`, `doc=416/390`), which is an R-6 violation on the
narrowest two device classes. `00-RESPONSIVE-CONTRACT.md` was written after plan 09 built that
page, so this is a contract applied retroactively rather than a rule broken. Plan 11's review
pass owns the public sketches.

**Suggested owner:** Phase 1 for the AppBar/Footer geometry (with G-2), and Phase 5 for
`/work`'s reflow when the page is built for real.

### Still open after plan 00-24, and deliberately so

Plan 00-24 ran `audit15.mjs /photos/` and reports the inventory unchanged, with
de-duplication disabled so the raw count is visible rather than collapsed:

```
/photos/   3 x  <a>  (AppBar brand + 2 nav)                     20px    floor 44px
/photos/   3 x  <a class="ds-atom-link ds-atom-footer-link">    22.5px  floor 44px
/photos/   1 x  <a class="ph-xlink">  "← see the work"          30px    floor 44px
```

**Seven offenders, none of them new, and none of them touched.** The six are the shared public
layout's, identical to the six this entry already records on `/` and `/work/`. The seventh —
`.ph-xlink` on `/photos/` — is the exact twin of the `.wk-xlink` this entry already records on
`/work/`: a page-local cross-link class in a public sketch, same shape, same 30px. **It is added
to this entry's inventory rather than opened as a new item**, because a third instance of a
recorded pattern is evidence for that pattern, not a separate discovery.

**Why 00-24 did not fix them.** Two of the three classes are `AppBar`'s brand link and
`Footer`'s link list, which **paint their own geometry inside the design system**. A consumer
fixing those reaches past the component to restate its geometry — the local workaround the Core
Value forbids, and the same shape as `F-15-7` and the `G-2` control-geometry family. A local
patch would also make plan 00-17's screenshots *look* clean while leaving the design-system gap
unrecorded, which is the worse outcome of the two.

**A correction to plan 00-24's own acceptance command.** Its task 2 verify runs
`node audit15.mjs /admin/ /photos/` and expects exit 0, which cannot hold while D-16-1 is open —
the same plan's task 3 instructs that D-16-1 **stay** open, and its threat register dispositions
`T-00-77` (D-16-1 patched locally to clean a screenshot) as **accept**. The command contradicts
the plan's own decision. The binding gate is the one in the task's `done` criterion, which names
**`/admin/` only**, and `/admin/` reports 0 at all five coarse classes.

**Owners unchanged:** Phase 1 for the `AppBar` / `Footer` geometry, with G-2; Phase 5 for
`/work`'s reflow, and now for `.ph-xlink` / `.wk-xlink` when those pages are built for real.

---

## D-24-1 · `alt={title}` survives on three surfaces plan 00-24 does not own

**Found by:** plan 00-24, while removing the same defect from `photos.astro`
**Owns the files:** plan 09 — `.playground/src/pages/home.astro`; plan 00-23 —
`.playground/src/components/PhotoLayoutBoard.tsx`; plan 00-20 —
`.playground/src/components/FocalPointSketch.tsx`
**Status:** not fixed. Out of scope: plan 00-24's charter names `photos.astro`, and nothing it
wrote reaches the other three.

Located this session, by attribute rather than by eye:

```
src/pages/home.astro:154                  alt={p.title}     PUBLIC — 6 peek photos
src/components/PhotoLayoutBoard.tsx:609   alt={p.title}     admin — board tile
src/components/PhotoLayoutBoard.tsx:714   alt={p.title}     admin — drag overlay
src/components/FocalPointSketch.tsx:356   alt={slot.title}  admin — focal-point preview
```

**The public one is the one that matters.** `home.astro`'s six peek photos are a **public**
surface on the site's primary route, so six more images announce their name where their
description belongs, to exactly the readers who cannot see them. It is the same defect as
`photos.astro:182` and it wants the same fix — read the photo's own `alt`, and where it is
unwritten, a placeholder that is not the title and not `alt=""`.

**The three admin ones are materially weaker and should be judged separately, not batched.** Each
thumbnail sits immediately beside the same title rendered as text, so the alt text is duplicating
an adjacent label rather than substituting for a missing description — arguably these images are
decorative in that context and want `alt=""` with the title carrying the accessible name. That is
a design judgement about the admin, not a copy-paste of the public fix.

**Suggested owner:** Phase 5 for `home.astro`, alongside the `ALT PENDING` removal the same
phase already owns — the two are one decision, since both hinge on the 39 real strings landing.
Phase 7 for the two admin islands.
