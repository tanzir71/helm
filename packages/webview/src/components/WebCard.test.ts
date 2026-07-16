import { describe, expect, it } from 'vitest';

import { parseFormattedSearchResults } from './WebCard';

describe('parseFormattedSearchResults', () => {
  it('extracts clickable normalized search results', () => {
    expect(
      parseFormattedSearchResults(
        'Search results from brave:\n\n1. Official docs — https://example.com/docs — Current API reference.',
      ),
    ).toEqual([
      {
        title: 'Official docs',
        url: 'https://example.com/docs',
        snippet: 'Current API reference.',
      },
    ]);
  });
});
