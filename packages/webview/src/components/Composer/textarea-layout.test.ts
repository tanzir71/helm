import { describe, expect, it } from 'vitest';

import { resizeComposerTextarea } from './textarea-layout';

describe('resizeComposerTextarea', () => {
  it('uses scrollHeight and caps the composer at 180px', () => {
    const short = { scrollHeight: 72, style: { height: '20px' } };
    const tall = { scrollHeight: 420, style: { height: '20px' } };

    expect(resizeComposerTextarea(short)).toBe(72);
    expect(short.style.height).toBe('72px');
    expect(resizeComposerTextarea(tall)).toBe(180);
    expect(tall.style.height).toBe('180px');
  });
});
