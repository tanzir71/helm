import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { Streamdown } from 'streamdown';

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
      className="min-w-0 max-w-full break-words text-[length:var(--helm-font-size)] [&_a]:text-[var(--helm-link)] [&_a:hover]:text-[var(--helm-link-active)] [&_blockquote]:my-2 [&_blockquote]:border-l [&_blockquote]:border-[var(--helm-blockquote-border)] [&_blockquote]:bg-[var(--helm-blockquote-background)] [&_blockquote]:px-2 [&_code]:font-[family-name:var(--helm-editor-font-family)] [&_code]:text-[length:var(--helm-font-size-code)] [&_h1]:my-2 [&_h1]:text-[length:var(--helm-font-size)] [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-[length:var(--helm-font-size)] [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-[length:var(--helm-font-size)] [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-1 [&_ol]:pl-5 [&_p]:my-2 [&_pre]:max-w-full [&_pre]:min-w-0 [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--helm-radius-control)] [&_pre]:bg-[var(--helm-code-background)] [&_pre]:p-2 [&_pre]:font-[family-name:var(--helm-editor-font-family)] [&_pre]:text-[length:var(--helm-font-size-code)] [&_ul]:my-1 [&_ul]:pl-5"
      controls={false}
      mode={streaming ? 'streaming' : 'static'}
      plugins={plugins}
    >
      {children}
    </Streamdown>
  );
}
