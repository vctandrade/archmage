type ResolveFunc = () => void;

export class Lock {
  private isLocked = false;
  private queue: ResolveFunc[] = [];

  acquire() {
    if (this.isLocked) {
      return new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.isLocked = true;
    return Promise.resolve();
  }

  release() {
    const next = this.queue.shift();
    if (next == null) {
      this.isLocked = false;
      return;
    }

    next();
  }
}
