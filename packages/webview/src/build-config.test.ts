import type { UserConfig } from 'vite';
import { describe, expect, it } from 'vitest';

import viteConfig from '../vite.config';

describe('webview build configuration', () => {
  it('emits relative asset URLs that resolve inside a VS Code webview', () => {
    expect((viteConfig as UserConfig).base).toBe('./');
  });
});
