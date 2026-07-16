import { describe, expect, it } from 'vitest';

import { primarySymbol, relatedSymbolCount } from './CodeGraphCard';

describe('CodeGraph card summary', () => {
  it('identifies the focal symbol and related symbols without counting paths', () => {
    expect(primarySymbol('what calls SessionStore')).toBe('SessionStore');
    expect(
      relatedSymbolCount(
        '**`src/session.ts`** — `SessionStore`, `SessionManager`, `restoreSession`',
        'SessionStore',
      ),
    ).toBe(2);
  });
});
