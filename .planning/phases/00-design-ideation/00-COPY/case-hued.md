---
project: hued
tier: short
status: first-pass
awaiting: akhil-edit
badge: Maintained
---

# hued

<!-- R-1 compression. Cuts and sources: 00-PUBLIC-DESIGN-NOTES.md, "Case-study compression". -->

## Problem

Every photo carries colour, and nobody ever looks at it. A gallery is organised by date and
searched by subject, so the one dimension that tracks how a stretch of life actually felt —
muted greys through a quiet winter, warm amber through evenings indoors — sits in the data and
never reaches the interface. hued's README calls that a design problem before a processing one
and puts the consequence in a single line: the palette strip *is* the interface
[source: `README.md`, §Design].

Framing it that way makes privacy structural rather than a setting. A palette is only honest
if it is computed from the whole gallery, and a whole gallery is not something to upload — so
hued does not have the capability at all. It declares no internet permission, and the manifest
strips the network-state permission its own dependencies pull in, carrying the reason inline:
*"hued has no network features"* [source: `app/src/main/AndroidManifest.xml`,
`tools:node="remove"`]. The photos cannot leave, because there is no route out.

## Decisions

### Colours merge by perceptual distance, not by RGB

Dominant colours come out of the Android Palette API per photo, which is the easy half. The
decision is what happens next: colours are merged by **perceptual distance in CIELAB**.
`ColorAggregator` converts each hex to Lab, walks them in frequency-descending order, and folds
each into the nearest existing cluster when the Euclidean ΔE falls under a fixed
`MERGE_THRESHOLD` of `15.0`; anything further away starts a cluster of its own
[source: `app/src/main/java/app/hued/processing/ColorAggregator.kt`,
`clusterByPerceptualDistance`]. That same distance then does the naming, matching each final
colour against the 31,898 entries in the shipped colour-name table
[source: `app/src/main/res/raw/color_names.json`, counted this session].

**The option not taken:** merge in RGB, which is what the pixel values already are.
**What it would have cost:** the strip's only claim. RGB proximity does not track human vision,
so the same threshold would collapse shades a person reads as distinct and split ones they read
as identical — a palette that is arithmetically defensible and visibly wrong.

The price paid instead is that the clustering is greedy and single-pass, not k-means. Clusters
seed in frequency order, so the most common colour becomes the representative and absorbs its
neighbours rather than drifting to a centroid: the strip reports dominance rather than a
balanced partition of the colour space, and one hardcoded constant decides how many distinct
colours a month is allowed to show. The merge deliberately keeps the *earliest* timestamp
across every colour it absorbs, which is what lets the finished strip run chronologically
instead of by weight.

Beyond this one, hued's decisions are not recoverable. Nineteen commits is a thin record, and
none of them argue with an alternative.

<!--
Provenance correction — do NOT re-source the colour-name count from README.md. README.md:14
claims "18,000+" and publishing/play-store-listing.md:31 claims "31,000+". Loading the shipped
app/src/main/res/raw/color_names.json this session gives 31,898 entries. The store listing is
approximately right, the README is stale, the JSON is authoritative. Same stale-README pattern
recorded in case-timeshift.md and case-momentum.md.
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

Per D-41, a hero plus one inline shot. The hero is `publishing/feature-graphic.png`
[source: `publishing/`], which already composes the palette strip as its entire subject and so
states the idea without a caption; the inline shot belongs under `## Decisions` —
`publishing/screenshots/final/01.png`, the launch state, showing a real clustered palette,
which is the output that decision is about. Per D-42 both go straight to R2 under `assets/`,
sized at upload so nothing shifts — not through the photo pipeline, which watermarks and
reads EXIF.
