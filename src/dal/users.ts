import { Prisma, PrismaClient } from "@prisma/client";
import { User } from "../models/user.js";

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

export default class Users {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async get(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
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

  async upsert(user: Model) {
    await this.prisma.user.upsert({
      where: {
        id: user.id,
      },
      update: {
        lastDailyAt: user.lastDailyAt,
        scrolls: user.scrolls,
        spells: {
          upsert: user.spells.map((spell) => ({
            where: {
              id_userId: {
                id: spell.id,
                userId: user.id,
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
