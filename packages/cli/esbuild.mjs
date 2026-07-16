import { chmod, mkdir, readFile, rm } from 'node:fs/promises';
import { URL } from 'node:url';

import { build } from 'esbuild';

const manifest = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));

await rm(new URL('./dist', import.meta.url), { force: true, recursive: true });
await mkdir(new URL('./dist', import.meta.url), { recursive: true });
await build({
  banner: {
    js: `#!/usr/bin/env node
import { createRequire as __helmCreateRequire } from 'node:module';
const require = __helmCreateRequire(import.meta.url);`,
  },
  bundle: true,
  define: { __HELM_VERSION__: JSON.stringify(manifest.version) },
  entryPoints: ['src/cli.ts'],
  format: 'esm',
  legalComments: 'external',
  outfile: 'dist/helm-ai.js',
  platform: 'node',
  sourcemap: true,
  target: 'node20',
});
await chmod(new URL('./dist/helm-ai.js', import.meta.url), 0o755);
