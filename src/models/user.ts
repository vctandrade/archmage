export type UserSpell = { id: number; amount: number };

export class User {
  id: string = "";
  spells: UserSpell[] = [];
  scrolls: number = 0;
  lastDailyAt: Date | null = null;

  constructor(init: Partial<User>) {
    Object.assign(this, init);
  }

  incrementSpell(id: number, amount: number = 1) {
    for (const spell of this.spells) {
      if (spell.id == id) {
        spell.amount += amount;
        return;
      }
    }

    this.spells.push({ id, amount });
  }

  decrementSpell(id: number, amount: number = 1) {
    const index = this.spells.findIndex((spell) => spell.id == id);
    const spell = index < 0 ? null : this.spells[index];

    if (spell == null || spell.amount < amount) {
      throw new Error("Invalid decrement.");
    }

    this.spells[index].amount -= amount;
    if (spell.amount == 0) {
      this.spells.splice(index, 1);
    }
  }
}
