---
project: timeshift
tier: short
status: first-pass
awaiting: akhil-edit
badge: Maintained
---

# TimeShift

<!-- R-1 compression. Cuts and sources: 00-PUBLIC-DESIGN-NOTES.md, "Case-study compression". -->

## Problem

A time written on a web page is almost never written in the reader's timezone, and the
abbreviation sitting next to it is frequently not unique. CST is US Central in one email and
China Standard in the next. IST is India, Israel or Ireland. BST is either British Summer or
Bangladesh Standard. TimeShift's own data registers eight abbreviations as ambiguous, five of
which map to more than one candidate zone [source: `src/timezone-data.js`,
`AMBIGUOUS_ABBREVIATIONS`].

The surrounding text is the other half of the problem. Times arrive inside prose rather than in
a form field, carrying punctuation, ranges and bracketed regions that a strict parser rejects
outright: `12 PM (GMT-5:00) Eastern [US & Canada]` and `14:00 - 15:30 CET` are both real
supported cases [source: `README.md`, Supported Formats]. TimeShift is a right-click on that
text — select a time as it was written, and read it back in your own zone.

## Decisions

### The resolver answers with a confidence level, not just a zone

The resolver does not return a zone. It returns a zone **and a confidence level**, from a
six-priority ladder that runs an explicit offset first, then a verbose zone name, then a city
or country match, then an unambiguous abbreviation, then an ambiguous one, and finally the
reader's own timezone as the floor [source: `src/timezone-resolver.js`, `resolveTimezone`].
Only the last two can be wrong, and both say so: an ambiguous abbreviation resolves through
context clues when the surrounding text supplies them and falls back to a declared default when
it does not, returning `medium` alongside a string that reads
`Assumed CST -> America/Chicago (ambiguous, no context clues)`. Nothing silently guesses.

**The option not taken:** resolve every abbreviation to a single zone and return it plainly.
**What it would have cost:** the reader's ability to tell which answers to distrust. Eight
abbreviations are ambiguous by the app's own data, so a bare answer is confidently wrong a
predictable share of the time — and, on screen, indistinguishable from the ones that are right.

The price is visible in the same file. Threading a confidence value through the return type
broke every existing call site, so the old string-returning contract had to be kept beside the
new one — `resolveTimezoneLegacy` still exists, and `resolveTimezone` opens by sniffing the
shape of its own argument to decide which of the two behaviours the caller wanted
[source: `src/timezone-resolver.js`, lines 20-24]. That is a runtime type check standing in for
a migration nobody finished, and it is the honest price of adding the confidence value without
a breaking release.

The ladder is what the tests are mostly about: 179 test cases across nine files
[source: `test/*.test.js`, counted this session].

<!--
Provenance correction — do NOT re-source the test count from the README. README.md:44 claims
"65 tests". Counting `it(` declarations across test/*.test.js this session gives 179, with no
.skip/.todo/.only anywhere. The README is stale; the count above is the shipped one. Same
stale-README pattern recorded in case-hued.md and case-momentum.md.
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

Per D-41, a hero plus one inline shot. The hero is a capture of the right-click conversion
happening on a real page, because that single moment is the product and needs no caption; the
inline shot belongs under `## Decisions`, showing the resolver reporting `medium` confidence on
an ambiguous abbreviation, which is the half of that decision easier shown than described.
Neither is in the repository — the only image it carries is `icons/icon512.png`
[source: `icons/`], the extension icon — so both are captured from the live Chrome Web Store
listing. Per D-42 both go straight to R2 under `assets/`, sized at upload so nothing shifts —
not through the photo pipeline, which watermarks and reads EXIF.
