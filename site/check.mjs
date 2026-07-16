import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { comparisons } from './content.mjs';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.join(siteRoot, 'dist');
const failures = [];

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectHtml(target);
      return entry.name.endsWith('.html') ? [target] : [];
    }),
  );
  return nested.flat();
}

function checkMarkup(file, html) {
  const relative = path.relative(outputRoot, file);
  const required = [
    '<title>',
    'name="description"',
    'rel="canonical"',
    'property="og:title"',
    'name="twitter:card"',
    'application/ld+json',
    '<main id="main">',
    'data-menu-toggle',
  ];
  for (const marker of required) {
    if (!html.includes(marker)) failures.push(`${relative}: missing ${marker}`);
  }
  if (/href=["']#["']/u.test(html)) failures.push(`${relative}: contains an empty hash link`);
  if (/\b(?:TODO|PLACEHOLDER)\b/iu.test(html))
    failures.push(`${relative}: contains placeholder copy`);
  for (const image of html.matchAll(/<img\b[^>]*>/gu)) {
    if (!/\balt=/u.test(image[0])) failures.push(`${relative}: image is missing alt text`);
  }
}

async function checkLocalLinks(file, html) {
  const relative = path.relative(outputRoot, file);
  const values = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gu)].map((match) => match[1]);
  for (const value of values) {
    if (/^(?:https?:|mailto:|tel:|#|data:)/u.test(value)) continue;
    const clean = value.split('#')[0]?.split('?')[0];
    if (!clean) continue;
    let target = path.resolve(path.dirname(file), clean);
    if (clean.endsWith('/')) target = path.join(target, 'index.html');
    try {
      await access(target);
    } catch {
      failures.push(`${relative}: broken local reference ${value}`);
    }
  }
}

const files = await collectHtml(outputRoot);
for (const file of files) {
  const html = await readFile(file, 'utf8');
  checkMarkup(file, html);
  await checkLocalLinks(file, html);
}

const home = await readFile(path.join(outputRoot, 'index.html'), 'utf8');
if ((home.match(/class="feature-card /gu) ?? []).length !== 6) {
  failures.push('index.html: expected six value-proposition cards');
}
if ((home.match(/class="comparison-card"/gu) ?? []).length !== comparisons.length) {
  failures.push(`index.html: expected ${comparisons.length} comparison links`);
}

const sitemap = await readFile(path.join(outputRoot, 'sitemap.xml'), 'utf8');
const expectedSitemapUrls = comparisons.length + 2;
if ((sitemap.match(/<url>/gu) ?? []).length !== expectedSitemapUrls) {
  failures.push(`sitemap.xml: expected ${expectedSitemapUrls} URLs`);
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Site check passed: ${files.length} HTML pages, local links, metadata, and sitemap.\n`,
  );
}
