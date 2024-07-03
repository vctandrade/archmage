export class HashCodeBuilder {
  data = 7;

  build() {
    return this.data;
  }

  addNumber(value: number) {
    this.data = (31 * this.data + value) | 0;
    return this;
  }

  addString(value: string) {
    for (let i = 0; i < value.length; i++) {
      this.addNumber(value.charCodeAt(i));
    }

    return this;
  }
}
