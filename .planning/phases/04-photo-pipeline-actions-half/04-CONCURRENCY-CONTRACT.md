---
phase: 04-photo-pipeline-actions-half
requirement: PIPE-05
criterion: 4
status: one side shipped (pipeline), one side owed (Phase 7 admin)
written: 2026-08-27
audience: whoever builds the Phase 7 admin publish path
---

# PIPE-05 — the concurrency contract

> Phase 4 builds **one** side of PIPE-05. The admin does not exist yet, so the other side is
> written down here rather than assumed, the way `02-DNS-R2-PREREQS.md` recorded Phase 2's
> provisioning evidence for later phases to read. Every claim below carries the file and line it
> came from.

---

## 1. What Phase 4 shipped

`scripts/lib/git-publish.mjs` — `publishManifest({ repoDir, branch, filePath, message, rederive,
retryLimit, committerName, committerEmail })`.

The Actions runner has a real checkout, so the pipeline publishes with **git**, and the guard is
the remote's own refusal to move a ref non-fast-forward. On a rejection it does **not** rebase: it
fetches, resets the local branch to the fetched tip, re-reads the manifest from that state, calls
the caller's `rederive` with the fetched content, and pushes the result. Bounded at
`PUBLISH_RETRY_LIMIT` (`src/lib/photo-pipeline.ts`, `3`, OD-7 A); exhaustion throws
`PublishConflictError` naming the branch, the remote head SHA and the attempt count.

**Why re-derive and not rebase** — pitfall P-5, `04-RESEARCH.md` §13. Every record carries `order`
and `categoryOrder`, both derived from the maxima in the manifest at build time. A `git rebase`
replays the diff "insert a record whose order is 40" onto a tip where 40 is already taken; the
textual merge often *succeeds* and produces two records at rank 40. Re-derive throws the commit
away and recomputes against the manifest that won.

**Measured, not asserted.** `test/pipeline/concurrent-push.node.test.ts` builds a real bare
repository, a real `humanClone` and a real `pipelineClone`, and lands a real foreign commit between
the pipeline's read and its push. Verbatim, from the green run:

```
[case 2] attempts=2 human=37c05705 tip=49a10489 predecessor-of-tip=37c05705
         ids=seed-1,seed-2,seed-3,human-first,pipeline-contended
```

The human's commit is proven present **by SHA reachability** (`git merge-base --is-ancestor`), not
by content — content could coincide. And when the branch moves under every attempt:

```
[case 5 iii] PublishConflictError: publish conflict: branch "main" moved under the pipeline on all
             3 attempt(s); remote head is now 22b877f2…. The pipeline pushed nothing.
[case 5 iii] origin authors=Akhil Saxena · ids=seed-1,seed-2,seed-3,human-race-1,human-race-2,human-race-3
```

Criterion 4 says one side *"retries or reports a conflict"*. Both branches are exercised above.

Two further guarantees the same suite establishes, because Phase 7 will share the file:

- **Never rebases, never forces, never stages more than one path.** Asserted at the **argv** level
  over every git invocation the module makes (110 captured in the green run, 0 forbidden), not by
  reading the source — the module is required to use `execFile` with an argv array, so its source
  reads `['reset', '--hard', ref]` and a source grep for `reset --hard` can never fire.
- **Bytes are preserved exactly.** `serialiseManifest` (`scripts/lib/photo-record.mjs`) is the one
  writer of manifest bytes; `publishManifest` re-serialises nothing, and refuses content that does
  not end in exactly one `\n`.

The pipeline is serialised **against itself** by `concurrency: { group: …, cancel-in-progress:
false }` in `.github/workflows/process-photos.yml` (04-08) — queue, do not cancel, for the reason
`deploy.yml` already gives beside its own copy of that setting. So the retry loop contends only
with humans.

---

## 2. What Phase 7 must do

The Worker has **no checkout**, so `git push` is not available to it. Its natural tool is the
GitHub Contents API, and the guard there is the **per-file blob SHA**.

- The admin publishes each `data/*.json` with `PUT /repos/{owner}/{repo}/contents/{path}` carrying
  `sha` — documented as *"the blob SHA of the file being replaced"*, required when updating, and
  **409 Conflict** on a mismatch.
- It surfaces that 409 to the user as a conflict, with the option to reload and re-apply. It does
  not retry silently and it does not overwrite.
- **It must never send `baseSha: "latest"`.**

### The evidence for that last line

