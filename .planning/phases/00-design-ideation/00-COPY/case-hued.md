---
project: hued
tier: short
status: first-pass
awaiting: akhil-edit
badge: Maintained
---

# hued

<!--
Short form per D-39. hued has no .planning/ directory and no decisions table, and its history
is 19 commits deep — thin enough that the register of options-not-taken simply does not exist
to compress. So: a real problem, ONE decision visible in the code, and an admitted gap.

Sources read this session: README.md, publishing/play-store-listing.md,
app/src/main/AndroidManifest.xml, app/build.gradle.kts,
app/src/main/java/app/hued/processing/ColorAggregator.kt and PaletteExtractor.kt,
app/src/main/res/raw/color_names.json. The colour-name count was counted out of the shipped
JSON this session, NOT taken from README.md — see the provenance note under ## Decision.
-->

## Problem

Every photo carries colour, and nobody ever looks at it. A gallery is organised by date and
searched by subject, so the one dimension that actually tracks how a stretch of life felt —
muted greys through a quiet winter, warm amber through evenings indoors — is present in the
data and invisible in the interface. hued's stated frame is that this is a design problem
before it is a processing one: its README describes a **design-first** app, not an app with
design, and puts the consequence in a single line — the palette strip is the interface
[source: `README.md`, §Design]. Everything else on screen exists to serve that strip.

Framing it that way makes privacy structural rather than a setting, because a palette is only
honest if it is computed from the whole gallery, and a whole gallery is not something to
upload. hued resolves that by not having the capability at all: the app declares no internet
permission, and its manifest goes further and strips the network-state permission that its own
dependencies pull in, carrying the reason inline — *"hued has no network features"*
[source: `app/src/main/AndroidManifest.xml`, `tools:node="remove"`]. The photos cannot leave,
because there is no route out.

## Decision

Dominant colours come out of the Android Palette API per photo, which is the easy half. The
decision is what happens next: colours are merged by **perceptual distance in CIELAB**, not in
RGB. `ColorAggregator` converts each hex to Lab, walks the colours in frequency-descending
order, and folds each one into the nearest existing cluster when the Euclidean ΔE between them
falls under a fixed threshold of `15.0`; anything further away starts a cluster of its own
[source: `app/src/main/java/app/hued/processing/ColorAggregator.kt`,
`clusterByPerceptualDistance`]. RGB proximity does not track human vision, so the same merge
in RGB would collapse colours that look distinct and separate colours that look identical.
The same perceptual distance then does the naming, matching each final colour against the
31,898 entries shipped in the app's colour-name table
[source: `app/src/main/res/raw/color_names.json`, counted this session].

The cost is that this is greedy and single-pass, not k-means. Because clusters are seeded in
frequency order, the most common colour becomes the representative and absorbs its neighbours
rather than drifting to a centroid — so the strip reports dominance rather than a balanced
partition of the colour space, and one hardcoded constant decides how many distinct colours a
month is allowed to show. The merge deliberately keeps the *earliest* timestamp across every
colour it absorbs, which is what lets the finished strip be ordered chronologically instead of
by weight.

Beyond this one, hued's decisions are not recoverable. Nineteen commits is a thin record, and
none of them argue with an alternative.

<!--
Provenance correction, same pattern plan 02 found and the same one recorded in
case-timeshift.md: README.md line 14 claims "18,000+" colour names while
publishing/play-store-listing.md line 31 claims "31,000+". Loading
app/src/main/res/raw/color_names.json this session gives a list of 31,898 entries. The store
listing is approximately right, the README is stale, and the shipped JSON is authoritative.
Do not re-source this figure from README.md later.
-->

## Outcome

<!-- Searched and empty: README.md, all of publishing/ (store copy, screenshot guide), docs/,
app/build.gradle.kts, all 19 commits — no ADRs, no retrospective, no design journal, nothing on why it
began or what followed. It ships no analytics, having no network permission; installs sit in Play. -->
[NEEDS AKHIL] — why this was built, and what happened after it shipped.

hued began with <the observation or moment that made the colour of a stretch of time feel
worth seeing>, and the design-first framing was settled <at the point in the build where that
choice was actually made> rather than arrived at afterwards. Since release it has reached
about <n> installs, and the reaction worth recording is <what someone said after using it for
a full month>, which is the only horizon at which the idea can be judged. The open question
Akhil should answer here is <whether the palette strip alone carried the product, or whether
it needed the thing he chose not to build>.

## Assets

The hero is `publishing/feature-graphic.png` [source: `publishing/`], which already carries
the palette strip as its whole composition and therefore states the idea without a caption.
The one inline screenshot belongs under `## Decision`: `publishing/screenshots/final/01.png`,
the launch state, whose raw counterpart is named `01-hero.png` in
`publishing/screenshots/raw/` — it shows a real clustered palette, which is the output the
decision above is about. Six finished screenshots and three share-card renders exist in that
directory; D-41 caps this page at the hero plus one, so the rest stay unused here.

Both files upload straight to R2 under `assets/`, served from the same custom domain as the
photo gallery, with width and height captured at upload so the case-study page reserves the
space and does not shift as images land. Neither passes through the photo pipeline: that
pipeline composites a watermark and extracts EXIF, and neither belongs on a screenshot.
