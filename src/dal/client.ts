import { PrismaClient } from "@prisma/client";
import { ITXClientDenyList } from "@prisma/client/runtime/library";

export type BaseClient = PrismaClient;
export type Client = Omit<PrismaClient, ITXClientDenyList>;
