import { describe, expect, it } from 'vitest';

import { selectCodeGraphStatus } from './selectors';
import { initialUiState } from './store';

describe('selectCodeGraphStatus', () => {
  it('shows determinate workspace indexing progress', () => {
    expect(
      selectCodeGraphStatus({
        ...initialUiState,
        codeGraphSettings: {
          ...initialUiState.codeGraphSettings,
          indexing: true,
          progress: { phase: 'parsing', current: 12, total: 30 },
        },
      }),
    ).toBe('Indexing workspace… 12/30 files');
  });

  it('stays hidden when indexing is inactive', () => {
    expect(selectCodeGraphStatus(initialUiState)).toBeUndefined();
  });
});
