---
project: cairn
tier: long
status: first-pass
awaiting: akhil-edit
---

# Cairn — case study (long form)

First-pass draft, written to the same shape and the same `[source: <file>]` convention as the
design-system study, because plan 10 renders both through one template. Every factual claim
names the file it was read out of during this session.

Where Cairn's planning documents and its shipped code disagree, the code wins and the claim
is taken from the code. `REMOVED.md` sets that rule for the repo itself — it declares that
the phase documents record planning history, and that where they conflict with it, it wins
[source: `../cairn/.planning/REMOVED.md`]. Two conflicts were found and resolved that way;
both are recorded in the provenance note at the end of the decisions section.

Opens consistently with the one-liner already drafted for this project — *"A job application
tracker with no streaks, no cohort comparisons and no confetti anywhere in it."*
[source: `.planning/phases/00-design-ideation/00-COPY/one-liners.md`].

## Problem

A job search is a long, demoralising process, and most tools built for it make that worse by
importing the habit-tracker playbook: streaks, days-since-you-last-applied, leaderboards, an
AI that writes the cover letter for you. Cairn's README states the problem in one line and
then states the bar it set for itself — *the worst-week test*: every screen has to hold up
when you imagine reading it after five rejections in a row, and anything that stings gets cut
[source: `../cairn/README.md`].

That produces an unusual engineering problem. The product is defined as much by what it will
not do as by what it does, and refusals are the least durable kind of design decision — they
survive exactly as long as everyone remembers them. A feature list defends itself, because
removing something breaks a test. A refusal defends nothing: adding a streak counter to a
tracker that has no streak counter breaks nothing at all, ships green, and reads as an
improvement in a pull request.

So the real problem Cairn had to solve is: **how do you make a refusal load-bearing?** The
answer the repo gives is that the refusals are enforced by the build, and that features cut
from scope were removed all the way down to their columns rather than left dormant behind a
flag. The shipped product is a single Cloudflare Worker running Astro SSR with React islands,
a Hono API, Drizzle on D1, R2 for documents and KV for sessions
[source: `../cairn/ARCHITECTURE.md`, `../cairn/README.md`].

## Decisions

### 1. The refusals are a CI check, not a promise in a README

`scripts/lint-refusals.sh` greps every source file for a ban list — `streak`, `daysSince`,
`lastActive`, `since_last`, `cohort_compare`, `nudge`, `digest`, `reminder`, `achievement`,
`badge`, the browser notification-permission call, and the rocket and party emoji — and fails
the build on any hit. It runs inside `lint:all`, which CI runs on every push
[source: `../cairn/scripts/lint-refusals.sh`, `../cairn/package.json`, `../cairn/README.md`].
The script's own header states the intent: it returned clean from the first phase by design,
and exists from day one so that any future contribution violating the voice manifest is
blocked [source: `../cairn/scripts/lint-refusals.sh`].

**The option not taken:** publish the refusals in the README and rely on discipline to hold
them. **What it would have cost:** the refusals *are* the product — `REMOVED.md` says so in
as many words, that "restraint is the product", and that adding any item from the forever-no
list "would undo the wedge" [source: `../cairn/.planning/REMOVED.md`]. A refusal that lives
only in prose is one well-intentioned change away from being gone, and nothing would fail.

### 2. Ghost Watch was removed end to end — including its own security guard

Ghost Watch was a nightly cron that pinged each saved posting to flag dead or stale listings,
with a "source still live" footer. `REMOVED.md` records it as removed end to end: the cron
and its scheduled handler, the URL-check route, **the SSRF guard written to make that route
safe**, the pull-to-refresh affordance, and the three status columns it wrote — with the
stated reason "no use case at v1 scale" [source: `../cairn/.planning/REMOVED.md`].

Re-verified against shipped code this session rather than taken on the document's word: there
is no cron trigger configured, no scheduled handler file, no URL-check route, and none of the
three columns exist in the Drizzle schema [source: `../cairn/wrangler.jsonc`,
`../cairn/src/server/routes/`, `../cairn/src/db/schema/`].

**The option not taken:** keep the feature behind a flag, or at least keep the columns.
**What it would have cost:** a nightly job that fetches user-supplied URLs is a
server-side-request-forgery surface that has to stay correct forever, maintained for a feature
with no use case at the scale the product actually runs at. Keeping the columns would have
left dead schema that every later migration has to carry, for a feature nothing writes to.

### 3. Cut the Settings page rather than keep the two toggles that justified it

Cohort Blur (a toggle to hide count badges) and Rest Day (a toggle to mute urgency tints for
a day) were both built or specced and then cut, with the reason recorded as pacing-as-UI not
earning its keep; their columns were dropped rather than orphaned. The Settings page went with
them, and the one surviving control — theme — became a header toggle. The three-way
light/dark/system picker was reduced to a single light↔dark toggle and its component deleted
[source: `../cairn/.planning/REMOVED.md`].

**The option not taken:** keep Settings, and keep the two pacing toggles inside it.
**What it would have cost:** a settings surface whose entire justification was two features
that had been judged not to earn their keep — and, given the worst-week test, two more
controls asking a user in a bad week to manage their own pacing
[source: `../cairn/README.md` for the worst-week test].

### 4. Multi-tenancy is structural and lint-enforced, not per-query discipline

Every row is scoped by `user_id`, and all database access goes through a single scoped query
layer. This is listed as a load-bearing invariant that does not change without a phase plan,
and CI lint fails on a raw query against any tenant-scoped table written anywhere else,
because that would be a cross-tenant data leak [source: `../cairn/ARCHITECTURE.md`,
`../cairn/scripts/lint-scoped.sh`, `../cairn/README.md`].

