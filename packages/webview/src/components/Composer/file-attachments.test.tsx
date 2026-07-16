import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FileAttachments } from './FileAttachments';
import { composeMessageWithAttachments } from './file-attachments';

describe('file attachments', () => {
  it('adds unique references after the visible prompt', () => {
    expect(
      composeMessageWithAttachments('Review this file', [
        '@file:src/main.ts',
        '@file:"src/shared file.ts"',
        '@file:src/main.ts',
      ]),
    ).toBe('Review this file\n@file:src/main.ts\n@file:"src/shared file.ts"');
    expect(composeMessageWithAttachments('', ['@file:src/main.ts'])).toBe('@file:src/main.ts');
  });

  it('renders compact removable file chips', () => {
    const markup = renderToStaticMarkup(
      <FileAttachments items={['@file:"src/shared file.ts"']} onRemove={() => undefined} />,
    );
    expect(markup).toContain('aria-label="Attached files"');
    expect(markup).toContain('src/shared file.ts');
    expect(markup).toContain('aria-label="Remove src/shared file.ts"');
    expect(markup).toContain('codicon-file');
  });
});
