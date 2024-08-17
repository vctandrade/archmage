import { HashCodeBuilder } from "../utils/hash-code.js";

export type ShopSpell = { id: number; amount: number };

export class Shop {
  channelId: string = "";
  messageId: string | null = null;
  spells: ShopSpell[] = [];
  updatesAt: Date = new Date();

  constructor(init: Partial<Shop>) {
    Object.assign(this, init);
  }

  addSpell(id: number, amount: number = 1) {
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
  }

  hashCode() {
    return new HashCodeBuilder().addString(this.channelId).build();
  }

  equals(other: Shop) {
    return this.channelId == other.channelId;
  }
}
