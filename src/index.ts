import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Users } from "./dal/index.js";
import Server from "./server.js";
import {
  ChecklistHandler,
  DailyHandler,
  GrimoireHandler,
  MergeHandler,
} from "./handlers/index.js";

const prisma = new PrismaClient();
const users = new Users(prisma);

const server = new Server();
server.addHandler(new ChecklistHandler(users));
server.addHandler(new DailyHandler(users));
server.addHandler(new GrimoireHandler(users));
server.addHandler(new MergeHandler(users));

await server.start();
console.log("Ready!");

async function gracefulShutdown() {
  await server.stop();
}

process.on("SIGTERM", gracefulShutdown);
