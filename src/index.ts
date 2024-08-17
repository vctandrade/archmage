import "dotenv/config";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { PrismaClient } from "@prisma/client";
import { Shops, TradeOffers, Users } from "./dal/index.js";
import Server from "./server.js";
import {
  ChecklistHandler,
  DailyHandler,
  GiveHandler,
  GrimoireHandler,
  MergeHandler,
  ShopHandler,
  TradeHandler,
} from "./handlers/index.js";

dayjs.extend(customParseFormat);

const prisma = new PrismaClient();
const users = new Users(prisma);
const tradeOffers = new TradeOffers(prisma);
const shops = new Shops(prisma);

const server = new Server();
server.addHandler(new ChecklistHandler(users));
server.addHandler(new DailyHandler(users));
server.addHandler(new GiveHandler(users));
server.addHandler(new GrimoireHandler(users));
server.addHandler(new MergeHandler(users));
server.addHandler(new ShopHandler(server.channels, users, shops));
server.addHandler(
  new TradeHandler(server.users, server.channels, users, tradeOffers),
);

await server.start();
console.info("Ready!");

async function gracefulShutdown() {
  await server.stop();
}

process.on("SIGTERM", gracefulShutdown);
