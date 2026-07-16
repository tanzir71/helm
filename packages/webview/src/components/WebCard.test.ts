import { describe, expect, it } from 'vitest';

import {
  extractFetchedPageTitle,
  formatWebDomain,
  formatWebLocation,
  formatWebSearchSummary,
  parseFormattedSearchResults,
} from './WebCard';

describe('parseFormattedSearchResults', () => {
  it('extracts clickable normalized search results', () => {
    expect(
      parseFormattedSearchResults(
        'Search results from brave:\n\n1. Official docs — https://example.com/docs — Current API reference.\n2. Duplicate — https://example.com/docs — Same page.',
      ),
    ).toEqual([
      {
        title: 'Official docs',
        url: 'https://example.com/docs',
        snippet: 'Current API reference.',
      },
    ]);
  });

  it('formats fetch URLs as compact domain and path labels', () => {
    expect(formatWebLocation('https://docs.example.com/reference/api?version=2')).toBe(
      'docs.example.com/reference/api?version=2',
    );
    expect(formatWebDomain('https://docs.example.com/reference/api')).toBe('docs.example.com');
  });

  it('extracts the fetched page title from readable markdown', () => {
    expect(
      extractFetchedPageTitle(
        'Content of https://example.com follows.\n\n--- BEGIN UNTRUSTED WEB CONTENT ---\n# API Reference\n\nDetails',
      ),
    ).toBe('API Reference');
  });

  it('includes the query and result count in the collapsed search summary', () => {
    expect(formatWebSearchSummary('VS Code webviews', 3)).toBe(
      'Searched the web for “VS Code webviews” — 3 results',
    );
    expect(formatWebSearchSummary('API', 1)).toBe('Searched the web for “API” — 1 result');
    expect(formatWebSearchSummary('API')).toBe('Searched the web for “API”');
  });
});
