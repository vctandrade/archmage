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
        break;
      }
    }

    this.spells.push({ id, amount });
  }

  decrementSpell(id: number, amount: number = 1) {
    for (const spell of this.spells) {
      if (spell.id != id) {
        continue;
      }

      if (spell.amount < amount) {
        break;
      }

      spell.amount -= amount;
      return;
    }

    throw new Error("Invalid decrement.");
  }
}
