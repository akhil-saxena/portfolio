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
