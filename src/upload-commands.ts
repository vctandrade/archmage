import "dotenv/config";

import { REST, Routes } from "discord.js";
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

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID), {
  body: [
    ChecklistHandler.info,
    DailyHandler.info,
    GiveHandler.info,
    GrimoireHandler.info,
    MergeHandler.info,
    ShopHandler.info,
    StreamHandler.infoBanish,
    StreamHandler.infoConjure,
    StreamHandler.infoDismiss,
    StreamHandler.infoSummon,
    TradeHandler.info,
  ],
});

console.info("Done!");
process.exit(0); // This is needed because yt-stream calls setInterval on import
