import { format } from "util";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import Users from "../dal/users.js";
import configs from "../configs/index.js";

export default class DailyHandler {
  users: Users;

  static info = new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claims your daily spell");

  constructor(users: Users) {
    this.users = users;
  }

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == DailyHandler.info.name
    ) {
      await this.execute(interaction);
      return true;
    }

    return false;
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const user = await this.users.get(interaction.user.id);
    const now = new Date();

    if (
      user.lastDailyAt != null &&
      now.getTime() - user.lastDailyAt.getTime() < 72000 * 1000
    ) {
      await interaction.reply({
        content: `Try again <t:${Math.ceil(user.lastDailyAt.getTime() / 1000 + 72000)}:R>.`,
        ephemeral: true,
      });

      return;
    }

    const spellId = getRandomSpellId();
    const message =
      configs.gatchaMessages[getRandomInt(configs.gatchaMessages.length)];

    user.addSpell(spellId);
    user.lastDailyAt = now;
    await this.users.upsert(user);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(format(message, configs.spellNames[spellId]));

    await interaction.reply({
      embeds: [embed],
    });
  }
}

function getRandomSpellId(): number {
  const bookIndex = getRandomInt(configs.books.length);
  return 12 * bookIndex + getRandomInt(5);
}

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}
