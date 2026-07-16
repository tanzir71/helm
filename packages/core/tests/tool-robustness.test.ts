import { describe, expect, it } from 'vitest';

import {
  promoteXmlToolLeakage,
  repairJson,
  RepeatCallGuard,
  validateToolInput,
} from '../src/tool-robustness.js';
import { TOOL_SCHEMAS } from '../src/tools.js';

describe('tool robustness', () => {
  it('repairs common malformed JSON', () => {
    expect(repairJson("{path: 'src/a.ts',}")).toMatchObject({
      value: { path: 'src/a.ts' },
      repaired: true,
    });
    expect(repairJson('{broken')).toHaveProperty('error');
  });

  it('returns validation failures as self-correction feedback', () => {
    const invalid = validateToolInput(TOOL_SCHEMAS.edit_file, { path: 'a.ts' });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.feedback).toContain('Fix your tool call');
  });

  it('warns on the third repeat and pauses on the fifth', () => {
    const guard = new RepeatCallGuard();
    const events = Array.from({ length: 5 }, () => guard.record('grep', { query: 'x' }));
    expect(events[2]?.warning).toContain('repeating');
    expect(events[4]?.pause).toBe(true);
  });

  it('promotes leaked Qwen tool blocks out of reasoning', () => {
    const result = promoteXmlToolLeakage('Think <tool_call>{"name":"grep"}</tool_call> done');
    expect(result.reasoning).not.toContain('tool_call');
    expect(result.toolBlocks).toHaveLength(1);
  });
});
