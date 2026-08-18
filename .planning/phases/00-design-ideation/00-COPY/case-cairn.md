---
project: cairn
tier: long
status: first-pass
awaiting: akhil-edit
badge: Live
---

# Cairn

<!-- R-1 compression. Cuts and sources: 00-PUBLIC-DESIGN-NOTES.md, "Case-study compression".

Provenance rule for this study: where Cairn's planning documents and its shipped code disagree,
the code wins and the claim is taken from the code. REMOVED.md sets that rule for the repo
itself — the phase documents record planning history, and where they conflict with it, it wins.
Conflicts found and resolved that way while drafting:
  - The pipeline ships FIVE stages (Wishlist, Applied, Interviewing, Offer, Closed), per the
    schema enum in src/db/schema/applications.ts. PROJECT.md still describes six. Not used.
  - PROJECT.md lists Stealth Mode among its key decisions; REMOVED.md records it deferred and
    never built. Not used.
  - Ghost Watch residue: the cron, scheduled handler, URL-check route, SSRF guard and the three
    application status columns are all verifiably gone (wrangler.jsonc, src/server/routes/,
    src/db/schema/applications.ts, checked this session), but the value "ghost_flagged" still
    survives in the timeline_events.kind enum (src/db/schema/timeline-events.ts:26). The prose
    below therefore attributes "end to end" to REMOVED.md and states only what was verified.
    Worth a look before Phase 6 quotes the removal as total.
-->

## Problem

A job search is long and demoralising, and most tools built for it make that worse by importing
the habit-tracker playbook: streaks, days-since-you-applied, leaderboards, an AI to write the
cover letter. Cairn's README sets a different bar — *the worst-week test*: every screen has to
hold up when you imagine reading it after five rejections in a row, and anything that stings
gets cut [source: `../cairn/README.md`]. It ships as one Cloudflare Worker — Astro SSR, React
islands, Hono, Drizzle on D1 [source: `../cairn/ARCHITECTURE.md`].

The product is therefore defined as much by what it will not do as by what it does, and refusals
are the least durable kind of decision. A feature defends itself — removing it breaks a test. A
refusal defends nothing: adding a streak counter
to a tracker that has none breaks nothing at all, ships green, and reads as an improvement in a
pull request. So: **how do you make a refusal load-bearing?**

## Decisions

### 1. The refusals are a CI check, not a promise in a README

`scripts/lint-refusals.sh` greps every source file for a ban list — `streak`, `daysSince`,
`cohort_compare`, `nudge`, `achievement`, the notification-permission call and two emoji — and
fails the build on any hit, from inside `lint:all`, on every push
[source: `../cairn/scripts/lint-refusals.sh`, `../cairn/package.json`].

**The option not taken:** publish the refusals in the README and rely on discipline.
**What it would have cost:** the product. `REMOVED.md` says "restraint is the product", and
adding from the forever-no list "would undo the wedge"
[source: `../cairn/.planning/REMOVED.md`] — and a refusal that lives only in prose fails nothing
when it goes.

### 2. Ghost Watch was cut down to and including its own security guard

Ghost Watch was a nightly cron pinging each saved posting to flag dead listings. `REMOVED.md`
records it removed end to end — cron, scheduled handler, URL-check route, **the SSRF guard
written to make that route safe**, the three status columns — for "no use case at v1 scale".
Re-verified in shipped code rather than on the document's word: none are there
[source: `../cairn/wrangler.jsonc`, `../cairn/src/db/schema/applications.ts`].

**The option not taken:** keep it behind a flag, or at least keep the columns.
**What it would have cost:** a nightly job fetching user-supplied URLs is an SSRF surface that
has to stay correct forever, for a feature with no use case at this scale. The columns alone
would leave dead schema every later migration carries.

### 3. The design system was patched from below, on measurements

A `pa11y` pass over 12 production pages caught the design system's own muted-ink tokens failing
on Cairn's cream surface: `--ink-4` at **3.36:1** where AA needs 4.5:1, `--ink-5` at
**1.34:1**. Both were overridden locally [source: `../cairn/A11Y-AUDIT.md`].

**The option not taken:** accept the upstream values, because they came from the design system.
**What it would have cost:** seven of eight public pages failing AA on text contrast — what the
audit measured before the override [source: `../cairn/A11Y-AUDIT.md`].

<!-- Cut in the R-1 compression, recorded so it is not lost: the design system later aliased
     --ink-4 away outright for its OWN measured dark-mode failure at 1.96:1
     (../design-system/CHANGELOG.md, 1.10.0) — one token, two repositories, two independent
     contrast failures, and whether one prompted the other is recorded in neither. Dropped as
     the third example of a point decision 3 already makes with a measured incident; the
     design-system study carries that defect from its own side. -->

## Outcome

The repository is unusually explicit that this section cannot be filled from it: the Validated
section of its requirements document reads, in full, "(None yet — ship to validate)", and no
analytics or error tracker runs in production — itself a decision rather than a gap
[source: `../cairn/.planning/PROJECT.md`, `../cairn/ARCHITECTURE.md`]. What can be stated is the
shape of the bet, not its result. Nothing in the repository knows whether it paid.

<!-- Searched for evidence of outcome: usage or install counts (none in git), analytics
     (refused in production by an architectural decision), a retrospective or post-launch
     review (none), and the Validated requirements section (explicitly empty). -->

> [NEEDS AKHIL] Cairn has been in daily use through a live job search since <month>, across
> roughly <n> applications. The parts that earned their keep were <x> and <y>; the part that
> looked right in design and went unused was <z>. The refusal hardest to hold when the search
> got long was <refusal>. If one number belongs here it is <metric>, and it has to come from
> Akhil rather than the repository — which was deliberately built not to collect it, the same
> decision this study is about.

## Assets

Per D-41, a hero plus two inline shots, all captured from the live site at cairn.co.in: the
board across its five stages; the Rejection Reframe, the screen the worst-week test was written
for; and a detail page in dark mode, since decision 3 is a contrast argument. Per D-42 all
three go straight to R2 under
`assets/`, sized at upload so nothing shifts — not through the photo pipeline, which watermarks
and reads EXIF.
