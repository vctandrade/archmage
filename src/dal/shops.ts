import { Prisma } from "@prisma/client";
import { Client } from "./client.js";
import { Shop } from "../models/index.js";

type Model = Prisma.ShopGetPayload<{
  include: {
    spells: {
      select: {
        id: true;
        amount: true;
      };
    };
  };
}>;

export class Shops {
  constructor(private client: Client) {}

  async get(channelId: string) {
    const shop = await this.client.shop.findUnique({
      where: {
        channelId,
      },
      include: {
        spells: true,
      },
    });

    if (shop == null) {
      return null;
    }

    return new Shop(shop);
  }

  async getAll() {
    const results = await this.client.shop.findMany();
    return results.map((result) => new Shop(result));
  }

  upsert(shop: Model) {
    return this.client.shop.upsert({
      where: {
        channelId: shop.channelId,
      },
      update: {
        messageId: shop.messageId,
        updatesAt: shop.updatesAt,
        spells: {
          upsert: shop.spells.map((spell) => ({
            where: {
              channelId_id: {
                channelId: shop.channelId,
                id: spell.id,
              },
            },
            update: {
              amount: spell.amount,
            },
            create: {
              id: spell.id,
              amount: spell.amount,
            },
          })),
          deleteMany: {
            channelId: shop.channelId,
            id: {
              notIn: shop.spells.map((spell) => spell.id),
            },
          },
        },
      },
      create: {
        channelId: shop.channelId,
        messageId: shop.messageId,
        updatesAt: shop.updatesAt,
        spells: {
          create: shop.spells.map((spell) => ({
            id: spell.id,
            amount: spell.amount,
          })),
        },
      },
    });
  }

  delete(channelId: string) {
    return this.client.shop.delete({
      where: {
        channelId,
      },
    });
  }
}
