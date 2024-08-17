type Alignment = "l" | "r";

type Printable = {
  toString(): string;
};

export class TableBuilder {
  data: string[][] = [];

  constructor(
    public header: string[],
    public alignment: Alignment[],
  ) {}

  build() {
    const width = this.header.map((item) => item.length);
    for (const row of this.data) {
      for (let i = 0; i < row.length; i++) {
        width[i] = Math.max(width[i], row[i].length);
      }
    }

    const result = [
      this.format(this.header, width),
      width.map((value) => "-".repeat(value)),
    ];

    for (const row of this.data) {
      result.push(this.format(row, width));
    }

    return result.map((row) => row.join(" ")).join("\n");
  }

  addRow(row: Printable[]) {
    this.data.push(row.map((element) => element.toString()));
    return this;
  }

  private format(row: string[], width: number[]) {
    return row.map((item, index) =>
      this.align(item, width[index], this.alignment[index]),
    );
  }

  private align(text: string, width: number, alignment: Alignment) {
    switch (alignment) {
      case "l":
        return text.padEnd(width);

      case "r":
        return text.padStart(width);
    }
  }
}
