import { ActionError, defineAction } from 'astro:actions';

/**
 * The shape `ping` will return once auth exists. Declared here so the eventual contract
 * is visible, but deliberately unreachable today — the handler throws before it.
 */
type PingResult = { pong: true };

/**
 * One trivial action, whose only job is to make the `/_actions/*` prefix real so it can
 * be tested. `run_worker_first` lists `/_actions/*` and requirement AUTH-01 names it, and
 * it is the prefix most easily forgotten precisely because no page has to declare it —
 * Astro injects `/_actions/[...path]` itself.
 */
export const server = {
  ping: defineAction({
    handler: (): PingResult => {
      // TODO(02-07): replace with `return { pong: true };` behind requireAccess(), and
      // switch the refusal below to UNAUTHORIZED (401) for callers without a valid
      // Cf-Access-Jwt-Assertion header.
      //
      // SERVICE_UNAVAILABLE maps to 503 (astro/dist/actions/runtime/client.js
      // codeToStatusMap), and the injected RPC route returns that status verbatim. 503
      // rather than 401 keeps 02-07's auth test genuinely red; it is still a refusal, so
      // no unauthenticated caller ever receives a 2xx from this prefix. (threat T-02-15)
      throw new ActionError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Admin authentication is not yet wired (plan 02-07).',
      });
    },
  }),
};
