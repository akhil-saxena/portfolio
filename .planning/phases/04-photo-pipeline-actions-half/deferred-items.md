# Deferred items — Phase 4

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

## 04-06 · `package.json` `engines.node` understates the real floor

**Found:** 2026-08-27, while wiring `scripts/lib/git-publish.mjs`.

`scripts/lib/git-publish.mjs:127` and `scripts/lib/photo-record.mjs:112` both import
`../../src/lib/photo-pipeline.ts` **with the `.ts` extension**, which requires Node's unflagged
TypeScript type stripping. That is documented as landing in **Node 22.18.0**; `package.json` says
`"engines": { "node": ">=22.12.0" }`.

**Not a live risk.** `.nvmrc` pins `22.22.3`, and `ci.yml`, `deploy.yml` and `process-photos.yml`
all use `node-version-file: .nvmrc`, so CI and the Actions runner are above the real floor. The
hazard is a contributor on 22.12–22.17, who would get `ERR_UNKNOWN_FILE_EXTENSION` on every
pipeline script rather than a message about their Node version.

**Not fixed by 04-06** because `package.json` belongs to 04-04, which was executing concurrently.
Suggested fix: raise `engines.node` to `>=22.18.0` (or to `.nvmrc`'s `22.22.3`) and say why in a
comment — the floor is a language-feature floor, not a preference.

## 04-07 · `package.json` — `yaml` is still undeclared

**Found:** 2026-08-27, re-confirming `04-VALIDATION.md` hazard 12 while checking what 04-07 needed.

04-07 installed nothing (`sharp` and `exif-reader` were added by 04-04 behind the Package
Legitimacy Gate), so it did not open `package.json`. The hazard is unchanged and still unowned:
`require('yaml')` resolves at 2.9.0 today as a transitive dependency, nothing declares it, and a
lockfile refresh could remove it and break 04-08's workflow-contract test.

**Suggested fix, together with the `engines.node` entry above:** declare `yaml` as a
devDependency at the version currently resolved, and raise `engines.node` to `>=22.18.0`.

## 04-07 · The numeric-literal guard passes on a missing file

**Found:** 2026-08-27, while proving 04-07's own gates able to fail.

`04-07-PLAN.md`'s `<done>` block has two greps. The OD-9 one was repaired (B7) to
`test -f PATH && ! grep -nE "^[^*/]*['\"`]private/" PATH`, and the `test -f` prefix is what makes
it FAIL when the file is absent. **The numeric-literal guard beside it never got the same repair**
and reads as a bare

```
grep -nE '(maxWidth|width|height|quality)\s*[:=]\s*[0-9]' scripts/lib/photo-derive.mjs
```

whose "returns nothing" success condition is satisfied by a file that does not exist — measured:
`grep` exits 2 and prints nothing, which is indistinguishable from a clean file.

**Not a live risk for 04-07** (the module exists and the load-bearing check is the decoded-width
assertion, not the grep), and not fixed here because the text lives in a plan file rather than in
code. **Whoever lifts either grep into an automated verify block or a gate script must use the
`test -f` form for BOTH.** The correct shape is:

```
test -f PATH && ! grep -nE '(maxWidth|width|height|quality)\s*[:=]\s*[0-9]' PATH
```
