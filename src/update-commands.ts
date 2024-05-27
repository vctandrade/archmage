import "dotenv/config";
import { REST, Routes } from "discord.js";
import { getInfos } from "./commands/index.js";

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID), {
  body: getInfos(),
});
