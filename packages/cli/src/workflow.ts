export interface PlanStep {
  number: number;
  text: string;
}

export function createPlanPrompt(task: string): string {
  return `${task}\nProduce a numbered implementation plan only. Do not edit files or run commands. Wait for approval.`;
}

export function extractPlan(text: string): PlanStep[] {
  return text
    .split(/\r?\n/u)
    .map((line) => /^\s*(\d+)[.)]\s+(.+)$/u.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ number: Number(match[1]), text: match[2]!.trim() }))
    .filter((step) => step.text.length > 0);
}

export function createPlanStepPrompt(index: number, total: number, step: PlanStep): string {
  return `Execute approved plan step ${index + 1}/${total}: ${step.text}`;
}
