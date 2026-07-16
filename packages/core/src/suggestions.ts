export function fallbackSuggestions(context: {
  text: string;
  tools?: readonly string[];
  diffApplied?: boolean;
  error?: boolean;
}): string[] {
  if (context.error) return ['Explain the error', 'Try another approach'];
  if (context.diffApplied) return ['Run the tests', 'Show the diff', 'Undo change'];
  if (context.tools?.includes('run_command')) return ['Explain the result', 'Run related tests'];
  if (/plan|steps?/iu.test(context.text)) return ['Execute the plan', 'Revise the plan'];
  return ['Explain this', 'What should I do next?'];
}
