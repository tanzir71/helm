import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { comparisons, faqs, features } from './content.mjs';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.join(siteRoot, 'dist');
const repository =
  process.env.HELM_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || 'tanzir/helm';
const [owner, repositoryName] = repository.split('/');
const repositoryUrl = `https://github.com/${repository}`;
const releaseUrl = `${repositoryUrl}/releases/latest`;
const defaultSiteUrl =
  repositoryName === `${owner}.github.io`
    ? `https://${owner}.github.io`
    : `https://${owner}.github.io/${repositoryName}`;
const siteUrl = (process.env.HELM_SITE_URL || defaultSiteUrl).replace(/\/$/u, '');

const providerNames = [
  'Anthropic',
  'OpenAI',
  'Google',
  'OpenRouter',
  'Ollama',
  'Kimi',
  'GLM',
  'DeepSeek',
  'Qwen',
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pagePrefix(route) {
  const depth = route.split('/').filter(Boolean).length;
  return depth === 0 ? './' : '../'.repeat(depth);
}

function structuredData(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
}

function header(prefix, current = '') {
  return `
    <header class="site-header" data-site-header>
      <div class="shell header-inner">
        <a class="brand" href="${prefix}" aria-label="Helm home">
          <span class="brand-mark"><img src="${prefix}assets/helm.svg" alt="" width="22" height="22"></span>
          <span>helm</span>
          <span class="brand-tag">open-model agent</span>
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle>
          <span></span><span></span><span></span><span class="sr-only">Open navigation</span>
        </button>
        <nav class="site-nav" id="site-nav" aria-label="Main navigation" data-site-nav>
          <a href="${prefix}#why">Why Helm</a>
          <a href="${prefix}#start">Get started</a>
          <a href="${prefix}compare/"${current === 'compare' ? ' aria-current="page"' : ''}>Compare</a>
          <a href="${repositoryUrl}" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
        </nav>
        <a class="button button-small button-primary header-cta" href="${releaseUrl}">Get Helm <span aria-hidden="true">↗</span></a>
      </div>
    </header>`;
}

function footer(prefix) {
  return `
    <footer class="site-footer">
      <div class="shell footer-grid">
        <div>
          <a class="brand footer-brand" href="${prefix}">
            <span class="brand-mark"><img src="${prefix}assets/helm.svg" alt="" width="22" height="22"></span>
            <span>helm</span>
          </a>
          <p>Open models. Serious engineering.</p>
        </div>
        <div class="footer-links">
          <div><span>Product</span><a href="${prefix}#why">Why Helm</a><a href="${prefix}#start">Install</a><a href="${prefix}compare/">Compare</a></div>
          <div><span>Project</span><a href="${repositoryUrl}">Source</a><a href="${repositoryUrl}/blob/main/README.md">Documentation</a><a href="${repositoryUrl}/releases">Releases</a></div>
        </div>
      </div>
      <div class="shell footer-bottom">
        <span>© <span data-current-year>2026</span> Helm contributors.</span>
        <span>Built by <a href="https://tanziro.com/" target="_blank" rel="noreferrer">tanziro.com</a> · <a href="https://buymeacoffee.com/tanzir" target="_blank" rel="noreferrer">Buy me a coffee</a></span>
        <span>Built for GitHub Pages. No cookies. No tracking.</span>
      </div>
    </footer>`;
}

function page({ title, description, route = '', content, schema, current = '' }) {
  const prefix = pagePrefix(route);
  const canonical = route ? `${siteUrl}/${route}/` : `${siteUrl}/`;
  const socialImage = `${siteUrl}/assets/og.png`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#0a0d0d">
    <meta name="color-scheme" content="dark">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" href="${prefix}assets/helm.svg" type="image/svg+xml">
    <link rel="manifest" href="${prefix}manifest.webmanifest">
    <link rel="stylesheet" href="${prefix}assets/styles.css">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Helm">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${socialImage}">
    <meta property="og:image:width" content="1536">
    <meta property="og:image:height" content="1024">
    <meta property="og:image:alt" content="Helm — open models, serious engineering">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${socialImage}">
    ${schema.map(structuredData).join('\n    ')}
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="noise" aria-hidden="true"></div>
    ${header(prefix, current)}
    <main id="main">${content}</main>
    ${footer(prefix)}
    <script src="${prefix}assets/site.js" defer></script>
  </body>
</html>`;
}

function featureCards() {
  return features
    .map(
      (feature) => `
        <article class="feature-card feature-${feature.tone}" data-reveal>
          <div class="feature-meta"><span>${feature.index}</span><span>${feature.kicker}</span></div>
          <h3>${feature.title}</h3>
          <p>${feature.body}</p>
          <div class="feature-detail">${feature.detail}</div>
        </article>`,
    )
    .join('');
}

function comparisonCards(prefix = './') {
  const priority = ['command-code', 'kilo-code', 'cline', 'opencode', 'aider'];
  return [...comparisons]
    .sort((a, b) => {
      const aRank = priority.indexOf(a.slug);
      const bRank = priority.indexOf(b.slug);
      return (aRank === -1 ? priority.length : aRank) - (bRank === -1 ? priority.length : bRank);
    })
    .map(
      (item) => `
        <a class="comparison-card" href="${prefix}compare/${item.slug}/" data-reveal>
          <div><span class="comparison-kicker">${item.eyebrow}</span><h3>${item.competitor}</h3></div>
          <p>${item.meta}</p>
          <span class="text-link">Read comparison <span aria-hidden="true">→</span></span>
        </a>`,
    )
    .join('');
}

function faqMarkup() {
  return faqs
    .map(
      (item, index) => `
        <details class="faq-item"${index === 0 ? ' open' : ''}>
          <summary><span>${item.question}</span><span class="faq-plus" aria-hidden="true"></span></summary>
          <p>${item.answer}</p>
        </details>`,
    )
    .join('');
}

function codeBlock(code, label) {
  return `
    <div class="code-block">
      <div class="code-label">${label}</div>
      <pre><code>${escapeHtml(code)}</code></pre>
      <button class="copy-button" type="button" data-copy aria-label="Copy ${escapeHtml(label)} command">Copy</button>
    </div>`;
}

function homePage() {
  const cloneCommand = `git clone ${repositoryUrl}.git\ncd ${repositoryName}\ncorepack enable && pnpm install`;
  const runnerCommand = `pnpm --filter @helm/core exec tsx examples/cli-run.ts "Explain this project"`;
  const ollamaCommand = `HELM_PROVIDER=ollama HELM_MODEL=qwen3-coder ${runnerCommand}`;
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Helm',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    description:
      'A beginner-friendly BYOK coding agent for VS Code, optimized for frontier and open-weight models.',
    url: `${siteUrl}/`,
    downloadUrl: releaseUrl,
    codeRepository: repositoryUrl,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const content = `
    <section class="hero">
      <div class="hero-orbit hero-orbit-one" aria-hidden="true"></div>
      <div class="hero-orbit hero-orbit-two" aria-hidden="true"></div>
      <div class="shell hero-grid">
        <div class="hero-copy" data-reveal>
          <div class="eyebrow"><span class="status-dot"></span> BYOK coding agent for VS Code</div>
          <h1>Open models.<br><span>Serious engineering.</span></h1>
          <p class="hero-lede">Helm is the coding-agent harness built to get more from the model you choose—open-weight, frontier, hosted, or local.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="${releaseUrl}">Get the VSIX <span aria-hidden="true">↗</span></a>
            <a class="button button-ghost" href="#start">3-minute setup <span aria-hidden="true">↓</span></a>
          </div>
          <div class="hero-note"><span>No Helm account</span><span>No backend</span><span>No telemetry</span></div>
        </div>
        <div class="agent-window" aria-label="Example Helm agent session" data-reveal>
          <div class="window-bar"><div class="window-dots"><span></span><span></span><span></span></div><span>HELM / AGENT</span><span>qwen3-coder</span></div>
          <div class="window-context"><span>~/product</span><span class="window-mode">approval mode</span></div>
          <div class="terminal-line terminal-prompt"><span>›</span><strong>/goal</strong> ship onboarding without breaking tests</div>
          <div class="terminal-run">
            <div><span class="run-icon lime">◇</span><span>skill</span><strong>implement-feature</strong><em>loaded when needed</em></div>
            <div><span class="run-icon cyan">⌁</span><span>codegraph</span><strong>mapped 14 callers</strong><em>one focused query</em></div>
            <div><span class="run-icon orange">±</span><span>diff</span><strong>2 files changed</strong><em>waiting for review</em></div>
            <div><span class="run-icon lime">✓</span><span>verify</span><strong>31 tests passing</strong><em>goal checkpointed</em></div>
          </div>
          <div class="window-composer"><span>Ask Helm to build, explain, debug…</span><span class="composer-button">↑</span></div>
          <div class="window-footer"><span>Agent</span><span>qwen3-coder · medium</span><span>4.2k</span></div>
        </div>
      </div>
      <div class="shell proof-strip" data-reveal>
        <div><strong>9</strong><span>provider routes</span></div>
        <div><strong>11</strong><span>built-in skills</span></div>
        <div><strong>3</strong><span>safety modes</span></div>
        <div><strong>0</strong><span>accounts required</span></div>
      </div>
    </section>

    <section class="model-rail" aria-label="Supported providers">
      <div class="rail-track">${[...providerNames, ...providerNames].map((name) => `<span>${name}<i aria-hidden="true"></i></span>`).join('')}</div>
    </section>

    <section class="section section-why" id="why">
      <div class="shell">
        <div class="section-heading section-heading-split" data-reveal>
          <div><span class="section-index">01 / THE HARNESS</span><h2>The model matters.<br><em>The harness compounds it.</em></h2></div>
          <p>Most agent failures happen around the model: wrong context, brittle tools, runaway loops, unclear permissions. Helm turns those edges into a product.</p>
        </div>
        <div class="feature-grid">${featureCards()}</div>
      </div>
    </section>

    <section class="section workflow-section">
      <div class="shell workflow-grid">
        <div class="workflow-copy" data-reveal>
          <span class="section-index">02 / BUILT FOR REAL REPOS</span>
          <h2>Context that stays<br>under control.</h2>
          <p>Helm starts with the files you name, discovers architecture through CodeGraph, and brings in a skill only when the task calls for it.</p>
          <ul class="check-list">
            <li><span>01</span>Inspect the exact workspace context</li>
            <li><span>02</span>Load a compact task playbook</li>
            <li><span>03</span>Propose reviewable edits and commands</li>
            <li><span>04</span>Verify, checkpoint, and keep the goal moving</li>
          </ul>
        </div>
        <div class="context-stack" data-reveal>
          <div class="context-card context-card-top"><span>@file:src/auth.ts</span><strong>Explicit context</strong><p>Only the files, folders, diagnostics, and terminal output you choose.</p></div>
          <div class="context-card context-card-mid"><span>SKILL.md / debug</span><strong>Progressive expertise</strong><p>A precise workflow loaded for this task—not pasted into every session.</p></div>
          <div class="context-card context-card-bottom"><span>CodeGraph / callers</span><strong>Architectural reach</strong><p>Relationships and source, returned in one answerable slice.</p></div>
        </div>
      </div>
    </section>

    <section class="section start-section" id="start">
      <div class="shell">
        <div class="section-heading centered" data-reveal><span class="section-index">03 / START HERE</span><h2>From zero to first answer.</h2><p>The extension is the simplest path. The source runner is there when you want to meet the harness in your terminal.</p></div>
        <div class="install-shell" data-reveal>
          <div class="install-tabs" role="tablist" aria-label="Install method">
            <button type="button" role="tab" aria-selected="true" aria-controls="install-vscode" id="tab-vscode" data-install-tab="vscode"><span class="tab-number">01</span>VS Code extension<span class="tab-badge">Recommended</span></button>
            <button type="button" role="tab" aria-selected="false" aria-controls="install-cli" id="tab-cli" data-install-tab="cli"><span class="tab-number">02</span>CLI runner<span class="tab-badge subtle">From source</span></button>
          </div>
          <div class="install-panel" id="install-vscode" role="tabpanel" aria-labelledby="tab-vscode" data-install-panel="vscode">
            <div class="steps-grid">
              <article><span class="step-number">1</span><h3>Get the release</h3><p>Open the latest GitHub release and download the file ending in <code>.vsix</code>.</p><a class="text-link" href="${releaseUrl}">Latest release <span aria-hidden="true">↗</span></a></article>
              <article><span class="step-number">2</span><h3>Install in VS Code</h3><p>Open the Command Palette and run <strong>Extensions: Install from VSIX…</strong>, then reload.</p><div class="key-row"><kbd>⇧⌘P</kbd><span>or</span><kbd>Ctrl Shift P</kbd></div></article>
              <article><span class="step-number">3</span><h3>Connect a model</h3><p>Open the Helm compass, choose <strong>Set up a provider</strong>, paste your key, and test the connection.</p><div class="mini-flow"><span>Provider</span><i>→</i><span>Model</span><i>→</i><span>Test</span></div></article>
            </div>
            <div class="beginner-tip"><span>New to model APIs?</span><p>Start with OpenRouter for one hosted key across many models, or Ollama if you want a fully local model with no API key.</p></div>
          </div>
          <div class="install-panel" id="install-cli" role="tabpanel" aria-labelledby="tab-cli" data-install-panel="cli" hidden>
            <div class="cli-grid">
              <div><span class="step-number">1</span><h3>Clone and install</h3><p>Requires Node.js 20+ and pnpm 10.</p>${codeBlock(cloneCommand, 'clone and install')}</div>
              <div><span class="step-number">2</span><h3>Run the harness</h3><p>With no provider variables, the example uses its safe mock model.</p>${codeBlock(runnerCommand, 'run the source CLI')}</div>
            </div>
            <div class="cli-real-model"><div><span>Use a local Ollama model</span><p>Make sure Ollama is running and the model is installed first.</p></div>${codeBlock(ollamaCommand, 'run with Ollama')}</div>
            <p class="install-disclaimer"><strong>Good to know:</strong> this is a developer-facing source runner, not a globally installed CLI package. The VS Code extension is the polished beginner experience today.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section comparison-section" id="compare">
      <div class="shell">
        <div class="section-heading section-heading-split" data-reveal><div><span class="section-index">04 / COMPARE</span><h2>Choose the agent<br>that matches your work.</h2></div><p>Helm is intentionally focused. These practical comparisons explain where that focus helps—and where a broader product may fit better.</p></div>
        <div class="comparison-grid">${comparisonCards()}</div>
        <div class="comparison-note"><span>Transparent by design</span><p>Each page links to the competitor’s official product documentation and says plainly who should choose either tool.</p><a href="./compare/" class="text-link">Browse all comparisons <span aria-hidden="true">→</span></a></div>
      </div>
    </section>

    <section class="section faq-section" id="faq">
      <div class="shell faq-grid">
        <div class="faq-heading" data-reveal><span class="section-index">05 / FAQ</span><h2>Questions before your first prompt.</h2><p>Still unsure? Read the repository documentation or open an issue. Helm is built in public files you can inspect.</p><a class="button button-ghost" href="${repositoryUrl}/blob/main/README.md">Read the docs <span aria-hidden="true">↗</span></a></div>
        <div class="faq-list" data-reveal>${faqMarkup()}</div>
      </div>
    </section>

    <section class="final-cta">
      <div class="shell final-cta-inner" data-reveal>
        <span class="section-index">READY WHEN YOU ARE</span>
        <h2>Bring the model.<br><em>Helm brings the discipline.</em></h2>
        <p>Install the extension, connect one provider, and ask Helm to explain the project already open in VS Code.</p>
        <div class="hero-actions"><a class="button button-primary" href="${releaseUrl}">Get Helm <span aria-hidden="true">↗</span></a><a class="button button-ghost" href="${repositoryUrl}">View source <span aria-hidden="true">↗</span></a></div>
      </div>
    </section>`;

  return page({
    title: 'Helm — Open models. Serious engineering.',
    description:
      'A beginner-friendly BYOK coding agent for VS Code with open-model optimizations, progressive skills, CodeGraph, approvals, and local Ollama support.',
    content,
    schema: [softwareSchema, faqSchema],
  });
}

function compareIndexPage() {
  const route = 'compare';
  const prefix = pagePrefix(route);
  const content = `
    <section class="page-hero compare-index-hero">
      <div class="shell narrow-shell" data-reveal>
        <div class="eyebrow"><span class="status-dot"></span> Honest product comparisons</div>
        <h1>Find the coding agent<br><span>that fits your constraints.</span></h1>
        <p>Helm is not trying to be every AI coding product. Compare provider control, workflow, context, skills, and review boundaries before you install anything.</p>
      </div>
    </section>
    <section class="section compare-directory">
      <div class="shell">
        <div class="comparison-grid comparison-grid-directory">${comparisonCards(prefix)}</div>
        <div class="source-policy"><span>Our comparison policy</span><h2>Useful beats flattering.</h2><p>We link to official product sources, avoid invented scores, and name the users each product serves best. Details were last reviewed on July 16, 2026 and may change.</p></div>
      </div>
    </section>
    <section class="final-cta compact-cta"><div class="shell final-cta-inner"><h2>Prefer direct provider control?</h2><p>Start with Helm in VS Code and keep the model decision yours.</p><a class="button button-primary" href="${releaseUrl}">Get Helm <span aria-hidden="true">↗</span></a></div></section>`;
  return page({
    title: 'Compare Helm with AI coding agents',
    description:
      'Compare Helm with Command Code, Kilo Code, Cline, OpenCode, Aider, Cursor, GitHub Copilot, and Claude Code across models, workflows, context, skills, and privacy.',
    route,
    current: 'compare',
    content,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Helm AI coding agent comparisons',
        url: `${siteUrl}/compare/`,
        hasPart: comparisons.map((item) => ({
          '@type': 'Article',
          name: `${item.eyebrow}: ${item.title}`,
          url: `${siteUrl}/compare/${item.slug}/`,
        })),
      },
    ],
  });
}

function comparisonPage(item) {
  const route = `compare/${item.slug}`;
  const prefix = pagePrefix(route);
  const rows = item.rows
    .map(
      ([label, helm, competitor]) => `
        <div class="compare-row" role="row">
          <div class="compare-cell compare-label" role="rowheader">${label}</div>
          <div class="compare-cell" role="cell"><span class="mobile-column-label">Helm</span>${helm}</div>
          <div class="compare-cell" role="cell"><span class="mobile-column-label">${item.competitor}</span>${competitor}</div>
        </div>`,
    )
    .join('');
  const alternatives = comparisons
    .filter((comparison) => comparison.slug !== item.slug)
    .slice(0, 3)
    .map(
      (comparison) =>
        `<a href="${prefix}compare/${comparison.slug}/"><span>Helm vs</span><strong>${comparison.competitor}</strong><i aria-hidden="true">→</i></a>`,
    )
    .join('');
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${item.eyebrow}: ${item.title}`,
    description: item.meta,
    dateModified: '2026-07-16',
    author: { '@type': 'Organization', name: 'Helm contributors' },
    mainEntityOfPage: `${siteUrl}/${route}/`,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Helm', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: `${siteUrl}/compare/` },
      { '@type': 'ListItem', position: 3, name: item.eyebrow, item: `${siteUrl}/${route}/` },
    ],
  };
  const content = `
    <article>
      <section class="page-hero comparison-hero">
        <div class="shell">
          <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${prefix}">Helm</a><span>/</span><a href="${prefix}compare/">Compare</a><span>/</span><span>${item.competitor}</span></nav>
          <div class="comparison-hero-grid">
            <div data-reveal><span class="section-index">${item.eyebrow.toUpperCase()} · JULY 2026</span><h1>${item.title}</h1><p>${item.description}</p><div class="hero-actions"><a class="button button-primary" href="${releaseUrl}">Try Helm <span aria-hidden="true">↗</span></a><a class="button button-ghost" href="#comparison">See the comparison <span aria-hidden="true">↓</span></a></div></div>
            <aside class="verdict-card" data-reveal><span>Short answer</span><p>${item.summary}</p></aside>
          </div>
        </div>
      </section>
      <section class="section compare-table-section" id="comparison">
        <div class="shell">
          <div class="section-heading centered"><span class="section-index">SIDE BY SIDE</span><h2>Different defaults.<br>Different strengths.</h2></div>
          <div class="compare-table" role="table" aria-label="Helm and ${item.competitor} comparison">
            <div class="compare-row compare-head" role="row"><div class="compare-cell" role="columnheader">Capability</div><div class="compare-cell" role="columnheader"><span class="column-mark helm-column-mark"><img src="${prefix}assets/helm.svg" alt="" width="18" height="18"></span>Helm</div><div class="compare-cell" role="columnheader"><span class="column-mark competitor-column-mark">${item.competitor.charAt(0)}</span>${item.competitor}</div></div>
            ${rows}
          </div>
          <p class="comparison-caveat">This comparison describes public product information and Helm’s current repository as of July 16, 2026. Features and plans change—verify current details in the official sources below.</p>
        </div>
      </section>
      <section class="section best-for-section">
        <div class="shell best-for-grid">
          <article class="best-for-card helm-best" data-reveal><span>Choose Helm if…</span><h2>You want control to stay local and explicit.</h2><p>${item.helmBest}</p><a class="text-link" href="${prefix}#start">Install Helm <span aria-hidden="true">→</span></a></article>
          <article class="best-for-card competitor-best" data-reveal><span>Choose ${item.competitor} if…</span><h2>You want its broader product strengths.</h2><p>${item.competitorBest}</p><a class="text-link" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Visit ${item.competitor} <span aria-hidden="true">↗</span></a></article>
        </div>
      </section>
      <section class="section sources-section">
        <div class="shell sources-grid">
          <div><span class="section-index">PRIMARY SOURCES</span><h2>Check the current product details.</h2><p>We use first-party pages for competitor claims and the Helm repository for Helm claims.</p></div>
          <div class="source-links"><a href="${item.sourceUrl}" target="_blank" rel="noreferrer"><span>01</span><strong>${item.sourceLabel}</strong><i aria-hidden="true">↗</i></a><a href="${item.secondarySourceUrl}" target="_blank" rel="noreferrer"><span>02</span><strong>${item.secondarySourceLabel}</strong><i aria-hidden="true">↗</i></a><a href="${repositoryUrl}/blob/main/README.md"><span>03</span><strong>Helm README</strong><i aria-hidden="true">↗</i></a></div>
        </div>
      </section>
      <section class="section more-comparisons"><div class="shell"><span class="section-index">KEEP COMPARING</span><h2>See the other tradeoffs.</h2><div class="alternative-links">${alternatives}</div></div></section>
      <section class="final-cta compact-cta"><div class="shell final-cta-inner"><span class="section-index">TRY THE FOCUSED OPTION</span><h2>Your VS Code.<br>Your provider. Your call.</h2><p>Helm starts read-only and earns more autonomy when you choose it.</p><div class="hero-actions"><a class="button button-primary" href="${releaseUrl}">Get Helm <span aria-hidden="true">↗</span></a><a class="button button-ghost" href="${prefix}#start">Setup guide <span aria-hidden="true">→</span></a></div></div></section>
    </article>`;

  return page({
    title: `${item.eyebrow}: Models, workflow, context, and control`,
    description: item.meta,
    route,
    current: 'compare',
    content,
    schema: [articleSchema, breadcrumbSchema],
  });
}

