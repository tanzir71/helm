export interface QueuedInstruction {
  id: string;
  text: string;
  steered?: boolean;
  planStepIndex?: number;
}

export class SteerQueue {
  private queued: QueuedInstruction[] = [];
  private pendingSteer: QueuedInstruction | undefined;
  private stopped = false;

  enqueue(item: QueuedInstruction): void {
    this.queued.push(item);
  }

  steer(item: QueuedInstruction): void {
    this.remove(item.id);
    this.pendingSteer = { ...item, steered: true };
  }

  consumeSteer(): QueuedInstruction | undefined {
    const item = this.pendingSteer;
    this.pendingSteer = undefined;
    return item;
  }

  completeRun(): QueuedInstruction | undefined {
    if (this.stopped) return undefined;
    const steer = this.consumeSteer();
    if (steer) return steer;
    return this.queued.shift();
  }

  stop(): void {
    this.stopped = true;
    this.pendingSteer = undefined;
  }

  resume(): QueuedInstruction | undefined {
    this.stopped = false;
    return this.queued.shift();
  }

  clear(): void {
    this.queued = [];
    this.pendingSteer = undefined;
  }

  remove(id: string): void {
    this.queued = this.queued.filter((item) => item.id !== id);
  }

  reorder(ids: readonly string[]): void {
    const byId = new Map(this.queued.map((item) => [item.id, item]));
    const ordered = ids.flatMap((id) => {
      const item = byId.get(id);
      if (!item) return [];
      byId.delete(id);
      return [item];
    });
    this.queued = [...ordered, ...byId.values()];
  }

  snapshot(): readonly QueuedInstruction[] {
    return this.queued.map((item) => ({ ...item }));
  }

  get length(): number {
    return this.queued.length;
  }
}

export const STEER_PREFIX = '[User steering instruction — takes priority over prior instructions]';
