# The three gates waiting on you

Everything else is running. These three need a human, and nothing else in the project
can substitute — each is blocked on a judgement or an action only you can perform.

| # | Gate | Time | Reversible? | Blocks |
|---|---|---|---|---|
| 1 | ~~`access-off` — Cloudflare Access window~~ | — | — | **DONE 2026-08-19. Phase 2 closed.** |
| 2 | [00-11](#gate-2--00-11-three-by-eye-judgements) — review passes | ~20 min left | Yes | Phase 0 completion |
| 3 | [00-17](#gate-3--00-17-six-review-passes-then-deletion) — six review passes | ~45 min | Yes, since 2026-08-19 — see below | Phase 0 completion |

**Two remain: gate 2 then gate 3.** Gate 3 is last because it ends in an irreversible delete,
and you want gate 2 settled first.

**None of these block Phase 1.** The charcoal theme work continues while these sit open, so
there is no cost to taking them at your own pace.

**Where to record verdicts:** [`phases/00-design-ideation/00-HUMAN-CHECKLIST.md`](phases/00-design-ideation/00-HUMAN-CHECKLIST.md)
is the register — tick boxes, write verdicts inline, add rows under *Your additions*. It's
committed, so your marks persist and downstream plans read them. **This document is the
procedure; that one is the record.** It also holds the canonical viewport table and the route
map, which this document deliberately does not duplicate.

---

## Gate 1 · `access-off` (plan 02-10) — ✅ DONE

> **Closed 2026-08-19.** All five request shapes returned exactly **401** from the Worker's own code
> with Access disabled for one second, and the authenticated path confirmed `/admin` rendering plus
> `/api/health` returning `{"status":"ok","r2":"reachable"}`. Evidence in
> [`phases/02-astro-foundation-fail-closed-auth/02-DEPLOY-VERIFICATION.md`](phases/02-astro-foundation-fail-closed-auth/02-DEPLOY-VERIFICATION.md).
> Phase 2 is complete. **The section below is kept for the record only — nothing to do.**


### Why this exists at all

Right now `preview.akhilsaxena.com` refuses `/admin`, `/api/health` and `POST /_actions/ping`.
I verified that independently — 302, with `www-authenticate: Cloudflare-Access`.

**But those refusals prove your dashboard is configured, not that the code is.** Cloudflare
Access intercepts at the edge, *before* the Worker runs. Every probe I can make from outside
is answered by Cloudflare, so the Worker's own auth code has never once been observed
refusing anything.

That distinction is not academic. The legacy app's in-code gate fell back to a
**cookie-presence check** whenever the Access configuration was missing — so a correct
implementation and a badly broken one are indistinguishable from the outside while Access is
enabled. The only way to tell them apart is to remove the edge layer for under a minute and
watch what the Worker does alone.

CLAUDE.md's constraint is that auth **fails closed**: a missing configuration must deny, not
degrade. This is the only test in the entire project that can prove it.

### What you do

1. Cloudflare dashboard → **Zero Trust → Access → Applications**
2. Find the application covering `preview.akhilsaxena.com`
3. Either **disable** it, or set its policy to **Bypass / Everyone**. Disabling is cleaner.
4. Wait **15–30 seconds** for propagation
5. Reply **`access-off`**

Keep the dashboard tab open — you re-enable in a couple of minutes.

### What happens the moment you reply

I probe five request shapes and require **exactly 401** from the Worker's own code — not a
redirect, not a rendered page, not JSON:

- `GET /admin`
- `GET /api/health`
- `POST /_actions/ping`
- a request carrying a **garbage JWT** header
- a query string **plus** a garbage header

The agent has already **pre-flighted this verify with Access still on** and confirmed it
reports `EXIT=1` with the message *"Access is still intercepting (got 302) — the window is not
open, so a 401 could not be attributed to the Worker's code."* So if your dashboard change
doesn't actually take effect, it records a failure rather than a false pass. You cannot
accidentally get a green result here.

Verbatim responses land in
[`phases/02-astro-foundation-fail-closed-auth/02-DEPLOY-VERIFICATION.md`](phases/02-astro-foundation-fail-closed-auth/02-DEPLOY-VERIFICATION.md),
which has two headings currently **verified-empty** waiting for exactly this.

### Is the window safe?

Yes, and deliberately bounded. During it the deployment's only protection is the code under
test — which is the point. It is safe because:

- the site is **not public** — `preview.akhilsaxena.com` isn't linked anywhere
- the **apex is still on the legacy Pages project**, untouched
- there is **no data behind `/admin`** yet; it's a placeholder page

If any of the five shapes returns a **2xx**, that is a live unauthenticated admin surface and
I will say so plainly and stop rather than proceed.

### Then Task 3 — re-enable, and prove the positive path

**First: re-enable the application.** Before anything else.

Then the half that no automated test in this phase can reach. Locally, both Access secrets are
placeholders on the non-resolving `.invalid` TLD, so no token can ever verify and **only the
deny path is testable**. Production is the first place the positive path exists at all, and a
browser session is the only way to obtain a real Access JWT.

1. Visit `https://preview.akhilsaxena.com/admin` in a browser. You should be redirected to the
   Access login, authenticate, and land on the admin placeholder. Confirm it **rendered**.
2. In the same session, visit `https://preview.akhilsaxena.com/api/health`. It must return
   **200** with a body containing `"r2":"reachable"`. **Paste that body back to me.**
3. Confirm you did **not** need any extra dashboard step for R2 to work.
4. Confirm **Workers Builds is still not connected** to the repo — a second, ungated deploy
   path is the one remaining way a red test suite could still reach production.
5. Confirm the apex `akhilsaxena.com` still points at legacy Pages.

Reply **`approved`** plus that `/api/health` body.

### If something goes wrong

| Symptom | What it means | What I do |
|---|---|---|
| 401 **after** you authenticate | The AUD or team domain from `wrangler secret put` doesn't match the application | Not your mistake — I'll diagnose |
| `/api/health` returns **500** | The R2 binding is genuinely misconfigured in production | This is the **loud failure** FND-03 wants, not a checkpoint failure. Send me the error; I record it as a finding, not a retry |
| Any probe returns **2xx** | Live unauthenticated admin surface | I stop immediately and tell you |

Step 2 matters more than it looks: it proves `env.PORTFOLIO_BUCKET` resolved from
`cloudflare:workers` in the deployed Worker **through a code path with no absence-guard in
it** — which CLAUDE.md requires, because a guard would mask a real failure.

---

## Gate 2 · 00-11 (review passes) — three judgements ✅ answered

> **J1, J2 and J3 are settled (2026-08-19)** and recorded in
> [`phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md`](phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md)
> §Review outcome: **J1 44px** confirmed · **J2 overridden** to `--text-lg` (17px) in `--ochre-d`,
> taking neither offered option because the contrast measurement showed the WCAG ambiguity the 24px
> fallback existed to resolve was never real · **J3 confirmed**.
>
> **What is left:** the surrounding review passes — the `--wire` project cards on `/work-recolour`,
> `/photos` at 1440 and 390, the five-project `/home-act2` grid, and the five `/work/{id}` case pages
> (68ch measure, `[NEEDS AKHIL]` lengths, `[source:]` claims). The plan's tier-split question is
> **void**.


### Why a script can't do this

`check-no-ivory.sh` is green. That proves **no ivory token value survives** — it does not
prove the result is good. *"Work and Photos read as charcoal, not as recoloured ivory"* is a
design judgement, and [`00-UI-SPEC.md`](phases/00-design-ideation/00-UI-SPEC.md) flags three
derived decisions as **confirm-or-override**, meaning **they proceed unless you override
them.** Silence is not neutral here — it's assent.

Work exists as *two* separate artefacts on purpose, so that if you dislike it, the dislike is
attributable to the recolour **or** to the restructure, not to both at once.

### Setup

```bash
cd .playground && npx astro dev     # → http://localhost:4321/
```

`/` is the contact sheet — every artefact is linked from it with a one-liner saying what it
*proves*. Public routes are charcoal **dark**. Laptop = **1440 × 900** unless stated.

Open [`../design_handoff_portfolio/Work.dc.html`](../design_handoff_portfolio/Work.dc.html)
and [`../design_handoff_portfolio/Photos.dc.html`](../design_handoff_portfolio/Photos.dc.html)
in a second window — those are the ivory originals for side-by-side.

### The three judgements — the actual decisions

These are the three that proceed unless you say otherwise.

**J1 · 44px vs 52px page header** — `/work-recolour` at 1440
Both render side by side, labelled. 44px Playfair is the primary; 52px is the labelled G-11
reference. Playfair has a **larger x-height and heavier stems** than the handoff's Newsreader
at the same pixel size, so matching the handoff's number does not match its weight. This is a
judgement, not arithmetic. **Say which is right.**
*Already acted on upstream:* 01-12 shipped `--text-4xl-plus: 52px` to the shared type scale,
so if you pick 52 the token exists.

**J2 · the 22px italic cross-link** — `/work` at 1440, scroll to the foot
An italic serif cross-link at 22px in `--ochre-d-strong` (`#6B4417` light / `#D4A66D` dark).
**Is that too heavy for a 22px italic serif?** The stated fallback is to raise it to **24px**
and revert to `--ochre-d` — which resolves the WCAG large-text ambiguity by arithmetic instead
of by judgement. **Choose one.**

**J3 · the 1080px Brevo band cap** — `/work` at 1440
Two bands: employment first, then projects. **Do they read as two different kinds of
evidence?** Specifically, does the Brevo band capped at 1080px read as **one row per line**, or
does the serif title and the mono metric float apart?

### The rest of the pass (five more looks)

- `/work-recolour` — the **project cards**. On dark the *border* carries the boundary, not the
  fill. Cards that dissolve into the page mean the `--wire` treatment didn't take.
- `/photos` at 1440 **and** 390 × 844 — dark-toned photographs must not bleed into the page;
  the inset 1px `--rule` ring gives each tile an edge it didn't need on ivory. Check the
  **active filter pill is filled LIGHT** — on ivory it was filled dark, and mapping the literal
  colour makes it invisible here.
- `/home-act2` — does the **five-project** Act-2 grid work? The handoff specified a 2×2 for
  four and omitted Cairn entirely. This sketch exists so Phase 5 doesn't improvise.
- `/` — do the Part 1 index lines say what each artefact **proves** rather than what it shows,
  and does the Part 4 measurement readout carry real numbers?

### One part of this plan is superseded — by you

00-11 as written has a **Task 2** that asks you to review two case-study templates
(`/case/long`, `/case/short`) and judge whether the short form *"reads as a deliberate tier or
as a truncated long form."*

**That question no longer exists.** Your mid-phase redirection — *"I don't need long cases,
even short ones are very long; one page per case, not scroll to 10 cases in a single page"* —
removed the tiering. I verified in
[`../.playground/src/lib/artefacts.mjs`](../.playground/src/lib/artefacts.mjs) that
`X-case-long` and `X-case-short` are **gone**, replaced by five per-study routes:

`/work/design-system` · `/work/cairn` · `/work/hued` · `/work/momentum` · `/work/timeshift`

So skip the tier question. What's still worth judging on those five pages, from Task 2's
surviving intent:

- the **68ch measure** with real prose in it — too wide and the eye loses the line, too narrow
  and the decisions section fragments. **This is the number Phase 6 builds against.**
- the **`[NEEDS AKHIL]` blocks** — legible as provisional without dominating, and is their
  *length* plausible for the finished section? They're written at finished-paragraph length on
  purpose so build phases work against real text lengths.
- the **`[source:]` annotations** — is any factual claim there you wouldn't want an engineer to
  check against the repo?
- the design-system study should **close by pointing at the page you're reading it on** — the
  only project whose outcome you're looking at while reading about it.

Drafts: [`phases/00-design-ideation/00-COPY/`](phases/00-design-ideation/00-COPY/)

### How to reply

**`approved`** plus an explicit answer to **J1, J2 and J3**. Or describe what to fix.

Any defect is either a **sketch fix** (redo now, this phase) or a **design-system gap** (file
in [`phases/00-design-ideation/00-FINDINGS.md`](phases/00-design-ideation/00-FINDINGS.md)) —
never a local workaround. That's the Core Value: the design system wins, and the gap becomes an
upstream finding.

---

## Gate 3 · 00-17 (six review passes, then deletion)

### Do this one last, and know what it authorises

00-17 ends by **deleting `.playground/`** and asserting it's gone — so the throwaway sketches
cannot silently become the Phase 2 foundation.

**That deletion is no longer irreversible — you changed this on 2026-08-19.** The sketches are
preserved on the **`playground/phase-0-sketches`** branch (pushed to origin): 113 source files,
`node_modules` excluded, plus the 480 KB design-system tarball so the branch is reproducible at the
version that was actually reviewed. Main tracks zero playground files and `.gitignore:38` still
fences the directory, so it cannot drift into the rebuild.

It *was* irreversible until then: `.playground/` was gitignored with **zero git history** —
`git log --all --diff-filter=A` found nothing — so this gate would have destroyed the only copy of
every reviewed artefact, on one machine.

To get it back after deletion: `git checkout playground/phase-0-sketches -- .playground` (then
`npm install` inside it).

Two things were nearly lost to this and are now rescued into the phase directory:

- [`phases/00-design-ideation/scripts/playground-measurements/`](phases/00-design-ideation/scripts/playground-measurements/)
  — 10 measurement scripts. `00-UI-SPEC.md:832` claimed they *"are committed"*; they were not.
  Phase 1's roadmap says to reuse the DS-09 bundle measurement, which lives here.
- [`phases/00-design-ideation/theme-prototype/`](phases/00-design-ideation/theme-prototype/)
  — the 5 charcoal CSS files, same near-miss.

The 88 PNGs in [`phases/00-design-ideation/screenshots/`](phases/00-design-ideation/screenshots/)
remain the *committed-to-main* record — they are what Phase 5 and Phase 6 read without checking out
another branch. The sketches themselves are now recoverable from the branch above, so a clipped
screenshot is an annoyance rather than a permanent loss.

### The six passes — one question each

Start the server, open `/` — that's the contact sheet. Walk it top to bottom.
**Admin is charcoal *light* — never judge it in dark.**

**1 · Coverage table (Part 2).** The build already refuses a blank cell, so this pass is about
whether the **reasons** hold. Is any `n/a` unconvincing — e.g. is *"`/admin/site` has no async
load"* actually true?

**2 · Screens, populated.** The seven `S-` artefacts. Does each screen's IA match its entity,
and is the field catalog complete against
[`phases/00-design-ideation/00-ADMIN-IA.md`](phases/00-design-ideation/00-ADMIN-IA.md)?
Hardest case is `/admin/site` — the screen the legacy admin never had.

**3 · Empty states.** The five `E-` artefacts. Does each say what is missing **and what to do
about it** — not merely that something is absent? The pair to compare is
`/admin/photos/empty/` vs `/admin/photos/filtered-empty/`.

**4 · Treatments.** The eight `T-` artefacts. Are the three error treatments **genuinely
distinct from one another**, and is `dirty` legible in all three places D-13 requires — on the
screen, on the sidebar badge, **and** on the dashboard? Hosts: `/admin/dirty/`,
`/admin/error/`, `/admin/loading/`.

**5 · Overlays.** The nine `O-` artefacts, and `/admin/conflict-diff/` in particular.
**Can you resolve one file without abandoning another?** That single question is why D-16
exists, and it's the largest surface in the admin.

**6 · Phone and refusals.** The four `P-` artefacts at **390** (and 344), plus the two `R-`
refusals. Are the four capabilities complete, and do the two refusals read as **honest design**
rather than as something broken?

### Then check the record itself

Open [`phases/00-design-ideation/screenshots/`](phases/00-design-ideation/screenshots/) — 88
PNGs named `00-{class}-{id}-{state}-{mode}-{viewport}.png`. Spot-check that they are:

- **legible**
- in the **right mode** (admin light, public dark)
- **full-page rather than clipped**

A clipped screenshot is a permanently lost artefact once the playground is gone.

### Note before you start

The captures were taken **before** you approved the real italic axis. Phase 1's 01-20 gate
re-captures the charcoal set *with* the italic, so any italic rendering you see here is not
final. Judge layout, IA and states — not the italic.

---

## What is *not* waiting on you

Phase 1 continues autonomously: 01-13 is executing now, then 01-14 → 01-19 with no stops. Two
human gates arrive at the end of it —

- **01-20** — review the charcoal captures (must be captured **with** the italic axis; owes at
  least two new visual baselines, `AnchorNavigation` and `CompactWithLinks`)
- **01-21** — you run `npm publish` for v2.0.0. Needs 12288 MB build memory. Watch the
  hardcoded `v1.11.4` at `OverviewPage.tsx:495,641` — `version.test.ts` asserts printed
  versions match `package.json` and `prepublishOnly` runs the tests, so **publish aborts** if
  it's stale.

Known rework debt, already recorded, that you do **not** need to re-report: `data/resume.json`
never updated with the one-liners and badges, four case-study images still to capture, and the
`StatCard class="glass"` decision. Section F of the checklist has the full list.
