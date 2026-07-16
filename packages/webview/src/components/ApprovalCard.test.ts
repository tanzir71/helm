import { describe, expect, it } from 'vitest';

import { resolveApprovalShortcut } from './ApprovalCard';

describe('resolveApprovalShortcut', () => {
  it('maps Alt+Enter to allow and Escape to deny', () => {
    expect(resolveApprovalShortcut({ altKey: true, key: 'Enter' })).toBe('allow');
    expect(resolveApprovalShortcut({ altKey: false, key: 'Escape' })).toBe('deny');
    expect(resolveApprovalShortcut({ altKey: false, key: 'Enter' })).toBeUndefined();
  });
});
