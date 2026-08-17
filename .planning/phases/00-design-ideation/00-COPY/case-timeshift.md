---
project: timeshift
tier: short
status: first-pass
awaiting: akhil-edit
badge: Maintained
---

# TimeShift

<!--
Short form per D-39. TimeShift has no .planning/ directory, no decisions table and no
register of options not taken, so the honest structure is a real problem, ONE decision that
is visible in the code, and an admitted gap where motivation and outcome belong.

Sources read this session: README.md, manifest.json, package.json, src/*.js, test/*.test.js.
Every number below was counted out of the repository during drafting rather than copied from
the README — see the provenance note under ## Decision, which corrects one stale README claim.
-->

## Problem

A time written on a web page is almost never written in the reader's timezone, and the
abbreviation sitting next to it is frequently not unique. CST is US Central in one email and
China Standard in the next. IST is India, Israel or Ireland. BST is either British Summer or
Bangladesh Standard. TimeShift's own data registers eight abbreviations as ambiguous, five of
which map to more than one candidate zone [source: `src/timezone-data.js`,
`AMBIGUOUS_ABBREVIATIONS`]. A converter that resolves an abbreviation to a single zone is
therefore wrong a predictable share of the time, and — the part that actually costs the reader
something — it gives no sign of which answers to distrust.

The surrounding text is the other half of the problem. Times arrive inside prose rather than
in a form field, carrying punctuation, ranges and bracketed regions that a strict parser
rejects outright: `12 PM (GMT-5:00) Eastern [US & Canada]`, `The ceremony begins at 7:00 PM
CET on March 20th`, and `14:00 - 15:30 CET` are all real supported cases
[source: `README.md`, Supported Formats]. TimeShift is a right-click on that text — select a
time as it was written, and read it back in your own zone.

## Decision

The resolver does not answer with a zone. It answers with a zone **and a confidence level**,
from a six-priority ladder that runs an explicit offset first, then a verbose zone name, then
a city or country match, then an unambiguous abbreviation, then an ambiguous one, and finally
the reader's own timezone as the floor [source: `src/timezone-resolver.js`, `resolveTimezone`].
Only the last two can be wrong, and both say so: an ambiguous abbreviation resolves through
context clues when the surrounding text supplies them and falls back to a declared default
when it does not, returning `medium` alongside a string that reads
`Assumed CST -> America/Chicago (ambiguous, no context clues)`. Nothing silently guesses.

What it cost is visible in the same file. Threading a confidence value through the return type
broke every existing call site, so the old string-returning contract had to be kept beside the
new one — `resolveTimezoneLegacy` still exists, and `resolveTimezone` opens by sniffing the
shape of its own argument to decide which of the two behaviours the caller wanted
[source: `src/timezone-resolver.js`, lines 20-24]. That is a runtime type check standing in for
a migration nobody finished, and it is the honest price of adding the confidence value without
a breaking release.

The ladder is what the tests are mostly about: 179 test cases across nine files
[source: `test/*.test.js`, counted this session], with the resolver and the end-to-end
integration path carrying the largest share.

<!--
Provenance correction, and a repeat of the pattern found in hued during plan 02: README.md
line 44 claims "65 tests". Counting `it(` declarations across test/*.test.js this session
gives 179, with no .skip/.todo/.only anywhere. The README is stale; the count above is the
shipped one. Recorded here rather than in the prose because a reader does not need the
correction, only the correct number. Do not re-source this figure from the README later.
-->

## Outcome

<!-- Searched and empty: README.md, docs/superpowers/plans and /specs (parser and UI design — what was
built and how, never why it began), PRIVACY_POLICY.md, manifest.json, package.json, all 59 commits. No
analytics ships and it contacts no endpoint, so usage counts exist only in the Chrome Web Store. -->
[NEEDS AKHIL] — why this was built, and what happened after it shipped.

TimeShift started with <the recurring situation that made converting times by hand a real
cost>, and the first version did only that one narrow thing before it grew to handle the
messier formats above. Since it went onto the Chrome Web Store it has reached about <n>
users, and the change that mattered most after launch was <what someone reported or asked
for>. The judgement worth stating plainly is <what Akhil would tell another engineer about it
now> — in particular whether the disambiguation ladder was the right place to spend the
effort, or whether <the alternative approach> would have paid off sooner for the same work.

## Assets

The hero is a capture of the right-click conversion happening on a real page, because that
single moment is the product and it needs no caption. It is **not in the repository** — the
Chrome Web Store listing is the source and it has to be captured rather than committed. The
one inline screenshot belongs under `## Decision`, showing the resolver reporting `medium`
confidence on an ambiguous abbreviation, which is the half of that decision easier shown than
described. The only image the repo carries today is `icons/icon512.png` [source: `icons/`],
which is the extension icon and cannot stand in for either.

Both files upload straight to R2 under `assets/`, served from the same custom domain as the
photo gallery, with width and height captured at upload so the case-study page reserves the
space and does not shift as images land. Neither passes through the photo pipeline: that
pipeline composites a watermark and extracts EXIF, and neither belongs on a screenshot.
