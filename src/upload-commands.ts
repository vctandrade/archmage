import "dotenv/config";
import { REST, Routes } from "discord.js";
import {
  ChecklistHandler,
  DailyHandler,
  GiveHandler,
  GrimoireHandler,
  MergeHandler,
  ShopHandler,
  TradeHandler,
} from "./handlers/index.js";

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID), {
  body: [
    ChecklistHandler.info,
    DailyHandler.info,
    GiveHandler.info,
    GrimoireHandler.info,
    MergeHandler.info,
    ShopHandler.info,
    TradeHandler.info,
  ],
});
