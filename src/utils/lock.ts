type ResolveFunc = () => void;

export class Lock {
  private locked = false;
  private queue: ResolveFunc[] = [];

  acquire() {
    if (this.locked) {
      return new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.locked = true;
    return Promise.resolve();
  }

  release() {
    const next = this.queue.shift();
    if (next == null) {
      this.locked = false;
      return;
    }

    next();
  }
}
