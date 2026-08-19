/**
 * The single accessor for the `portfolio-photos` R2 bucket. It is deliberately
 * unguarded — read this before "fixing" the missing null check.
 *
 * `astro dev` runs the real `workerd` runtime through `@cloudflare/vite-plugin`, with
 * Miniflare backing R2 locally. `env.PORTFOLIO_BUCKET` therefore resolves in local
 * development exactly as it does on the deployed Worker, so there is no environment
 * this project runs in where the binding is legitimately absent.
 *
 * The legacy Next.js app wrapped every binding read in a guard because
 * `getRequestContext().env` genuinely was undefined under `next dev` — plain Node, no
 * Cloudflare request context, nothing to bind. That reason no longer exists. Carrying
 * the guard forward would not be defensive: it would convert a genuinely broken
 * binding (removed from wrangler.jsonc, renamed, or an R2 outage) from a loud 500 with
 * a stack trace into a silent wrong answer that a smoke test would pass.
 *
 * So: no truthiness check, no optional chaining, no `??` or `||` fallback, no
 * try/catch, and never a null return. If the binding is missing this throws, the
 * request 500s, and the failure is in the logs and traceable. That is the intended
 * behaviour and the whole content of requirement FND-03, not an oversight.
 */
import { env } from 'cloudflare:workers';

/**
 * Returns the R2 bucket binding. `R2Bucket` is a global from the committed
 * `worker-configuration.d.ts` that `wrangler types` generates from `wrangler.jsonc`,
 * so no `@cloudflare/workers-types` import is needed here.
 */
export function getPortfolioBucket(): R2Bucket {
  return env.PORTFOLIO_BUCKET;
}
