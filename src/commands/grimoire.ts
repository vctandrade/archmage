import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import Command from "./interfaces/command.js";
import Users from "../dal/users.js";
import { UserSpell } from "../models/user.js";
import configs from "../configs/index.js";

class GrimoireCommand implements Command {
  users: Users;

  constructor(users: Users) {
    this.users = users;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser("mage") ?? interaction.user;

    const user = await this.users.get(target.id);
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
      iconURL: target.avatarURL() ?? undefined,
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
      embed.addFields(fields);
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

export default {
  getInfo() {
    return new SlashCommandBuilder()
      .setName("grimoire")
      .setDescription("Show all known spells of a mage")
      .addUserOption((option) =>
        option
          .setName("mage")
          .setDescription("the mage whose grimoire you want to see"),
      );
  },

  getCommand(users: Users) {
    return new GrimoireCommand(users);
  },
};
