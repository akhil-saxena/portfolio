import { env } from 'cloudflare:workers';

export function getPortfolioBucket(): R2Bucket {
  return env.PORTFOLIO_BUCKET;
}
