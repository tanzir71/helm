import { describe, expect, it } from 'vitest';

import { SteerQueue } from '../src/steer-queue.js';

describe('SteerQueue', () => {
  it('queues while running and drains FIFO', () => {
    const queue = new SteerQueue();
    queue.enqueue({ id: '1', text: 'first' });
    queue.enqueue({ id: '2', text: 'second' });
    expect(queue.completeRun()?.id).toBe('1');
    expect(queue.completeRun()?.id).toBe('2');
  });

  it('consumes steer once at a loop boundary without disturbing the queue', () => {
    const queue = new SteerQueue();
    queue.enqueue({ id: 'queued', text: 'later' });
    queue.enqueue({ id: 'steer', text: 'now' });
    queue.steer({ id: 'steer', text: 'now' });
    expect(queue.consumeSteer()?.id).toBe('steer');
    expect(queue.consumeSteer()).toBeUndefined();
    expect(queue.snapshot().map((item) => item.id)).toEqual(['queued']);
  });

  it('preserves, reorders, and resumes queue after stop', () => {
    const queue = new SteerQueue();
    queue.enqueue({ id: '1', text: 'first' });
    queue.enqueue({ id: '2', text: 'second' });
    queue.reorder(['2', 'missing', '1']);
    queue.stop();
    expect(queue.completeRun()).toBeUndefined();
    expect(queue.length).toBe(2);
    expect(queue.resume()?.id).toBe('2');
    queue.remove('1');
    queue.clear();
    expect(queue.length).toBe(0);
  });

  it('promotes a steer to the immediate follow-up when no loop boundary remains', () => {
    const queue = new SteerQueue();
    queue.enqueue({ id: 'queued', text: 'later' });
    queue.steer({ id: 'steer', text: 'urgent' });
    expect(queue.completeRun()).toMatchObject({ id: 'steer', steered: true });
    expect(queue.completeRun()?.id).toBe('queued');
  });
});
