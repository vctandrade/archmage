import { Prisma } from "@prisma/client";
import { Client } from "./client.js";
import { User } from "../models/index.js";

type Model = Prisma.UserGetPayload<{
  include: {
    spells: {
      select: {
        id: true;
        amount: true;
      };
    };
  };
}>;

export class Users {
  constructor(private client: Client) {}

  async get(id: string) {
    const user = await this.client.user.findUnique({
      where: {
        id,
      },
      include: {
        spells: true,
      },
    });

    if (user == null) {
      return new User({ id });
    }

    return new User(user);
  }

  upsert(user: Model) {
    return this.client.user.upsert({
      where: {
        id: user.id,
      },
      update: {
        lastDailyAt: user.lastDailyAt,
        scrolls: user.scrolls,
        spells: {
          upsert: user.spells.map((spell) => ({
            where: {
              userId_id: {
                userId: user.id,
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
            userId: user.id,
            id: {
              notIn: user.spells.map((spell) => spell.id),
            },
          },
        },
      },
      create: {
        id: user.id,
        scrolls: user.scrolls,
        lastDailyAt: user.lastDailyAt,
        spells: {
          create: user.spells.map((spell) => ({
            id: spell.id,
            amount: spell.amount,
          })),
        },
      },
    });
  }
}
