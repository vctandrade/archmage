import { Client } from "./client.js";
import { TradeOffer } from "../models/index.js";

export class TradeOffers {
  constructor(private client: Client) {}

  async get(channelId: string, messageId: string) {
    const result = await this.client.tradeOffer.findUnique({
      where: {
        channelId_messageId: {
          channelId,
          messageId,
        },
      },
    });

    if (result == null) {
      return null;
    }

    return new TradeOffer(result);
  }

  async getAll() {
    const results = await this.client.tradeOffer.findMany();
    return results.map((result) => new TradeOffer(result));
  }

  async create(
    channelId: string,
    messageId: string,
    userId: string,
    give: number[],
    receive: number[],
  ) {
    const now = new Date().getTime();
    const expiresAt = new Date(now + 3600000);

    const result = await this.client.tradeOffer.create({
      data: {
        channelId,
        messageId,
        userId,
        give,
        receive,
        expiresAt,
      },
    });

    return new TradeOffer(result);
  }

  async delete(channelId: string, messageId: string) {
    await this.client.tradeOffer.delete({
      where: {
        channelId_messageId: {
          channelId,
          messageId,
        },
      },
    });
  }
}
