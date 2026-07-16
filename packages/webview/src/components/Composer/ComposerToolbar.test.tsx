import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./ModePill', () => ({ ModePill: () => <span>Mode</span> }));
vi.mock('./ModelPill', () => ({ ModelPill: () => <span>Model</span> }));

import { DEFAULT_SETTINGS } from '../../state/store';
import { ComposerToolbar } from './ComposerToolbar';

describe('ComposerToolbar', () => {
  it('keeps explicit context controls without the automatic-context pin', () => {
    const markup = renderToStaticMarkup(
      <ComposerToolbar
        canSend
        models={[]}
        onAddContext={() => undefined}
        onAttachFiles={() => undefined}
        onModelChange={() => undefined}
        onModeChange={() => undefined}
        onSend={() => undefined}
        onStop={() => undefined}
        running={false}
        settings={DEFAULT_SETTINGS}
      />,
    );

    expect(markup).toContain('Attach files');
    expect(markup).toContain('Add context reference');
    expect(markup).not.toContain('Automatic context');
    expect(markup).not.toContain('codicon-pinned');
  });
});
