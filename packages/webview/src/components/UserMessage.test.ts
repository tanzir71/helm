import { describe, expect, it } from 'vitest';

import { parseUserMessage } from './UserMessage';

describe('parseUserMessage', () => {
  it('moves file and folder references out of the visible message text', () => {
    expect(
      parseUserMessage('Compare @file:src/index.ts with @folder:"src/shared code" before editing.'),
    ).toEqual({
      text: 'Compare with before editing.',
      context: ['@file:src/index.ts', '@folder:"src/shared code"'],
    });
  });

  it('deduplicates context chips and preserves message line breaks', () => {
    expect(
      parseUserMessage('First line\n@file:a.ts  @file:a.ts\nSecond line', ['@file:src/active.ts']),
    ).toEqual({
      text: 'First line\n\nSecond line',
      context: ['@file:a.ts', '@file:src/active.ts'],
    });
  });
});