| Claim | Where |
|---|---|
| The admin sent `baseSha: "latest"` | `legacy/nextjs-portfolio:src/components/admin/DeployButton.tsx:86` |
| Which bypassed the guard the route implements | `…:src/app/api/deploy/route.ts:93` — `if (baseSha !== "latest" && currentSha !== baseSha) { …409… }` |
| The route's own comment says so | `…/deploy/route.ts:89-92` — *"The current admin sends 'latest', which BYPASSES this guard and can silently clobber newer data"* |
| It is recorded as a project risk | `.planning/PROJECT.md:108` — *"Silent data loss — `DeployButton.tsx:86` hardcodes `baseSha: \"latest\"`, disabling…"* |
| And the root cause, with the fix | `.planning/PROJECT.md:122-126` — *"HEAD-comparison is **too strict** — the photo pipeline commits constantly, so it 409s unrelated edits. Someone hit that and disabled the guard. The fix is per-file **blob**-SHA comparison … not 'remember to pass a real SHA'."* |

**Read the root cause before reimplementing the guard.** HEAD-comparison did not fail because
somebody was careless; it failed because it is the wrong granularity. Phase 4 makes it worse on
purpose: the pipeline is a **third** writer to `main` and it commits every time a photo is
published. A Phase 7 admin that compares HEAD will 409 on every unrelated pipeline commit, someone
will disable it again, and this document will have achieved nothing.

There is a narrow last line of defence either way: the legacy route's final
`PATCH /repos/{owner}/{repo}/git/refs/{ref}` sends `force: false`, which GitHub documents as
*"make sure the update is a fast-forward update … Leaving this out or setting it to false will make
sure you're not overwriting work"*. The route mapped its **422** to a 409 response
(`…/deploy/route.ts:186` and `:192-199`). That is a backstop, not the guard: it catches a commit
landing between the ref read and the PATCH, and nothing else.

---

## 3. Why the two mechanisms differ, deliberately

| | Pipeline (Phase 4) | Admin (Phase 7) |
|---|---|---|
| Environment | Actions runner, real checkout | Cloudflare Worker, no filesystem |
| Tool | `git push` | `PUT /contents/{path}` |
| Guard | the remote's fast-forward check | the per-file blob SHA → 409 |
| On conflict | fetch, re-derive, retry (bounded, 3) | surface the conflict to the human |
| Recovery owner | the machine — ranks can be recomputed | the human — edits cannot be recomputed |

This asymmetry is the point, not an inconsistency. Both refuse to overwrite work; neither needs the
other's mechanism. The pipeline retries automatically because a photo record can be *rebuilt*
against new maxima with no information lost. An admin save cannot: the human typed it, so the
human decides.

---

## 4. What PIPE-05 is still missing after Phase 4

Do not read this document as a completed requirement.

1. **Admin ↔ pipeline is untested end to end.** Phase 4 proves a foreign *git* commit survives.
   Nothing yet proves a Contents-API write and a pipeline push interleave correctly, because one
   of the two does not exist.
2. **Admin ↔ admin is not covered at all.** Two browser tabs, or two devices, saving the same
   `data/*.json`. Blob-SHA comparison should handle it; nothing has demonstrated it.
3. **Conflicts on files the pipeline does not touch** (`resume.json`, `home_config.json`,
   `site_config.json`) are entirely Phase 7's problem. The pipeline only ever writes
   `data/portfolio_images.json`.
4. **`publishManifest` validates bytes, never semantics.** Measured in case 5(ii): a `rederive`
   that returns the stale manifest — two records at the same `order` — **is committed and pushed**.
   The layer that catches that is the `rederive` callback itself, which is why 04-09 step 9 runs
   `astro sync` *inside* the retry loop. Any future caller of `publishManifest` inherits that
   obligation.

---

## 5. The one-line test Phase 7 can run against its own side

Phrased as an expectation, not a description. With the admin running and a real repository:

```
Given `data/portfolio_images.json` at blob SHA <B>, and a commit landing on `main` that changes
that file after the admin loaded it, a `PUT /contents/data/portfolio_images.json` carrying `sha:
<B>` MUST return 409 and MUST NOT change the file — and the same request carrying the CURRENT blob
SHA MUST return 200.
```

Both halves are required. The 200 half is what stops the check being satisfied by an admin that
409s everything, and the 409 half is what `baseSha: "latest"` removed.

The pipeline's equivalent, runnable today:

```bash
npx vitest run --project integration test/pipeline/concurrent-push.node.test.ts
```
