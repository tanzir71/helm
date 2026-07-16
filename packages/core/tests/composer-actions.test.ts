import { describe, expect, it } from 'vitest';

import { resolveEnterAction } from '../src/composer-actions.js';

describe('resolveEnterAction', () => {
  const cases = [
    ['queue', false, 'Enter', 'userMessage'],
    ['queue', false, 'Tab', undefined],
    ['steer', false, 'Enter', 'userMessage'],
    ['steer', false, 'Tab', undefined],
    ['queue', true, 'Enter', 'queueMessage'],
    ['queue', true, 'Tab', 'steerMessage'],
    ['steer', true, 'Enter', 'steerMessage'],
    ['steer', true, 'Tab', 'queueMessage'],
  ] as const;

  for (const [enterBehavior, running, key, expected] of cases) {
    it(`${key} resolves to ${expected ?? 'no action'} when ${enterBehavior} and ${running ? 'running' : 'idle'}`, () => {
      expect(resolveEnterAction({ enterBehavior }, running, key)).toBe(expected);
    });
  }
});
