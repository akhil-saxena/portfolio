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
