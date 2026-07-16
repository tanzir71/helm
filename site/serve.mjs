import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.join(siteRoot, 'dist');
const port = Number(process.env.PORT || 4173);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

async function resolveFile(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0] || '/');
  const relative = decoded.replace(/^\/+/, '');
  let target = path.resolve(outputRoot, relative);
  if (!target.startsWith(outputRoot)) return path.join(outputRoot, '404.html');
  try {
    const details = await stat(target);
    if (details.isDirectory()) target = path.join(target, 'index.html');
    await stat(target);
    return target;
  } catch {
    return path.join(outputRoot, '404.html');
  }
}

const server = createServer(async (request, response) => {
  const target = await resolveFile(request.url || '/');
  const extension = path.extname(target);
  response.setHeader('Content-Type', mimeTypes.get(extension) || 'application/octet-stream');
  response.setHeader('Cache-Control', extension === '.html' ? 'no-cache' : 'public, max-age=60');
  createReadStream(target).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Helm site preview: http://127.0.0.1:${port}/\n`);
});

process.on('SIGINT', () => server.close());
