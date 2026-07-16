import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AssistantMessage } from './AssistantMessage';
import { Transcript } from './Transcript';

describe('sidebar overflow containment', () => {
  it('keeps a 300-character code line scrollable inside a non-scrolling panel', () => {
    const longLine = 'x'.repeat(300);
    const message = {
      id: 'wide-code',
      role: 'assistant' as const,
      text: `\`\`\`text\n${longLine}\n\`\`\``,
      createdAt: 1,
    };
    const transcript = renderToStaticMarkup(<Transcript messages={[message]} />);
    const response = renderToStaticMarkup(<AssistantMessage message={message} streaming={false} />);

    expect(transcript).toContain('overflow-x-hidden');
    expect(response).toContain('overflow-x-auto');
    expect(response).toContain(longLine);
  });
});
