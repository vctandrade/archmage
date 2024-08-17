import configs from "../configs/index.js";

export const Random = {
  getInt(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min));
  },

  getSpellId(level: number) {
    const offset = 12 * Random.getInt(0, configs.books.length);

    switch (level) {
      case 1:
        return offset + Random.getInt(0, 5);

      case 2:
        return offset + Random.getInt(5, 10);

      case 3:
        return offset + Random.getInt(10, 12);
    }

    return -1;
  },

  sample(array: unknown[]) {
    return array[Random.getInt(0, array.length)];
  },
};
