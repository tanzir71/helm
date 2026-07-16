import { parseHTML } from 'linkedom';

import type { WebSearchProviderId } from './protocol.js';

export type SearchProviderId = WebSearchProviderId;

export interface SearchResult {
  snippet: string;
  title: string;
  url: string;
}

export interface SearchProvider {
  id: SearchProviderId;
  search(query: string, resultCount: number, signal?: AbortSignal): Promise<SearchResult[]>;
}

export interface SearchProviderOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
}

interface UnknownRecord {
  [key: string]: unknown;
}

export function createSearchProvider(
  id: SearchProviderId,
  options: SearchProviderOptions = {},
): SearchProvider {
  const fetcher = options.fetcher ?? fetch;
  const apiKey = options.apiKey?.trim();
  if (id !== 'duckduckgo' && !apiKey) {
    throw new Error(`${id} requires an API key.`);
  }
  return {
    id,
    search: async (query, resultCount, signal) => {
      const count = Math.max(1, Math.min(8, Math.trunc(resultCount)));
      if (id === 'tavily') return searchTavily(fetcher, apiKey!, query, count, signal);
      if (id === 'brave') return searchBrave(fetcher, apiKey!, query, count, signal);
      if (id === 'exa') return searchExa(fetcher, apiKey!, query, count, signal);
      return searchDuckDuckGo(fetcher, query, count, signal);
    },
  };
}

export function parseTavilyResponse(value: unknown): SearchResult[] {
  return arrayAt(value, 'results').flatMap((item) => {
    const result = record(item);
    return normalizedResult(result.title, result.url, result.content);
  });
}

export function parseBraveResponse(value: unknown): SearchResult[] {
  const root = record(value);
  return arrayAt(root.web, 'results').flatMap((item) => {
    const result = record(item);
    return normalizedResult(result.title, result.url, result.description);
  });
}

export function parseExaResponse(value: unknown): SearchResult[] {
  return arrayAt(value, 'results').flatMap((item) => {
    const result = record(item);
    const highlights = Array.isArray(result.highlights)
      ? result.highlights.filter((entry): entry is string => typeof entry === 'string').join(' ')
      : undefined;
    return normalizedResult(result.title, result.url, highlights || result.summary || result.text);
  });
}

export function parseDuckDuckGoHtml(html: string): SearchResult[] {
  const { document } = parseHTML(html);
  return [...document.querySelectorAll('.result')].flatMap((node) => {
    const anchor = node.querySelector<HTMLAnchorElement>('.result__a');
    if (!anchor) return [];
    const snippet = node.querySelector('.result__snippet')?.textContent ?? '';
    return normalizedResult(
      anchor.textContent,
      unwrapDuckDuckGoUrl(anchor.getAttribute('href')),
      snippet,
    );
  });
}

export function formatSearchResults(provider: SearchProviderId, results: SearchResult[]): string {
  const heading =
    provider === 'duckduckgo'
      ? 'No search API key configured — using DuckDuckGo fallback.'
      : `Search results from ${provider}:`;
  if (results.length === 0) return `${heading}\n\nNo results found.`;
  return `${heading}\n\n${results
    .slice(0, 8)
    .map((result, index) => `${index + 1}. ${result.title} — ${result.url} — ${result.snippet}`)
    .join('\n')}`;
}

async function searchTavily(
  fetcher: typeof fetch,
  apiKey: string,
  query: string,
  count: number,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const response = await fetcher('https://api.tavily.com/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, max_results: count, search_depth: 'basic' }),
    ...(signal ? { signal } : {}),
  });
  return parseTavilyResponse(await responseJson(response, 'Tavily'));
}

async function searchBrave(
  fetcher: typeof fetch,
  apiKey: string,
  query: string,
  count: number,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  const response = await fetcher(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    ...(signal ? { signal } : {}),
  });
  return parseBraveResponse(await responseJson(response, 'Brave'));
}

async function searchExa(
  fetcher: typeof fetch,
  apiKey: string,
  query: string,
  count: number,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const response = await fetcher('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query, numResults: count, contents: { highlights: true } }),
    ...(signal ? { signal } : {}),
  });
  return parseExaResponse(await responseJson(response, 'Exa'));
}

async function searchDuckDuckGo(
  fetcher: typeof fetch,
  query: string,
  count: number,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const url = new URL('https://html.duckduckgo.com/html/');
  url.searchParams.set('q', query);
  const response = await fetcher(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'Helm-Agent' },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`DuckDuckGo search failed with HTTP ${response.status}.`);
  return parseDuckDuckGoHtml(await response.text()).slice(0, count);
}

async function responseJson(response: Response, provider: string): Promise<unknown> {
  if (!response.ok) throw new Error(`${provider} search failed with HTTP ${response.status}.`);
  return response.json() as Promise<unknown>;
}

function normalizedResult(title: unknown, url: unknown, snippet: unknown): SearchResult[] {
  if (typeof title !== 'string' || typeof url !== 'string' || !url) return [];
  return [
    {
      title: cleanText(title),
      url,
      snippet: typeof snippet === 'string' ? cleanText(snippet) : '',
    },
  ];
}

function cleanText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function record(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

function arrayAt(value: unknown, key: string): unknown[] {
  const candidate = record(value)[key];
  return Array.isArray(candidate) ? candidate : [];
}

function unwrapDuckDuckGoUrl(value: string | null): string {
  if (!value) return '';
  try {
    const absolute = new URL(value, 'https://duckduckgo.com');
    return absolute.searchParams.get('uddg') ?? absolute.toString();
  } catch {
    return value;
  }
}
