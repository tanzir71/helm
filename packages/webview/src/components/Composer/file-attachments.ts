export function composeMessageWithAttachments(text: string, attachments: string[]): string {
  const trimmed = text.trim();
  const references = [...new Set(attachments)].filter((reference) => !trimmed.includes(reference));
  return [trimmed, ...references].filter(Boolean).join('\n');
}
