import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { Streamdown } from 'streamdown';

import { StreamdownControlIcon } from '../StreamdownControlIcon';

export interface MessageResponseProps {
  children: string;
  streaming?: boolean;
}

const plugins = { cjk, code, math, mermaid };

export function MessageResponse({
  children,
  streaming = false,
}: MessageResponseProps): React.JSX.Element {
  return (
    <Streamdown
      className="min-w-0 max-w-full break-words text-[length:var(--helm-font-size)] [&_[data-streamdown=code-block-actions]]:rounded-[var(--helm-radius-control)] [&_[data-streamdown=code-block-actions]]:border-[var(--helm-border)] [&_[data-streamdown=code-block-actions]]:bg-[var(--helm-widget-background)] [&_[data-streamdown=code-block-actions]]:opacity-0 [&_[data-streamdown=code-block]:hover_[data-streamdown=code-block-actions]]:opacity-100 [&_[data-streamdown=code-block]]:my-2 [&_[data-streamdown=code-block]]:gap-1 [&_[data-streamdown=code-block]]:rounded-[var(--helm-radius-control)] [&_[data-streamdown=code-block]]:border-0 [&_[data-streamdown=code-block]]:bg-[var(--helm-code-background)] [&_[data-streamdown=code-block]]:p-2 [&_a]:text-[var(--helm-link)] [&_a:hover]:text-[var(--helm-link-active)] [&_blockquote]:my-2 [&_blockquote]:border-l [&_blockquote]:border-[var(--helm-blockquote-border)] [&_blockquote]:bg-[var(--helm-blockquote-background)] [&_blockquote]:px-2 [&_code]:font-[family-name:var(--helm-editor-font-family)] [&_code]:text-[length:var(--helm-font-size-code)] [&_h1]:my-2 [&_h1]:text-[length:var(--helm-font-size)] [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-[length:var(--helm-font-size)] [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-[length:var(--helm-font-size)] [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-1 [&_ol]:pl-5 [&_p]:my-2 [&_pre]:max-w-full [&_pre]:min-w-0 [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--helm-radius-control)] [&_pre]:bg-[var(--helm-code-background)] [&_pre]:p-2 [&_pre]:font-[family-name:var(--helm-editor-font-family)] [&_pre]:text-[length:var(--helm-font-size-code)] [&_ul]:my-1 [&_ul]:pl-5"
      controls={{ code: { copy: true, download: false }, mermaid: false, table: false }}
      icons={{ CheckIcon: StreamdownControlIcon, CopyIcon: StreamdownControlIcon }}
      mode={streaming ? 'streaming' : 'static'}
      plugins={plugins}
    >
      {children}
    </Streamdown>
  );
}
