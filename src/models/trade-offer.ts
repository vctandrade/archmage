import { HashCodeBuilder } from "../utils/hash-code.js";

export class TradeOffer {
  channelId: string = "";
  messageId: string = "";
  userId: string = "";
  give: number[] = [];
  receive: number[] = [];
  expiresAt: Date = new Date();

  constructor(init: Partial<TradeOffer>) {
    Object.assign(this, init);
  }

  hashCode() {
    return new HashCodeBuilder()
      .addString(this.channelId)
      .addString(this.messageId)
      .build();
  }

  equals(other: TradeOffer) {
    return (
      this.channelId == other.channelId && this.messageId == other.messageId
    );
  }
}
