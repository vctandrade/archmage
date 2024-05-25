import { format } from "util";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import Command from "./interfaces/command.js";
import Users from "../dal/users.js";
import configs from "../configs/index.js";

class DailyCommand implements Command {
  users: Users;

  constructor(users: Users) {
    this.users = users;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = await this.users.get(interaction.user.id);
    const now = new Date();

    if (
      user.lastDailyAt != null &&
      now.getTime() - user.lastDailyAt.getTime() < 72000 * 1000
    ) {
      interaction.reply(
        `Try again <t:${Math.ceil(user.lastDailyAt.getTime() / 1000 + 72000)}:R>.`,
      );
      return;
    }

    const bookIndex = getRandomInt(configs.books.length);
    const spellId = bookIndex * 12 + getRandomInt(5);
    const message =
      configs.gatchaMessages[getRandomInt(configs.gatchaMessages.length)];

    user.addSpell(spellId);
    user.lastDailyAt = now;
    await this.users.upsert(user);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(format(message, configs.spellNames[spellId]));

    interaction.reply({
      embeds: [embed],
    });
  }
}

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export default {
  getInfo() {
    return new SlashCommandBuilder()
      .setName("daily")
      .setDescription("Claims your daily spell");
  },

  getCommand(users: Users) {
    return new DailyCommand(users);
  },
};
