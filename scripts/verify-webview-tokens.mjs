import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../packages/webview/src/', import.meta.url));
const allowedExtensions = new Set(['.css', '.ts', '.tsx']);
const forbidden = [
  { label: 'hex color', pattern: /#[\da-f]{3,8}\b/giu },
  { label: 'rgb color', pattern: /\brgba?\s*\(/giu },
  { label: 'hsl color', pattern: /\bhsla?\s*\(/giu },
  { label: 'Lucide import', pattern: /\bfrom\s+['"]lucide-react['"]/gu },
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? collect(path) : [path];
    }),
  );
  return files.flat();
}

const failures = [];
for (const path of await collect(sourceRoot)) {
  if (!allowedExtensions.has(extname(path)) || path.endsWith('tokens.css')) continue;
  const contents = await readFile(path, 'utf8');
  for (const rule of forbidden) {
    for (const match of contents.matchAll(rule.pattern)) {
      const line = contents.slice(0, match.index).split('\n').length;
      failures.push(`${relative(sourceRoot, path)}:${line} ${rule.label}: ${match[0]}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write('Webview token boundary violations:\n' + failures.join('\n') + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write('Webview token boundary verified.\n');
}