async function writePage(relativePath, html) {
  const target = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
}

async function build() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(path.join(outputRoot, 'assets'), { recursive: true });
  await Promise.all([
    copyFile(path.join(siteRoot, 'styles.css'), path.join(outputRoot, 'assets', 'styles.css')),
    copyFile(path.join(siteRoot, 'site.js'), path.join(outputRoot, 'assets', 'site.js')),
    copyFile(
      path.join(siteRoot, 'assets', 'helm.svg'),
      path.join(outputRoot, 'assets', 'helm.svg'),
    ),
    copyFile(path.join(siteRoot, 'assets', 'og.png'), path.join(outputRoot, 'assets', 'og.png')),
  ]);

  await writePage('index.html', homePage());
  await writePage('compare/index.html', compareIndexPage());
  await Promise.all(
    comparisons.map((item) => writePage(`compare/${item.slug}/index.html`, comparisonPage(item))),
  );

  const routes = ['', 'compare/', ...comparisons.map((item) => `compare/${item.slug}/`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map(
      (route) =>
        `  <url><loc>${siteUrl}/${route}</loc><lastmod>2026-07-16</lastmod><changefreq>${route ? 'monthly' : 'weekly'}</changefreq><priority>${route ? '0.8' : '1.0'}</priority></url>`,
    )
    .join('\n')}\n</urlset>\n`;
  await Promise.all([
    writeFile(path.join(outputRoot, 'sitemap.xml'), sitemap),
    writeFile(
      path.join(outputRoot, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    ),
    writeFile(
      path.join(outputRoot, 'manifest.webmanifest'),
      JSON.stringify({
        name: 'Helm — Open-model coding agent',
        short_name: 'Helm',
        start_url: './',
        display: 'standalone',
        background_color: '#0a0d0d',
        theme_color: '#0a0d0d',
        icons: [{ src: './assets/helm.svg', sizes: 'any', type: 'image/svg+xml' }],
      }),
    ),
    writeFile(path.join(outputRoot, '.nojekyll'), ''),
    writePage(
      '404.html',
      page({
        title: 'Page not found — Helm',
        description: 'The requested Helm page could not be found.',
        content: `<section class="not-found"><div class="shell"><span class="section-index">404 / OFF COURSE</span><h1>This route drifted.</h1><p>Head back to Helm and choose a known bearing.</p><a class="button button-primary" href="./">Return home <span aria-hidden="true">→</span></a></div></section>`,
        schema: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Page not found — Helm',
          },
        ],
      }),
    ),
  ]);

  const outputCss = await readFile(path.join(outputRoot, 'assets', 'styles.css'), 'utf8');
  if (!outputCss.includes('.hero-grid') || !outputCss.includes('@media')) {
    throw new Error('Site stylesheet is incomplete.');
  }
  process.stdout.write(`Built Helm site at ${outputRoot}\nCanonical URL: ${siteUrl}/\n`);
}

await build();
