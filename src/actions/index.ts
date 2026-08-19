import { ActionError, defineAction } from 'astro:actions';
import { requireAccess } from '@/lib/access';

/** What `ping` returns to a caller who proved who they are. */
type PingResult = { pong: true };

/**
 * One trivial action, whose only job is to make the `/_actions/*` prefix real so it can be
 * tested. `run_worker_first` lists `/_actions/*`, `src/middleware.ts` carries the same
 * pattern, and requirement AUTH-01 names it — it is the prefix most easily forgotten
 * precisely because no page has to declare it; Astro injects `/_actions/[...path]` itself.
 *
 * Two things make the in-handler check below load-bearing rather than decorative:
 *
 *   1. Plan 02-04 measured that Astro's `security.checkOrigin` does **not** cover this
 *      prefix for JSON bodies. `astro/dist/core/app/origin-check.js` only treats
 *      form-like content types as forbidden cross-origin, so `application/json` returns
 *      `false` regardless of the `Origin` header — verified with a curl carrying no
 *      Origin at all. The Access JWT check therefore carries this prefix ALONE.
 *      (threat_flag: csrf-not-covered)
 *   2. Actions are also invocable in-process from server code, which is a path the
 *      middleware never sees.
 *
 * `UNAUTHORIZED` maps to HTTP 401 (`codeToStatusMap` in
 * `astro/dist/actions/runtime/client.js`) and the injected RPC route returns that status
 * verbatim, so this and `requireAccess`'s own 401 agree. The message says nothing about
 * the team domain, the AUD or why verification failed. (threat T-02-36)
 */
export const server = {
  ping: defineAction({
    handler: async (_input, context): Promise<PingResult> => {
      const denied = await requireAccess(context.request);
      if (denied) {
        throw new ActionError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
      }

      return { pong: true };
    },
  }),
};
