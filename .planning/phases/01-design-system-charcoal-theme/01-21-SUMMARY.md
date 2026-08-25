# 01-21 — Publish `@akhil-saxena/design-system@2.0.0-beta.1`

**Status:** COMPLETE. Published 2026-08-25 from `charcoal-theme@da88f7f` via GitHub Actions
trusted publishing. `next` → `2.0.0-beta.1`; `latest` unmoved at `1.11.4`.

## The publish route, and the two days lost to getting it wrong

The plan assumed a laptop `npm publish` with a token. That assumption was wrong, and the
correction is the most reusable thing this plan produced.

The account runs **`two-factor auth: auth-and-writes`**. Under that mode an npm **Publish**
token authenticates but cannot complete a write — `npm whoami` succeeds, `npm access` reports
`read-write`, and the publish still dies on `EOTP`. All three tokens on the account are
Publish-type. None has ever published this package.

Every 1.11.x release was made by **GitHub Actions via trusted publishing (OIDC)**:

```
_npmUser: {"name":"GitHub Actions","email":"npm-oidc-no-reply@github.com",
           "trustedPublisher":{"id":"github",...}}
```

GitHub mints a short-lived OIDC credential, npm verifies the signature, and that satisfies
`auth-and-writes` because the identity is cryptographically proven rather than asserted by a
bearer secret. **The tag push is the publish button; there is no local publish path.**

Rejected: minting an Automation token. It would work, but it trades a provenance-attested
publish for an unattested one and adds a long-lived secret — the opposite of where npm has
been driving since the 2025 supply-chain attacks.

## The workflow bug this release would have tripped

`publish.yaml` ran bare `npm publish`. **npm applies `latest` unconditionally — it does not
inspect the version for a prerelease suffix.** Pushing `v2.0.0-beta.1` against the previous
workflow would have moved `latest` from `1.11.4` to the beta, making it the default install
for every bare `npm i`.

Fixed in `da88f7f`: derive the dist-tag from `package.json` (`*-*` → `next`, else `latest`),
and assert the git tag matches `package.json`. Proven across five cases before the tag was cut:

| version @ ref | resolves to |
|---|---|
| `2.0.0-beta.1` @ tag `v2.0.0-beta.1` | `next` |
| `2.0.0` @ tag `v2.0.0` | `latest` |
| `1.11.4` @ tag `v1.11.4` | `latest` |
| `2.0.0-rc.3` @ `workflow_dispatch` | `next` |
| **planted:** `2.0.0` @ tag `v2.0.0-beta.1` | **BLOCKED** |

The planted case is the gate proving itself — the discipline this phase adopted after
twenty-five consecutive plans shipped gates that could not fail.

## Verified from the registry, not from the local pack

| Check | Result |
|---|---|
| `dist-tags.latest` | `1.11.4` — **unmoved** |
| `dist-tags.next` | `2.0.0-beta.1` |
| publisher | `npm-oidc-no-reply@github.com` |
| provenance | **YES** — SLSA v1 attestation |
| shasum | `8ef366462bb4b0d17e4b0765186568cc44272c14` |
| file count | 562 |

**The shasum is byte-identical to the locally packed tarball.** CI checked out `da88f7f`, ran
`npm ci` into a cold tree, rebuilt from source, and produced the same bytes. The build is
reproducible — a stronger guarantee than the dry-run shasum comparison the plan called for.

Clean-room install of `@next` into an empty project then confirmed, against the *registry*
artifact rather than the working tree:

- `dist/themes/` ships **`monochrome.css` only**; **zero** occurrences of `charcoal` anywhere
  in `dist` — the rename is complete in the published artifact, not just in source
- `--amber: var(--ink)` survives as an **alias** at both line 251 (light) and 476 (dark).
  This is the token that kept getting silently re-inlined as a literal across four separate
  occasions this phase; the published file is the first end-to-end proof it held
- `dist/tokens.css` carries **zero `@font-face`** — fonts stay opt-in via the subpath
- every subpath the README Quick Start documents resolves: `./fonts/default.css`,
  `./themes/monochrome.css`, `./tokens.css`
- ESM root import loads, **102 exports**. `Toast` is correctly absent as a component name —
  it surfaces as `ToastProvider` + `useToast`. The overflow fix shipped verbatim:
  `const live = prev.reduce((n, t) => t.dismissing ? n : n + 1, 0)`
- ADR-002's load-bearing components all present: `InlineEdit`, `InlineEditField`,
  `InlineAddRow`, `TypeToConfirm`, `ConfirmDialog`, `AlertBanner`

`require.resolve` on the root specifier fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. This is
correct, not a defect: the package is `"type": "module"` and `exports["."]` declares only
`import`. Recorded because it will look like a bug to whoever hits it first.

## What this unblocks

The portfolio can consume `2.0.0-beta.1` **from the registry**, retiring the
`npm pack` → `file:*.tgz` workflow and the duplicate-React "invalid hook call" hazard that
forced it. The CI gate that fails the build when the dependency spec starts with `file:`
becomes satisfiable now rather than at cutover.

## Carried forward

- **`v2.0.0-beta.1` is a public tag on a non-`main` branch.** The provenance attestation
  points at `charcoal-theme`. Fine for a beta; `2.0.0` proper should ship from `main`.
- Deviation from plan: the tag was pushed, not kept local-only. That instruction existed
  solely because `publish.yaml` was unsafe. Fixing the workflow dissolved the reason.
- Open findings unchanged: F-10 (`scheduleRemoval` impure), README component count
  (claims 81, headings sum 80, 83 ship).
- DS-02 / DS-03 still need rewording — DS-02's figure moved 3.11 → 18.07 and may now be
  satisfiable as written.
