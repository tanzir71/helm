export function shortToolOutput(output: unknown): string | undefined {
  const structuredMessage =
    typeof output === 'object' && output !== null
      ? (Reflect.get(output, 'error') ?? Reflect.get(output, 'message'))
      : undefined;
  const text =
    typeof structuredMessage === 'string'
      ? structuredMessage
      : typeof output === 'string'
        ? output
        : output === undefined
          ? undefined
          : JSON.stringify(output);
  const firstLine = text
    ?.split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return undefined;
  return firstLine.length > 120 ? `${firstLine.slice(0, 119)}…` : firstLine;
}
