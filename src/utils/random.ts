import configs from "../configs/index.js";

export const Random = {
  getInt(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min));
  },

  getWeightIndex(weights: number[]) {
    let sum = 0;
    for (const weight of weights) {
      sum += weight;
    }

    let value = Math.random() * sum;
    for (let i = 0; i < weights.length; i++) {
      value -= weights[i];
      if (value < 0) {
        return i;
      }
    }

    throw new Error("No valid entries.");
  },

  getBookId() {
    const weights = [];
    for (const book of configs.books) {
      weights.push(book.weight);
    }

    return this.getWeightIndex(weights);
  },

  getSpellId(level: number) {
    const offset = 12 * this.getBookId();

    switch (level) {
      case 1:
        return offset + Random.getInt(0, 5);

      case 2:
        return offset + Random.getInt(5, 10);

      case 3:
        return offset + Random.getInt(10, 12);
    }

    throw new Error(`Invalid spell level: ${level}.`);
  },

  sample<T>(array: T[]) {
    return array[Random.getInt(0, array.length)];
  },
};
