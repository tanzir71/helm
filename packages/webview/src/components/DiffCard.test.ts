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

  it('counts separated edits without treating unchanged lines as modified', () => {
    expect(summarizeDiff('a\nold one\nb\nold two\nc', 'a\nnew one\nb\nnew two\nc')).toEqual({
      added: 2,
      removed: 2,
      preview: [
        { kind: 'removed', text: 'old one' },
        { kind: 'added', text: 'new one' },
        { kind: 'removed', text: 'old two' },
        { kind: 'added', text: 'new two' },
      ],
    });
  });
});
