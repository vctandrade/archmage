export type UserSpell = { id: number; amount: number };

export class User {
  id: string = "";
  spells: UserSpell[] = [];
  scrolls: number = 0;
  lastDailyAt: Date | null = null;

  constructor(init: Partial<User>) {
    Object.assign(this, init);
  }

  addSpell(id: number, amount: number = 1) {
    for (const spell of this.spells) {
      if (spell.id == id) {
        spell.amount += amount;
        break;
      }
    }

    this.spells.push({ id, amount });
  }
}
