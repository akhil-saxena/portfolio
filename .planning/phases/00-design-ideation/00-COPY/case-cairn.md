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
  - SECOND Ghost Watch residue, found by plan 00-20 while re-verifying decision 3 rather than
    by looking for it: scripts/lint-scoped.sh's allowlist still exempts src/server/scheduled.ts,
    described in its own header as "the nightly cron (Phase 04.9-08 source-live-ping) which
    intentionally iterates every active application across all users". That file does not exist
    (checked this session), and neither do the last_pinged_at / last_ping_status columns the
    exemption says it writes. So the multi-tenancy guard carries a standing hole for a file that
    was deleted — harmless today because nothing occupies the path, and exactly the kind of
    exemption that stops being harmless the day something else is written there. Decision 3
    above is deliberately silent about the allowlist: the claim it makes is what the guard
    enforces, which is true. Two removals, two residues, both in the same feature.
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

### 3. Multi-tenancy is structural, not per-query discipline

Every row is scoped by `user_id` and every read goes through one `scopedTo(userId)` layer in
`src/db/scoped.ts`. `scripts/lint-scoped.sh` fails the build on a raw query against any of the
ten tenant-scoped tables written anywhere else, from inside the same `lint:all` decision 1 runs
in [source: `../cairn/ARCHITECTURE.md`, `../cairn/scripts/lint-scoped.sh`].

**The option not taken:** rely on every query remembering its own user predicate.
**What it would have cost:** the leak the guard names in its own header — one forgotten
predicate is a cross-tenant read, in the one product holding a person's whole job search.

<!-- Restored by plan 00-20 at the user's direction, and it displaced a decision rather than
     being added to three. Plan 00-18's compression rule was "keep the decisions whose rejected
     alternative cost a NAMED INCIDENT, cut the ones whose alternative cost only an argument",
     and by that rule this one was cut: "one forgotten predicate is a cross-tenant leak" is a
     named failure MODE, not an incident that occurred. The override reason is that this is
     Cairn's only security decision and Cairn holds personal job-search data, so a register with
     no security entry misrepresents the product.

     CUT TO MAKE ROOM: the old decision 3, "The design system was patched from below, on
     measurements" — the pa11y pass that found --ink-4 at 3.36:1 and --ink-5 at 1.34:1 on
     Cairn's cream surface, with seven of eight public pages failing AA before the local
     override (../cairn/A11Y-AUDIT.md). Cut because it answers a different question from the one
     ## Problem asks. This study asks how you make a refusal load-bearing; decisions 1 and 3 both
     answer it with the same mechanism on different stakes, and decision 2 answers it by carrying
     a removal through to the security code that defended it. The contrast entry argues
     measurement over deference to an upstream, which is a good argument and a different study's.
     Nothing is lost from the corpus: the design-system study carries that --ink-4 defect from
     its own side, as its decision 1 — and its version is the stronger one, because there the
     defect was invisible in review BY CONSTRUCTION (light mode set --ink-4 and --ink-3 to the
     same value, so the bug existed in one theme only). Also recorded there: the design system
     later aliased --ink-4 away outright for its own measured dark-mode failure at 1.96:1
     (../design-system/CHANGELOG.md, 1.10.0). One token, two repositories, two independent
     contrast failures, and whether one prompted the other is recorded in neither.

     Re-verified this session rather than restored on the old draft's word: scripts/lint-scoped.sh
     exists, greps ten tenant-scoped tables, and runs inside lint:all at package.json:28 — the
     same entry point as lint-refusals.sh, which is why decision 1 and this one are the same
     mechanism and are stated as such. -->

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

Per D-41, a hero plus one inline shot, both from the live site at cairn.co.in: the board across
its five stages, and the Rejection Reframe — the screen the worst-week test was written for, and
decision 1's shipped counter-example to the confetti every other tracker puts there. Per D-42
both go straight to R2 under `assets/`, sized at upload so nothing shifts — not through the photo
pipeline, which watermarks and reads EXIF.

<!-- ONE inline rather than two, which is a change from the pre-00-20 plan and is deliberate.
     D-41 allows a hero plus one OR two. The second inline used to be a dark-mode detail page,
     justified by the contrast decision that 00-20 cut — and with that decision gone the shot
     illustrates nothing this register argues. The two decisions now standing beside decision 1
     are a removal and a query layer: both invisible by construction, neither photographable
     without staging a picture of an absence. Kept as a note rather than said on the page,
     because a reader does not need to be told why there is one figure; the template does. It
     also gives the single case template two figure counts to be laid out against instead of one,
     which is worth more as evidence than a third screenshot would be. -->

