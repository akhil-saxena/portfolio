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

## 04-09 · `classifyPushFailure` does not recognise a lost ref lock as a conflict

**Found:** 2026-08-28, building case 6b of `test/pipeline/partial-failure.node.test.ts`.

There are TWO ways a concurrent writer can beat the pipeline to `main`, and `git` reports them
differently depending on WHEN the rival lands:

- **Before the push starts** — git refuses locally with `! [rejected] … (fetch first)` and
  `Updates were rejected because …`. `classifyPushFailure` returns `conflict`, the re-derive loop
  runs, and the job exits 8 after exhausting `PUBLISH_RETRY_LIMIT`. Correct, and case 6 proves it.
- **During the push** — git has already computed the ref's expected old value, so the remote
  answers with a failed compare-and-swap:

  ```
  remote: error: cannot lock ref 'refs/heads/main': is at <new> but expected <old>
  ! [remote rejected] HEAD -> main (failed to update ref)
  ```

  `CONFLICT_REASONS` in `scripts/lib/git-publish.mjs` matches
  `non-fast-forward|fetch first|stale info`, and `updates were rejected because` is absent too, so
  this classifies as `other` and the job exits **9 without retrying** — even though a re-derive is
  exactly what would fix it.

**Not a data-integrity problem, which is why it is deferred rather than fixed here.** The outcome
is the safe one: nothing is committed, the four variants are orphan bytes, the staged object is
unspent, and a re-dispatch repairs the run. It is a lost retry, not a lost record.

**Not fixed by 04-09** because `git-publish.mjs` is 04-06's module and conflict classification is
its central decision — widening it is a semantic change to a shipped, tested module, and 04-06's
own header argues at length for matching the REASON rather than the `! [rejected]` marker (a
rejection can also mean "refusing to update checked out branch", which a re-derive cannot fix).
Any fix must keep that distinction.

**Suggested fix:** add `cannot lock ref` **together with** `is at .* but expected` to
`CONFLICT_REASONS` — the pair is specific to a lost compare-and-swap and cannot match the
checked-out-branch or tag-clobber rejections. `test/pipeline/partial-failure.node.test.ts` case 6b
pins the current behaviour and will go red, by name, the moment this is changed.

## 04-09 · `scripts/lib/dispatch-input.mjs` holds two raw NUL bytes, so `grep` skips it silently

**Found:** 2026-08-28, while reading 04-08's validator.

Line 284 joins two arrays on a NUL separator, and the NUL is written as a **raw byte in the
source** rather than as a `\u0000` escape. Two of them, so the file is not text:

```
$ file scripts/lib/dispatch-input.mjs
scripts/lib/dispatch-input.mjs: data
$ grep -c export scripts/lib/dispatch-input.mjs      # exit 1, NO OUTPUT
$ grep -a -c export scripts/lib/dispatch-input.mjs   # 9
```

The separator choice is sound — a NUL cannot appear in an input name — but the encoding makes the
file **invisible to every `grep`-based control in this repository**, and invisibly so: `grep`
prints nothing and exits 1, which is byte-for-byte what a clean file looks like. This is the third
appearance of that shape in this phase, after the two `! grep` guards that pass on a missing file
(`04-VALIDATION.md` hazard 20).

**Not a live risk today:** 04-08's contract test reads the file with `readFileSync`, not `grep`, so
its source assertions still run. The risk is the next gate that greps `scripts/lib/*.mjs` and
reports a clean pass over a file it never read.

**And it is contagious, which is the part worth recording.** Writing this very entry pasted the
raw byte into `deferred-items.md`, which turned THIS file binary: `grep -n '^## '` returned
nothing and exited 1, i.e. reported no headings in a file with six. Two NULs were stripped and the
file is `UTF-8 text` again. A byte that makes a file invisible to `grep` propagates through any
copy-paste of the code that contains it.

**Suggested fix:** write the separator as the escape `\u0000` instead of the raw byte. One
character class of source, no behaviour change, and the file becomes text again. Verify with
`file scripts/lib/dispatch-input.mjs` reporting `ASCII text` and `grep -c export` returning 9.

