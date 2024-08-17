import { Prisma, PrismaClient } from "@prisma/client";
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
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async get(id: string) {
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

  bulkUpsert(users: Model[]) {
    return this.prisma.$transaction(users.map((user) => this.upsert(user)));
  }

  upsert(user: Model) {
    return this.prisma.user.upsert({
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
