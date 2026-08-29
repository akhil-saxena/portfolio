/**
 * The blanket Access guard over every protected prefix.
 *
 * ## Why a middleware at all, when three routes already call `requireAccess` themselves
 *
 * Because of the routes nobody has written yet. Decision D-05 puts five admin sub-routes
 * (home, photos, resume, projects, site — all under the admin path) in Phase 7, and
 * requirement AUTH-01 covers the API and Actions prefixes as prefixes rather than as the
 * two files that happen to exist today. A per-route guard protects what its
 * author remembered; a prefix guard protects what nobody has thought of yet. The per-route
 * `requireAccess()` calls that remain are defence in depth, not a substitute — and the
 * reverse is also true, which is what plan 02-07's Control C measures.
 *
 * ## The build-time trap, which is the reason for the first statement below
 *
 * Astro middleware runs during `astro build` for every prerendered page. A guard that
 * denied unauthenticated requests without checking `isPrerendered` first would therefore
 * execute against the public site at build time, when there is no Access JWT and no
 * request to have one — turning the homepage into a 401 baked into static HTML, or failing
 * the build outright. `test/auth/deny-unauthenticated.node.test.ts` catches it
 * behaviourally (`GET /` must be 200 and contain `home-render-ok`), and a passing
 * `astro build` is the other half of that evidence. (threat T-02-35)
 *
 * That marker was `stack-proof-ok` until plan 05-11 replaced the Phase 2 scaffold with the
 * real Home. It is now the `data-home-marker` attribute on Home's `<h1>`, defined in
 * `src/pages/index.astro`; the contract it stands for — a prerendered public route reaching
 * the reader intact — is unchanged, and both suites moved in the same commit as the deletion.
 *
 * ## Why the prefix list is a copy of `run_worker_first`
 *
 * `wrangler.jsonc` sets `assets.run_worker_first` to exactly the four patterns in the
 * constant below — that is the half of the defence that stops Cloudflare Static Assets
 * serving a matching file BEFORE the Worker runs, with no auth code executing at all. This file is the half that refuses the request once the
 * Worker does run. Two halves of one defence that can drift apart are worse than one half,
 * so the list below is the same four patterns verbatim, and the matcher derives its
 * behaviour from them rather than restating it. If one list changes, the other must.
 *
 * Every protected prefix appears in this file EXACTLY ONCE, in that constant and nowhere
 * in prose. That is not tidiness: plan 02-07's verify greps this file for each prefix, and
 * a prefix transcribed into a comment would keep that grep green after the constant lost
 * it — measured, by deleting the Actions pattern and watching the grep still pass. The
 * same vacuity is what plan 02-05 hit with `defineWorkersConfig`.
 */
import { defineMiddleware } from 'astro:middleware';
import { requireAccess } from '@/lib/access';

/**
 * Verbatim from `wrangler.jsonc` → `assets.run_worker_first`. Cloudflare's documented
 * shapes are `/segment` (exact) and `/segment/*` (prefix); the admin path appears as both
 * because an unmatched wildcard pattern fails OPEN silently, and that is the one failure
 * mode not worth guessing at.
 */
const RUN_WORKER_FIRST_PATTERNS = ['/admin', '/admin/*', '/api/*', '/_actions/*'] as const;

/** Applies Cloudflare's two pattern shapes to a pathname. */
function isProtected(pathname: string): boolean {
  for (const pattern of RUN_WORKER_FIRST_PATTERNS) {
    if (pattern.endsWith('/*')) {
      // A wildcard pattern protects its own directory and everything under it. Dropping
      // only the star (rather than the slash-star) keeps the separator, so a sibling path
      // that merely shares a name prefix — `/apifoo` against the API pattern — is not
      // matched.
      if (pathname.startsWith(pattern.slice(0, -1))) return true;
    } else if (pathname === pattern) {
      return true;
    }
  }
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  // FIRST STATEMENT, AND IT MUST STAY FIRST. See the build-time trap above: everything
  // below this line would otherwise run against the public site during `astro build`.
  if (context.isPrerendered) return next();

  if (!isProtected(context.url.pathname)) return next();

  const denied = await requireAccess(context.request);
  if (denied) return denied;

  return next();
});
