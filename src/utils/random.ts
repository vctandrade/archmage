export const Random = {
  getInt(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min));
  },

  sample(array: unknown[]) {
    return array[Random.getInt(0, array.length)];
  },
};
