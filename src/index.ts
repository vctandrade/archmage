import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { TradeOffers, Users } from "./dal/index.js";
import Server from "./server.js";
import {
  ChecklistHandler,
  DailyHandler,
  GrimoireHandler,
  MergeHandler,
  TradeHandler,
} from "./handlers/index.js";

const prisma = new PrismaClient();
const users = new Users(prisma);
const tradeOffers = new TradeOffers(prisma);

const server = new Server();
server.addHandler(new ChecklistHandler(users));
server.addHandler(new DailyHandler(users));
server.addHandler(new GrimoireHandler(users));
server.addHandler(new MergeHandler(users));
server.addHandler(
  new TradeHandler(server.users, server.channels, users, tradeOffers),
);

await server.start();
console.log("Ready!");

async function gracefulShutdown() {
  await server.stop();
}

process.on("SIGTERM", gracefulShutdown);
