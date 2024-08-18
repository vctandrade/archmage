import "dotenv/config";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { PrismaClient } from "@prisma/client";
import Server from "./server.js";
import { Database } from "./dal/database.js";
import {
  ChecklistHandler,
  DailyHandler,
  GiveHandler,
  GrimoireHandler,
  MergeHandler,
  ShopHandler,
  TradeHandler,
} from "./handlers/index.js";
import { Lock } from "./utils/lock.js";

dayjs.extend(customParseFormat);

const lock = new Lock();
const server = new Server(lock);

const prisma = new PrismaClient();
const db = new Database(prisma);

server.addHandler(new ChecklistHandler(db));
server.addHandler(new DailyHandler(db));
server.addHandler(new GiveHandler(db));
server.addHandler(new GrimoireHandler(db));
server.addHandler(new MergeHandler(db));
server.addHandler(new ShopHandler(server.channels, db, lock));
server.addHandler(new TradeHandler(server.users, server.channels, db, lock));

await server.start();
console.info("Ready!");

async function gracefulShutdown() {
  await server.stop();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, gracefulShutdown);
}
