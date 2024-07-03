import { PrismaClient } from "@prisma/client";
import { TradeOffer } from "../models/index.js";

export class TradeOffers {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async get(channelId: string, messageId: string) {
    const result = await this.prisma.tradeOffer.findUniqueOrThrow({
      where: {
        channelId_messageId: {
          channelId,
          messageId,
        },
      },
    });

    return new TradeOffer(result);
  }

  async getAll() {
    const results = await this.prisma.tradeOffer.findMany();
    return results.map((result) => new TradeOffer(result));
  }

  async create(
    channelId: string,
    messageId: string,
    userId: string,
    give: number[],
    receive: number[],
  ) {
    const result = await this.prisma.tradeOffer.create({
      data: {
        channelId,
        messageId,
        userId,
        give,
        receive,
      },
    });

    return new TradeOffer(result);
  }

  async delete(channelId: string, messageId: string) {
    await this.prisma.tradeOffer.delete({
      where: {
        channelId_messageId: {
          channelId,
          messageId,
        },
      },
    });
  }
}
