import "dotenv/config";
import { REST, Routes } from "discord.js";
import { getInfos } from "./commands/index.js";

async function main() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  const result = await rest.put(
    Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
    { body: getInfos() },
  );

  console.log(result);
}

main();
