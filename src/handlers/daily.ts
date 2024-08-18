import { format } from "util";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { Database } from "../dal/database.js";
import { Random } from "../utils/random.js";
import configs from "../configs/index.js";

export class DailyHandler {
  static info = new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claims your daily spell");

  constructor(private db: Database) {}

  async setup() {}

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

  private async execute(interaction: ChatInputCommandInteraction) {
    const user = await this.db.users.get(interaction.user.id);
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

    const spellId = Random.getSpellId(1);
    const message = Random.sample(configs.gatchaMessages);

    user.incrementSpell(spellId);
    user.lastDailyAt = now;
    await this.db.users.upsert(user);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(format(message, configs.spellNames[spellId]));

    await interaction.reply({
      embeds: [embed],
    });
  }
}
