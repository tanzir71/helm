import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import {
  formatSearchResults,
  createSearchProvider,
  parseBraveResponse,
  parseDuckDuckGoHtml,
  parseExaResponse,
  parseTavilyResponse,
} from '../src/web-search.js';

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

describe('recorded search provider fixtures', () => {
  it.each([
    ['tavily-search.json', parseTavilyResponse, 'Tavily documentation'],
    ['brave-search.json', parseBraveResponse, 'Brave Search API'],
    ['exa-search.json', parseExaResponse, 'Exa Search'],
  ] as const)('normalizes %s', (name, parser, title) => {
    expect(parser(JSON.parse(fixture(name)))).toMatchObject([{ title }]);
  });

  it.each([
    ['tavily', 'tavily-search.json', 'Tavily documentation', 'application/json'],
    ['brave', 'brave-search.json', 'Brave Search API', 'application/json'],
    ['exa', 'exa-search.json', 'Exa Search', 'application/json'],
    ['duckduckgo', 'duckduckgo-search.html', 'Example documentation', 'text/html'],
  ] as const)(
    'executes the %s adapter against its recorded response',
    async (id, name, title, contentType) => {
      const fetcher = vi.fn(
        async () => new Response(fixture(name), { headers: { 'content-type': contentType } }),
      );
      const provider = createSearchProvider(id, {
        ...(id === 'duckduckgo' ? {} : { apiKey: 'test-key' }),
        fetcher: fetcher as typeof fetch,
      });

      await expect(provider.search('current API', 1)).resolves.toMatchObject([{ title }]);
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it('parses and unwraps DuckDuckGo fallback HTML', () => {
    expect(parseDuckDuckGoHtml(fixture('duckduckgo-search.html'))).toEqual([
      {
        title: 'Example documentation',
        url: 'https://example.com/docs',
        snippet: 'A keyless search result & useful snippet.',
      },
    ]);
  });

  it('labels the keyless fallback and caps formatted output at eight results', () => {
    const results = Array.from({ length: 10 }, (_, index) => ({
      title: `Result ${index}`,
      url: `https://example.com/${index}`,
      snippet: 'Snippet',
    }));
    const output = formatSearchResults('duckduckgo', results);
    expect(output).toContain('DuckDuckGo fallback');
    expect(output).toContain('8. Result 7');
    expect(output).not.toContain('9. Result 8');
  });
});
