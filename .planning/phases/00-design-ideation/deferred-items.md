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