**The option not taken:** rely on every query remembering its own user predicate.
**What it would have cost:** the failure mode named in the guard itself — one forgotten
predicate is a cross-tenant leak, in a product holding the single most sensitive document a
person owns during a job search [source: `../cairn/scripts/lint-scoped.sh`].

### 5. The free tier is a hard ship gate, and it picked the algorithms

Holding at zero cost on the free tier is recorded as a hard ship-gate rather than an
aspiration, and it decided two implementation details outright. Password hashing uses
`scryptSync` from the platform crypto module because the Workers CPU envelope is 10ms per
request and the JavaScript bcrypt and argon2 implementations do not fit inside it. Bulk
operations are issued as a single SQL statement rather than one round trip per row, because
the D1 free tier caps daily writes [source: `../cairn/.planning/PROJECT.md`,
`../cairn/ARCHITECTURE.md`].

**The option not taken:** bcrypt or argon2 in JavaScript, the conventional choice.
**What it would have cost:** the request budget. Auth is where most of the 10ms envelope
already goes; SSR pages are measured at roughly 2–4ms
[source: `../cairn/ARCHITECTURE.md`].

### 6. Accessibility was audited against the shipped pages, and the design system was patched from below

A `pa11y` pass over 12 production pages, plus manual review, found and fixed contrast failures
in the design system's own muted-ink tokens as Cairn used them: `--ink-4` measured 3.36:1 on
Cairn's cream surface where AA needs 4.5:1, and `--ink-5` measured 1.34:1. Both were overridden
locally to roughly 5.0:1 and 4.5:1 [source: `../cairn/A11Y-AUDIT.md`].

**The option not taken:** accept the upstream token values, since they came from the design
system. **What it would have cost:** seven of eight public pages failing AA on text contrast,
which is what the audit measured before the override [source: `../cairn/A11Y-AUDIT.md`].

Worth recording because it cuts both ways: the design system later aliased `--ink-4` to
`--ink-3` outright, for a measured dark-mode failure at 1.96:1 across roughly 28 usages
[source: `../design-system/CHANGELOG.md`, 1.10.0]. Two independent measurements of the same
token, in two repos, both failing. Whether the first prompted the second is not recorded in
either repository, and this study does not claim it did.

### Provenance note

Two conflicts between Cairn's planning documents and its shipped code were found while
drafting, and resolved in favour of the code. The pipeline ships **five** stages — Wishlist,
Applied, Interviewing, Offer, Closed — as declared in the schema enum
[source: `../cairn/src/db/schema/applications.ts`]; `PROJECT.md` still describes six. And
`PROJECT.md` lists Stealth Mode among its key decisions, while `REMOVED.md` records it as
deferred and never built [source: `../cairn/.planning/REMOVED.md`]. Neither stale claim is
used above.

## Outcome

The repository is unusually explicit that this section cannot be filled from it. Its
requirements document has a Validated section, and the entry under it reads, in full, "(None
yet — ship to validate)" [source: `../cairn/.planning/PROJECT.md`]. There is no analytics to
consult either, and that is itself a decision rather than a gap: no third-party analytics,
error trackers or feature flags run in production [source: `../cairn/ARCHITECTURE.md`].

So what can be stated is the shape of the bet, not its result. The bet is that a tracker which
refuses the entire engagement toolkit is more usable during the weeks it is most needed, and
that the refusals list is a moat rather than a missing feature list
[source: `../cairn/README.md`]. Nothing in the repository knows whether that is true.

<!-- Searched for evidence of outcome: usage or install counts (none in git), analytics
     (refused in production by an architectural decision), a retrospective or post-launch
     review (none), and the Validated requirements section (explicitly empty). -->

> [NEEDS AKHIL] Cairn has been in daily use through a live job search since <month>, across
> roughly <n> applications. The parts that earned their keep were <x> and <y>; the part that
> looked right in design and went unused was <z>. The refusal that mattered most in practice
> was <refusal>, and the one that was hardest to hold when the search got long was <refusal>.
> If a single number belongs in this section it is <metric>, and it has to come from Akhil
> rather than from the repository — because the repository was deliberately built not to
> collect it, which is the same decision this whole study is about.

## Assets

Per D-41 this study carries a hero plus two inline screenshots, all sourced from the live
site at cairn.co.in [source: `../cairn/README.md`].

- **Hero — the board, populated.** The kanban across its five stages. It establishes the
  product in one image and makes the pipeline decision legible without a paragraph
  explaining it.
- **Inline 1 — the Rejection Reframe.** The single screen the worst-week test was written
  for, and the one place where the anti-gamification stance is a visible design choice rather
  than an absence. Decisions are hard to photograph; this one is the exception, because it is
  the shipped counter-example to the confetti every other tracker would show here.
- **Inline 2 — an application detail page in dark mode.** Decision 6 is a contrast argument,
  and a real page in the theme the tokens were re-measured for shows what the audit was
  protecting far faster than the ratios do.

Per D-42 these take the simple R2 asset path: uploaded straight to R2 under `assets/` on the
same custom domain as the photos, with dimensions captured at upload so there is no layout
shift. They do **not** go through the photo pipeline, which composites a watermark and
extracts EXIF — neither belongs on a screenshot of an interface, and a watermarked UI capture
would read as a photograph that had been processed for the gallery.

No usage figure, install count or commit count appears anywhere in this study. Everything
stated was read out of a named file this session; everything that was not is marked as a gap
rather than estimated, and this site's own case-study template is the thing being measured
against those real lengths.
