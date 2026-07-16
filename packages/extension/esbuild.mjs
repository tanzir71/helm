import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

await esbuild.build({
  bundle: true,
  entryPoints: ['src/extension.ts'],
  external: ['vscode', '@colbymchenry/codegraph'],
  format: 'cjs',
  minify: false,
  outfile: 'dist/extension.js',
  platform: 'node',
  sourcemap: true,
  target: 'node20',
});

rmSync('dist/webview', { force: true, recursive: true });
mkdirSync('dist/webview', { recursive: true });
cpSync('../webview/dist', 'dist/webview', { recursive: true });
