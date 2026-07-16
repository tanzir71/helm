# Helm marketing site

The site is a dependency-free static build designed for GitHub Pages. It publishes the landing
page, beginner extension and globally installed CLI onboarding, eight SEO comparison pages, structured data,
`sitemap.xml`, and `robots.txt`.

## Build locally

```bash
pnpm site:verify
pnpm site:preview
```

Open `http://127.0.0.1:4173`. Do not open `site/dist/index.html` directly: raw file previews may
omit linked CSS and JavaScript, while GitHub Pages serves the site over HTTP. During a GitHub
Actions build, repository and release links derive from `GITHUB_REPOSITORY`. For local or
custom-domain builds, override them explicitly:

```bash
HELM_GITHUB_REPOSITORY=owner/repo HELM_SITE_URL=https://example.com pnpm site:verify
```

## Publish with GitHub Pages

1. Push the repository to GitHub with `main` as the default branch.
2. Open **Settings → Pages** and select **GitHub Actions** as the source.
3. Run **Deploy Helm site to GitHub Pages**, or push a change under `site/`.

The workflow publishes only `site/dist`; it does not expose extension build artifacts or secrets.