## 04-09 · `wrangler` is now a RUNTIME dependency of the Actions pipeline, not just a deploy tool

**Found:** 2026-08-28, wiring `scripts/lib/r2.mjs` under OD-5 B.

`scripts/lib/r2.mjs` spawns `node node_modules/wrangler/bin/wrangler.js` for every R2 get, put and
delete, so `wrangler` is required for the photo workflow to do its job at all. It is declared in
`devDependencies`, which is correct today — `process-photos.yml` runs a plain `npm ci`, and that
installs devDependencies.

**The hazard is a future edit to the workflow.** Anyone who "optimises" that step to
`npm ci --omit=dev` (a reasonable-looking change for a job that does not build the site) removes
the binary the pipeline shells out to, and the failure surfaces at step 2 as "the staged object
could not be read" rather than as a missing dependency.

**Not fixed here** because it is not currently wrong. **Whoever next owns `package.json`** should
decide deliberately whether `wrangler` moves to `dependencies` and, either way, leave the reason in
a comment. Suggested alongside the two entries above (`yaml` undeclared, `engines.node`
understated) — three edits, one file, one review.

## 04-10 · `deploy.yml` cannot run the suite it runs, because it checks out a DETACHED SHA

**Found:** 2026-08-28, by 04-10's live run — the first time anything downstream of a pipeline
commit was actually exercised.

**Deploy has been failing since `5f8a451` (2026-08-28 03:06). It last succeeded on `36ce34a`,
2026-08-27 15:25.** Every failure since is the same:

```
process-photo: push to "main" failed … git exit 1: fatal: couldn't find remote ref main
Error: Command failed: git rev-parse main
fatal: ambiguous argument 'main': unknown revision or path not in the working tree.
  ❯ git      test/pipeline/partial-failure.node.test.ts:148:10
  ❯ tipOf    test/pipeline/partial-failure.node.test.ts:165:45
```

**The mechanism.** `deploy.yml` pins `ref: ${{ github.event.workflow_run.head_sha }}` — deliberately,
so that "the thing that was tested is the thing that ships" is true rather than usually true. A
checkout by SHA is a **detached HEAD with no local `main` branch**. `npm run deploy` then runs
`npm test`, and `test/pipeline/partial-failure.node.test.ts` builds its sandbox by cloning the
checkout: the clone inherits no `main`, so `git rev-parse main` and `git push … main` both fail.

CI does not hit this because `actions/checkout` on a `push` event checks out the branch, so `main`
exists locally. **The suite is green in CI and red in Deploy on the identical commit** — which is
why nothing caught it until a pipeline commit needed to deploy.

**Not fixed here.** It is a pre-existing failure in a file this plan does not own, its cause is
`deploy.yml` × 04-09's sandbox, and 04-10 had already spent its one in-scope repair on the census
assertion the fortieth photograph broke. Working around it would also mean touching the one
workflow whose header says its pinning must not be loosened.

**The consequence, stated plainly: `wildlife-gentlegiants` is committed to `main` and its four
variants are live in R2, but the site build that would show it has not shipped.** Criterion 5
("the CDN serves the new bytes") is therefore not closed by 04-10.

**Three candidate fixes, for whoever owns this next — the first is probably right:**

1. **Give the sandbox its own branch name rather than assuming `main`.** `partial-failure`'s
   sandbox already creates a bare origin and clones it; have it create and push an explicit branch
   (or read `PUBLISH_BRANCH` and `git checkout -B` it in the clone) instead of relying on the
   ambient checkout having one. Fixes the test in every checkout shape, changes no workflow.
2. Have `deploy.yml` create a local branch at the pinned SHA (`git checkout -B main <sha>` after
   checkout). Cheap, but it makes a test's requirement a property of the deploy job.
3. Stop running the full suite in `npm run deploy` and rely on the CI gate that already ran.
   Reduces what the deploy proves; the `deploy.yml` header's reasoning argues against it.
