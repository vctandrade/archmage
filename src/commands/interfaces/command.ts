import { ChatInputCommandInteraction } from "discord.js";

export default interface Command {
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
