# stub-theme-pkg

A throwaway fixture. It exists to answer exactly one question with a build rather than an
assertion:

> Does the `exports` map shape D-35 proposes make
> `@akhil-saxena/design-system/themes/charcoal.css` — that exact string, extension and all —
> resolve?

## Why a stub instead of just editing the design system

`../design-system` is not throwaway. Phase 0 has no authority to change it; extending its
`exports` map, its `files` field and `scripts/postbuild.mjs` is Phase 1's work, in a repo
with its own tests and release process. But leaving the packaging shape *unverified* until
Phase 1 is how a spec ships wrong. So the shape is proven here, against a package that
carries nothing but the map, and Phase 1 inherits a tested spec instead of a proposal.

This is the same prototype-here / spec-the-packaging-separately pattern the phase uses
everywhere else, and the plan's acceptance criteria assert that `../design-system` is
untouched, so an accidental edit fails the task rather than shipping.

## The map being tested

```json
"./themes/*.css": { "style": "./themes/*.css", "default": "./themes/*.css" },
"./fonts/*.css":  { "style": "./fonts/*.css",  "default": "./fonts/*.css"  }
```

The real proposal maps to `./dist/themes/*.css` and `./dist/fonts/*.css`, because the design
system's `files` field is `["dist", "README.md", "LICENSE"]` and published CSS therefore has
to land in `dist/`. This stub has no build step, so its CSS lives at `themes/` and `fonts/`
directly and the targets point there. **The part under test is the wildcard spelling on the
left, not the directory on the right** — a subpath pattern and its target are substituted
independently, so the directory depth of the target is irrelevant to whether the pattern
matches.

## The bit that matters: `*.css`, not `*`

Spelling the wildcard **with** the extension is the whole point.

| Pattern spelled | Consumer writes | `*` captures | Resolves to |
|---|---|---|---|
| `./themes/*.css` | `…/themes/charcoal.css` | `charcoal` | `themes/charcoal.css` ✅ |
| `./themes/*` | `…/themes/charcoal.css` | `charcoal.css` | `themes/charcoal.css.css` ❌ |

The second row is not hypothetical — it is the live defect in the design system's existing
`"./css/*"` entry, filed as **G-12**, where `…/css/base.css` expands to `dist/css/base.css.css`
and fails the build. The proposed `themes` and `fonts` entries are spelled to avoid inheriting
that trap, and D-35's specifier string carries a `.css` extension precisely because a theme
file is something a consumer thinks of as a stylesheet, not as a bare module.

## `sideEffects`

`"sideEffects": ["*.css"]` is copied verbatim from the real package rather than invented. It
bears on the DS-09 measurement (G-15), where flipping it to `false` was one of three
configuration fixes attempted during research and produced byte-identical output — so the
field's value is a recorded data point and the stub must not quietly differ from it.

## Contents

Two near-empty stylesheets, no JavaScript, and no lifecycle script of any kind. Installing
this executes nothing.

It is deleted with the playground at phase exit.
