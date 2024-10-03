import "dotenv/config";

import ytstream from "yt-stream";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { PrismaClient } from "@prisma/client";
import { Database } from "./dal/database.js";
import {
  ChecklistHandler,
  DailyHandler,
  GiveHandler,
  GrimoireHandler,
  MergeHandler,
  ShopHandler,
  StreamHandler,
  TradeHandler,
} from "./handlers/index.js";
import { Lock } from "./utils/lock.js";
import Server from "./server.js";

ytstream.setPreference("api", "ANDROID");
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
server.addHandler(new StreamHandler(server));
server.addHandler(new TradeHandler(server.users, server.channels, db, lock));

await server.start();
console.info("Ready!");

async function gracefulShutdown() {
  console.info("Shutting down.");
  await server.dispose();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, gracefulShutdown);
}
