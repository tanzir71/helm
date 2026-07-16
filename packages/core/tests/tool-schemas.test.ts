import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { TOOL_SCHEMAS } from '../src/tools.js';

describe('tool schemas', () => {
  it('stay flat and below the twelve-tool budget', () => {
    expect(Object.keys(TOOL_SCHEMAS).length).toBeLessThanOrEqual(12);
    for (const schema of Object.values(TOOL_SCHEMAS)) {
      for (const field of Object.values(schema.shape)) {
        const base = field instanceof z.ZodOptional ? field.unwrap() : field;
        expect(base).not.toBeInstanceOf(z.ZodObject);
        expect(base).not.toBeInstanceOf(z.ZodArray);
        expect(base).not.toBeInstanceOf(z.ZodUnion);
      }
    }
  });
});
