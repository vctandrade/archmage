import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { Database } from "../dal/database.js";
import { UserSpell } from "../models/index.js";
import configs from "../configs/index.js";

export class GrimoireHandler {
  static info = new SlashCommandBuilder()
    .setName("grimoire")
    .setDescription("Shows all known spells of a mage")
    .addUserOption((option) =>
      option
        .setName("mage")
        .setDescription("The mage whose grimoire you want to see"),
    );

  constructor(private db: Database) {}

  async setup() {}

  dispose() {}

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == GrimoireHandler.info.name
    ) {
      await this.execute(interaction);
      return true;
    }

    return false;
  }

  private async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("mage") ?? interaction.user;

    const user = await this.db.users.get(target.id);
    user.spells.sort((a, b) => a.id - b.id);

    const grimoire = new Map<number, UserSpell[]>();
    for (const spell of user.spells) {
      const bookIndex = Math.floor(spell.id / 12);

      let spells = grimoire.get(bookIndex);
      if (spells == null) {
        grimoire.set(bookIndex, (spells = []));
      }

      spells.push(spell);
    }

    const embed = new EmbedBuilder().setColor("Purple").setAuthor({
      name: target.displayName,
      iconURL: target.displayAvatarURL(),
    });

    const fields = [];
    for (const [bookIndex, spells] of grimoire) {
      const book = configs.books[bookIndex];

      const content = [];
      for (const spell of spells) {
        if (spell.amount < 1) {
          continue;
        }

        content.push(
          `${configs.spellNames[spell.id]}${spell.amount > 1 ? ` ×${spell.amount}` : ""}`,
        );
      }

      if (content.length == 0) {
        continue;
      }

      fields.push({
        name: `${book.icon} ${book.name}`,
        value: content.join("\n"),
        inline: true,
      });
    }

    if (fields.length == 0) {
      embed.setDescription("This mage knows no spells.");
    } else {
      embed.setFields(fields);
    }

    if (user.scrolls > 0) {
      embed.setFooter({
        text: `📜 ×${user.scrolls}`,
      });
    }

    await interaction.reply({
      embeds: [embed],
    });
  }
}
