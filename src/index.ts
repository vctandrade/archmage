import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { getCommands } from "./commands/index.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = getCommands();

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    await command?.execute(interaction);
  }
});

await client.login(process.env.DISCORD_TOKEN);

async function gracefulShutdown() {
  await client.destroy();
}

process.on("SIGTERM", gracefulShutdown);
