interface Hashable {
  hashCode(): number;
  equals(other: this): boolean;
}

class Entry<K, V> {
  constructor(
    public key: K,
    public value: V,
  ) {}
}

export class HashMap<K extends Hashable, V> implements Map<K, V> {
  [Symbol.toStringTag] = "HashMap";

  private data = new Map<number, Entry<K, V>[]>();
  private size_ = 0;

  get size() {
    return this.size_;
  }

  set(key: K, value: V): this {
    const code = key.hashCode();
    const entries = this.data.get(code);

    if (entries == null) {
      this.data.set(code, [new Entry(key, value)]);
      this.size_ += 1;
      return this;
    }

    for (const entry of entries) {
      if (entry.key.equals(key)) {
        entry.value = value;
        return this;
      }
    }

    entries.push(new Entry(key, value));
    this.size_ += 1;
    return this;
  }

  has(key: K): boolean {
    const code = key.hashCode();
    const entries = this.data.get(code);

    if (entries == null) {
      return false;
    }

    for (const entry of entries) {
      if (entry.key.equals(key)) {
        return true;
      }
    }

    return false;
  }

  get(key: K): V | undefined {
    const code = key.hashCode();
    const entries = this.data.get(code);

    if (entries == null) {
      return undefined;
    }

    for (const entry of entries) {
      if (entry.key.equals(key)) {
        return entry.value;
      }
    }

    return undefined;
  }

  clear(): void {
    this.data.clear();
  }

  delete(key: K): boolean {
    const code = key.hashCode();
    const entries = this.data.get(code);

    if (entries == null) {
      return false;
    }

    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].key.equals(key)) {
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

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  *keys(): IterableIterator<K> {
    for (const [key] of this) {
      yield key;
    }
  }

  *values(): IterableIterator<V> {
    for (const [, value] of this) {
      yield value;
    }
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    for (const entries of this.data.values()) {
      for (const entry of entries) {
        yield [entry.key, entry.value];
      }
    }
  }
}
