import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST = `${REPO_ROOT}data/portfolio_images.json`;

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
