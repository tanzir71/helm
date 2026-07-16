import { isOpenWeightFamily, type ModelProfile } from './model-profiles.js';

export interface ContextTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class ContextManager {
  constructor(private readonly profile: ModelProfile) {}

  estimateTokens(turns: readonly ContextTurn[]): number {
    return turns.reduce((total, turn) => total + Math.ceil(turn.content.length / 4) + 4, 0);
  }

  threshold(): number {
    return isOpenWeightFamily(this.profile.family) ? 0.7 : 0.8;
  }

  needsCompaction(turns: readonly ContextTurn[]): boolean {
    return this.estimateTokens(turns) >= this.profile.contextWindow * this.threshold();
  }

  async compact(
    turns: readonly ContextTurn[],
    summarize: (turns: readonly ContextTurn[]) => Promise<string>,
  ): Promise<{ turns: ContextTurn[]; tokensBefore: number; tokensAfter: number }> {
    const tokensBefore = this.estimateTokens(turns);
    if (turns.length < 4) return { turns: [...turns], tokensBefore, tokensAfter: tokensBefore };
    const keepCount = Math.max(2, Math.ceil(turns.length * 0.35));
    const old = turns.slice(0, -keepCount);
    const recent = turns.slice(-keepCount);
    const summary = await summarize(old);
    const compacted: ContextTurn[] = [
      { role: 'assistant', content: `[Compacted conversation summary]\n${summary}` },
      ...recent,
    ];
    return {
      turns: compacted,
      tokensBefore,
      tokensAfter: this.estimateTokens(compacted),
    };
  }
}
