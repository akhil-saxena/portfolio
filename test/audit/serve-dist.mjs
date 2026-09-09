import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'dist/client');
const PORT = Number(process.env.AUDIT_PORT ?? 4399);

if (!existsSync(join(ROOT, 'index.html'))) {
  process.stderr.write(
    `serve-dist: ${ROOT}/index.html does not exist, so there is nothing to audit. ` +
      'Run `npm run build` first. Serving an empty root would answer every request with a 404 ' +
      'and an audit that walked it would measure a blank page at six device classes.\n'
  );
  process.exit(1);
}

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.pdf', 'application/pdf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const base = resolve(join(ROOT, clean));
  if (base !== ROOT && !base.startsWith(`${ROOT}/`)) return null;

  for (const candidate of [base, join(base, 'index.html'), `${base}.html`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const file = resolveFile(url.pathname);

  if (file === null) {
    const notFound = join(ROOT, '404.html');
    const body = existsSync(notFound) ? null : `404 ${url.pathname}`;
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    if (body === null) createReadStream(notFound).pipe(res);
    else res.end(body);
    return;
  }

  res.writeHead(200, {
    'content-type': TYPES.get(extname(file)) ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`serve-dist: ${ROOT} on http://127.0.0.1:${PORT}\n`);
});
