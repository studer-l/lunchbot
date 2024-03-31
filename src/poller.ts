export class PollItem<A> {
  private readonly mkNext: () => Promise<A> | null;
  private active: Promise<A>;
  private done: boolean;

  /** mkNext can yield null to signal that no next item is available */
  constructor(mkNext: () => Promise<A> | null) {
    this.mkNext = mkNext;
    const next = mkNext();
    if (next == null) {
      throw new Error('poll item with no initial promise');
    }
    this.active = next;
    this.done = false;
  }

  async next(): Promise<A> {
    const result = await this.active;
    const next = this.mkNext();
    if (next) {
      this.active = next;
    } else {
      this.done = true;
    }
    return result;
  }

  isDone(): boolean {
    return this.done;
  }

  async drain(): Promise<void> {
    await this.active;
  }
}

/** create poll item that triggers in `duration` ms yielding `value` */
export function delay<A>(duration: number, value: A): PollItem<A> {
  let done = false;
  return new PollItem<A>(() => {
    if (done) {
      return null;
    }
    return new Promise<A>((resolve) => {
      setTimeout(() => resolve(value), duration);
    }).then((value: A) => {
      done = true;
      return value;
    });
  });
}

async function enumerateP<A>(
  pollItem: PollItem<A>,
  idx: number,
): Promise<[A, number]> {
  return [await pollItem.next(), idx];
}

export class Poller<A> {
  items: PollItem<A>[];

  constructor() {
    this.items = [];
  }

  push(pollItem: PollItem<A>): void {
    this.items.push(pollItem);
  }

  pop(): void {
    this.items.pop();
  }

  length(): number {
    return this.items.length;
  }

  async poll(): Promise<A> {
    if (this.items.length == 0) {
      throw new Error('no more poll items left');
    }
    const awaitables = this.items.map(enumerateP<A>);
    const [result, idx] = await Promise.race(awaitables);
    if (this.items[idx].isDone()) {
      this.items.splice(idx, 1);
    }
    return result;
  }
}
