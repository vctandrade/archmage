import "dotenv/config";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { PrismaClient } from "@prisma/client";
import { Database } from "./dal/database.js";
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
const db = new Database(prisma);

const server = new Server();
server.addHandler(new ChecklistHandler(db));
server.addHandler(new DailyHandler(db));
server.addHandler(new GiveHandler(db));
server.addHandler(new GrimoireHandler(db));
server.addHandler(new MergeHandler(db));
server.addHandler(new ShopHandler(server.channels, db));
server.addHandler(new TradeHandler(server.users, server.channels, db));

await server.start();
console.info("Ready!");

async function gracefulShutdown() {
  await server.stop();
}

process.on("SIGTERM", gracefulShutdown);
