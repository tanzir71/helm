import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContextSection } from './ContextSection';

describe('ContextSection', () => {
  it('exposes automatic active-editor context as a settings checkbox', () => {
    const markup = renderToStaticMarkup(<ContextSection enabled onToggle={() => undefined} />);

    expect(markup).toContain('Context');
    expect(markup).toContain('Include active editor context');
    expect(markup).toContain('active file path and selected text');
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain('checked=""');
  });
});
