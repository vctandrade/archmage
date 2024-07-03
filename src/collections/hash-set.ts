interface Hashable {
  hashCode(): number;
  equals(other: this): boolean;
}

export class HashSet<T extends Hashable> implements Set<T> {
  [Symbol.toStringTag] = "HashSet";

  private data = new Map<number, T[]>();
  private size_ = 0;

  get size() {
    return this.size_;
  }

  add(value: T): this {
    const code = value.hashCode();
    const entries = this.data.get(code);

    if (entries == null) {
      this.data.set(code, [value]);
    } else {
      entries.push(value);
    }

    this.size_ += 1;
    return this;
  }

  clear(): void {
    this.data.clear();
  }

  delete(value: T): boolean {
    const code = value.hashCode();
    const entries = this.data.get(code);

    if (entries == null) {
      return false;
    }

    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].equals(value)) {
        continue;
      }

      entries.splice(i, 1);
      this.size_ -= 1;
      return true;
    }

    if (entries.length == 0) {
      this.data.delete(code);
    }

    return false;
  }

  has(value: T): boolean {
    const code = value.hashCode();
    const entries = this.data.get(code);

    if (entries == null) {
      return false;
    }

    for (const entry of entries) {
      if (entry.equals(value)) {
        return true;
      }
    }

    return false;
  }

  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: unknown,
  ): void {
    for (const entry of this) {
      callbackfn.call(thisArg, entry, entry, this);
    }
  }

  *entries(): IterableIterator<[T, T]> {
    for (const entry of this) {
      yield [entry, entry];
    }
  }

  keys(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  values(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (const entries of this.data.values()) {
      for (const entry of entries) {
        yield entry;
      }
    }
  }
}
