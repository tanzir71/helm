import { describe, expect, it } from 'vitest';

import { summarizeDiff } from './DiffCard';

describe('summarizeDiff', () => {
  it('counts changed lines and keeps removed and added preview rows', () => {
    expect(summarizeDiff('same\nold\ntail', 'same\nnew\nextra\ntail')).toEqual({
      added: 2,
      removed: 1,
      preview: [
        { kind: 'removed', text: 'old' },
        { kind: 'added', text: 'new' },
        { kind: 'added', text: 'extra' },
      ],
    });
  });
});
