# 05-06 — the public shell

**Status:** COMPLETE. Four commits. **The executor stalled twice on a stream watchdog after its last
control; I verified its uncommitted work, finished the plan and wrote this summary.** Everything
below that says "measured" was either measured by the executor and recorded in a commit message, or
re-measured by me — each is marked.

| commit | what |
|---|---|
| `78961dd` | `PublicLayout.astro`, `public-shell.css`, `PublicNav.tsx` — the shell, the ladder, and a flex column that needs no `--ds-appbar-h` |
| `c5796dc` | the one inline script — no flash, print mode, the toggle |
| `065a64f` | `<Seo>`, `site-meta.ts`, `assert-gutter-ladder.mjs`, `shell.unit.test.ts` |

## §6.2 cannot work as written, and this was proven in a browser

The UI-SPEC says the `--ds-appbar-h` finding is *"closed upstream — do not re-measure."* **It is not
closed.** The property is declared on `.ds-atom-appbar`, and custom properties inherit to
**descendants, not siblings** — so a full-viewport section placed under the bar, which is precisely
the consumer use case the property's own comment describes, structurally cannot read it.

**Measured by the executor in Chromium** (recorded in `78961dd`): the sibling computes
`min-height: auto`, while the identical declaration *inside* the bar computes **853px** fine and
**775px** coarse.

The shell therefore uses a **flex column**, which needs no constant and is correct on both pointer
types. That is a better answer than the variable would have been even if it worked, because it cannot
drift when the bar's height changes.

**Upstream finding for `2.0.0-beta.2`:** either move the declaration to a scope a consumer can reach,
or amend the comment to stop promising a use case the cascade forbids.

## The gutter gate, and why it reads the artefact

The ladder has **one definition in TypeScript and one in CSS, and they cannot import each other.**
`scripts/assert-gutter-ladder.mjs` reads the **built** stylesheet and compares every rung's token and
pixel value against `layout-ladder.ts`.

This matters more than it looks: `sizesFor` composes the gutter terms into every gallery image's
`sizes` attribute, so a divergence downloads the wrong variant of all 40 photographs **with no visual
symptom at all**.

**Proven able to fail** — re-verified by me. Against a build carrying `--space-12` at the 673px rung
where the ladder says `--space-8`, it exits 1 and names the rung, both values, and the file each came
from. Against a correct build it exits 0 and prints all four rungs plus the four page maxima.

**It refuses to pass on nothing, and explains its own expected red:**

```
assert-gutter-ladder: no .css file anywhere under dist/client.
  This run read nothing and cannot pass.
  IS THIS THE EXPECTED RED? Astro emits a stylesheet only for CSS that some ROUTE imports…
  Until a page under src/pages/ uses that layout (plans 05-07 through 05-11), the ladder does
  not reach dist/ at all and this refusal is correct.
```

That is the right shape for a gate whose input does not exist yet: it fails, and it tells the reader
which red this is. **It is deliberately NOT chained into `gate:content`** — wiring it before a route
consumes the layout would make `npm run build` red for all of wave 4. **05-07 or 05-14 must wire it**
once the first real route lands; until then it is a standalone script.

## One hour lost to a stale artefact

The gate reported a genuine-looking disagreement — `--space-12` at the 673px rung — while
`src/styles/public-shell.css` was **clean per git** and correct on inspection (673px → `--space-8`,
1024px → `--space-12`, matching the ladder exactly).

The plant was in `dist/`, not the source. The executor had planted it, built, then stalled mid-control
leaving the built artefact behind. `rm -rf dist && npm run build` cleared it and both the build and the
gate returned 0.

**This is the "a red build leaves the previous `dist/` on disk" hazard in a new costume** — arriving
through a gate that reads the *artefact* rather than the source, where a stale build is
indistinguishable from a real defect. Any artefact-reading gate needs its input rebuilt before its
verdict is believed.

## The probe route

`src/pages/probe-seo.astro` — deliberately **without** a leading underscore, after 05-05 measured that
`__probe-variants.astro` was unroutable and emitted nothing while the build exited 0. It is the only
page that used `PublicLayout`, so it was the only way to get the shell's CSS and `<Seo>`'s tags into
`dist/` while this plan ran.

Deleted, and **the absence assertion was proven able to fail** — I planted the file back, confirmed the
assertion fires, and removed it again.

## Verification

`npx vitest run --project unit` → **1184/1184 across 26 files**. `shell.unit.test.ts` 48/48.
`npm run build` exit 0 with the probe present; `assert-gutter-ladder.mjs` exit 0 against that build.
Tree clean.

## Carried forward

- **Wire `assert-gutter-ladder.mjs` into `gate:content`** once a route consumes `PublicLayout` —
  05-07 is the first, 05-14 owns the wiring.
- **Builds have become slow** since the design system landed: a clean `rm -rf dist && npm run build`
  exceeded **10 minutes** twice. Not a defect, but wave 4's five plans each run builds in their
  verifies, and that is now the dominant cost.
- The inline-script budget checks the plan specified **cannot fire** — `compressHTML` defaults true, so
  the built document is 4 lines and a line-count gate is structurally 0. 05-14's assertion 2 is the
  real net. Not repaired here; recorded so it is not mistaken for coverage.
