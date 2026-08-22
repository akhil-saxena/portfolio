## Discovered during 01-17 — out of scope, not fixed

### `Data Display/Tabs › DarkMode` fails `test:a11y` on colour contrast

`npm run test:a11y` is **not clean on this tree**, and it is not this plan's doing.
One suite fails: `src/data-display/Tabs/Tabs.stories.tsx`, story `DarkMode`,
`color-contrast` (serious), 2 nodes — the two inactive tab labels:

```
["#_r_7_-tab-analytics > .ds-atom-tabs-label"]  <span class="ds-atom-tabs-label">Analytics</span>
["#_r_7_-tab-settings  > .ds-atom-tabs-label"]  <span class="ds-atom-tabs-label">Settings</span>
```

**Provenance.** `Tabs.stories.tsx` was last modified by `380d979`
(01-19.1, "request dark from the theme global, not a per-story wrapper"). That
conversion is correct and deliberate — but it is also the change 01-19.1 recorded as
"the page darkens, and 72 baselines move". A `DarkMode` story that used to render a
dark island **on a light page** now renders a dark page, and the inactive-label ink
that cleared AA against the light page background does not clear it against the dark
one. So this is the a11y-shaped half of a consequence 01-19.1 measured and accepted
for the visual baselines, surfacing in a gate it did not re-run.

**Why 01-17 did not fix it.** Nothing in Tabs imports anything this plan touched
(`grep -c 'RichText|segments|codeBlockExtension'` = 0 in both Tabs files), and the
plan's scope boundary forbids fixing a pre-existing failure in an unrelated file.
Fixing it means choosing a token, which is a charcoal/dark-ramp decision.

**Where it belongs.** 01-20, alongside the 72 moving baselines — the same cause, and
the reviewer is already going to be looking at converted dark stories. If the inactive
label needs a lighter ink under `.dark`, that is one token change plus the baseline.

**Reproduce:** `npm run test:a11y`; expect `Tests: 1 failed, 507 passed, 508 total`.
`src/interaction/RichText/RichText.stories.tsx` PASSes all 18 stories.
