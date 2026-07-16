import { describe, expect, it } from 'vitest';

import { fileContextReference, workspaceRelativePath } from '../src/message-context.js';

describe('message context', () => {
  it('creates a visible active-file reference inside the workspace', () => {
    expect(workspaceRelativePath('/workspace', '/workspace/src/main.ts')).toBe('src/main.ts');
    expect(fileContextReference('src/shared file.ts')).toBe('@file:"src/shared file.ts"');
  });

  it('does not attach files outside the workspace', () => {
    expect(workspaceRelativePath('/workspace', '/other/secret.ts')).toBeUndefined();
  });
});
