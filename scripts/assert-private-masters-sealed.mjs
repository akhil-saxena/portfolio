/**
 * The unwatermarked masters must not be reachable from the public internet.
 *
 * ================================================================================================
 * WHAT THIS EXISTS FOR
 * ================================================================================================
 *
 * The photo pipeline writes an unwatermarked 2000px master to `private/<category>/<slug>-clean.webp`
 * in the SAME bucket the site serves from. `private/` is a path convention, not a permission
 * boundary — R2's public custom domain serves whatever key it is asked for — so for a period every
 * master was fetchable by anyone who guessed the path, and 39 of 39 were MEASURED reachable on
 * 2026-08-26. The roadmap made closing it a blocking prerequisite for serving the apex domain.
 *
 * It is closed by a Cloudflare WAF custom rule on the `akhilsaxena.com` zone:
 *
 *     (http.host eq "images.akhilsaxena.com" and starts_with(http.request.uri.path, "/private/"))
 *     -> Block
 *
 * THAT RULE LIVES IN A DASHBOARD, NOT IN THIS REPOSITORY. Nothing in the build, the tests or the
 * other gates can see it, and nothing stops someone disabling it while tidying up the security
 * rules a year from now. A configuration whose only record is a dashboard toggle is exactly the
 * kind that comes undone quietly, which is why this gate fetches the real URLs rather than trusting
 * that the rule is still there.
 *
 * ================================================================================================
 * 🔴 THE ANTI-VACUITY CONTROL IS THE MOST IMPORTANT PART OF THIS FILE
 * ================================================================================================
 *
 * "No private URL returned 200" is trivially true when the network is down, when DNS fails, when
 * the bucket is offline, or when the hostname is wrong — every fetch errors, nothing returns 200,
 * and the gate reports success while proving nothing at all. That is the shape of failure this
 * repository has found nineteen times.
 *
 * So a KNOWN-PUBLIC image is fetched first and MUST return 200. If it does not, the gate refuses
 * with a different message: the instrument is broken, not the boundary. Only once the origin has
 * demonstrably answered a request does a non-200 on a private key mean anything.
 *
 * ================================================================================================
 * HEAD, AND WHY THAT IS SAFE HERE
 * ================================================================================================
 *
 * `assert-og-images-live.mjs` argues for GET because its question is "what does a CRAWLER get", and
 * a cached answer is a true answer to that question. This gate asks whether the EDGE will serve the
 * bytes at all, and a WAF rule is evaluated before cache lookup — so HEAD reaches the same decision
 * a GET would, without transferring 39 multi-megabyte masters through CI on every push.
 *
 * A 403 is the expected answer. So is a 404 (the object was never uploaded, or was deleted) — both
 * mean "not served". Anything in the 200 range is a failure, and so is a 3xx, because a redirect to
 * a signed URL would still hand the bytes over.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST = `${REPO_ROOT}data/portfolio_images.json`;

/**
 * The private key for a record, DERIVED from its own public URL rather than rebuilt from its
 * `category` field.
 *
 * The two disagree, and the URL is the one that matters. The 2026-09-04 category consolidation
 * renamed `abstract` to `architecture` in the DATA, but the objects in the bucket were never
 * re-keyed — their paths still carry the old folder — so a key built from `photo.category` would
 * point at `private/architecture/…`, get a 404 because nothing is there, and report the master as
 * sealed while `private/abstract/…` sat open. Reading the folder out of the public URL asks the
 * bucket where it actually put things.
 */
const privateKeyFrom = (url) => {
  const match = /\/photos\/([^/]+)\/([^/.]+?)(?:-lg|-md|-sm|-thumb)?\.webp/.exec(url);
  return match === null ? null : `/private/${match[1]}/${match[2]}-clean.webp`;
};

const records = JSON.parse(readFileSync(MANIFEST, 'utf8'));
if (!Array.isArray(records) || records.length === 0) {
  console.error(
    '  BUILD REFUSED — the manifest holds no photographs, so this gate checks nothing.'
  );
  process.exit(1);
}

const origin = (() => {
  const first = Object.values(records[0].urls ?? {})[0];
  if (typeof first !== 'string') return null;
  return new URL(first).origin;
})();

if (origin === null) {
  console.error('  BUILD REFUSED — no absolute image URL in the manifest to take an origin from.');
  process.exit(1);
}

/** One public URL, used only to prove the origin answers at all. */
const control = Object.values(records[0].urls ?? {})[0];

const keys = [
  ...new Set(
    records
      .map((record) => privateKeyFrom(Object.values(record.urls ?? {})[0] ?? ''))
      .filter((key) => key !== null)
  ),
];

if (keys.length === 0) {
  console.error(
    '  BUILD REFUSED — no private key could be derived from any record. The URL shape changed and ' +
      'this gate is now checking an empty list, which would pass forever.'
  );
  process.exit(1);
}

const status = async (url, method) => {
  try {
    const response = await fetch(url, { method, redirect: 'manual' });
    return response.status;
  } catch (error) {
    return `ERR ${error instanceof Error ? error.message : String(error)}`;
  }
};

console.log('  private masters — the WAF rule is checked against the live origin\n');

const controlStatus = await status(control, 'GET');
if (controlStatus !== 200) {
  console.error(
    `  GATE INCONCLUSIVE — the control image answered ${controlStatus}, not 200.\n` +
      `    ${control}\n\n` +
      '  Every private URL below would also fail to return 200, and this gate would report the\n' +
      '  masters as sealed while proving nothing. The origin, the network or the hostname is the\n' +
      '  problem — not the boundary. Refusing rather than passing.'
  );
  process.exit(1);
}
console.log(`  control: ${controlStatus} on a public image — the origin answers\n`);

const reachable = [];
for (const key of keys) {
  const url = `${origin}${key}`;
  const code = await status(url, 'HEAD');
  if (typeof code === 'number' && code >= 200 && code < 400) reachable.push(`${code}  ${url}`);
}

if (reachable.length > 0) {
  console.error(
    `  BUILD REFUSED — ${reachable.length} of ${keys.length} unwatermarked master(s) are served to ` +
      'the public internet:\n'
  );
  for (const line of reachable) console.error(`    ${line}`);
  console.error(
    '\n  The WAF custom rule on the akhilsaxena.com zone is missing, disabled or mis-scoped. It is:\n' +
      '    (http.host eq "images.akhilsaxena.com" and starts_with(http.request.uri.path, "/private/"))\n' +
      '    Action: Block'
  );
  process.exit(1);
}

console.log(`  sealed: ${keys.length}/${keys.length} private master(s) refused by the edge`);
