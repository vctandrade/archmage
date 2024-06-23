import { format } from "util";
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import Users from "../dal/users.js";
import configs from "../configs/index.js";

export default class ChecklistHandler {
  users: Users;

  static info = new SlashCommandBuilder()
    .setName("checklist")
    .setDescription("Shows which spells you are missing");

  constructor(users: Users) {
    this.users = users;
  }

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == ChecklistHandler.info.name
    ) {
      await this.execute(interaction);
      return true;
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId == ChecklistHandler.info.name
    ) {
      await this.changeBook(interaction);
      return true;
    }

    return false;
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const reply = await this.buildReply(interaction.user.id, 0);
    await interaction.reply(reply);
  }

  async changeBook(interaction: StringSelectMenuInteraction) {
    const [userId, bookIndexString] = interaction.values[0].split(" ");
    const bookIndex = parseInt(bookIndexString);

    const reply = await this.buildReply(userId, bookIndex);
    await interaction.update(reply);
  }

  async buildReply(userId: string, bookIndex: number) {
    const user = await this.users.get(userId);

    const unknownSpellsByBook = new Map<number, number>();
    const spellIds = new Set<number>();

    const countUnknownSpells = (bookIndex: number) =>
      unknownSpellsByBook.get(bookIndex) ?? 12;

    for (const spell of user.spells) {
      if (spell.amount <= 0) {
        continue;
      }

      const bookIndex = Math.floor(spell.id / 12);
      unknownSpellsByBook.set(bookIndex, countUnknownSpells(bookIndex) - 1);
      spellIds.add(spell.id);
    }

    function buildSpellList(name: string, minId: number, maxId: number) {
      const content = [];
      for (let spellId = minId; spellId < maxId; spellId++) {
        const spellName = configs.spellNames[spellId];
        content.push(
          format(spellIds.has(spellId) ? "~~%s~~" : "%s", spellName),
        );
      }

      return {
        name,
        value: content.join("\n"),
        inline: true,
      };
    }

    const offset = bookIndex * 12;

    const fields = [
      buildSpellList("Level 1", offset, offset + 5),
      buildSpellList("Level 2", offset + 5, offset + 10),
      buildSpellList("Level 3", offset + 10, offset + 12),
    ];

    const embed = new EmbedBuilder()
      .setColor("Purple")
      .setTitle(
        `${configs.books[bookIndex].icon} ${configs.books[bookIndex].name}`,
      )
      .addFields(fields);

    const options = [];
    for (let bookIndex = 0; bookIndex < configs.books.length; bookIndex++) {
      const book = configs.books[bookIndex];

      const unknownSpells = countUnknownSpells(bookIndex);
      const description =
        unknownSpells > 0 ? `${unknownSpells} unknown spells` : "Complete!";

      options.push(
        new StringSelectMenuOptionBuilder()
          .setEmoji(book.icon)
          .setLabel(book.name)
          .setValue(`${user.id} ${bookIndex}`)
          .setDescription(description),
      );
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(ChecklistHandler.info.name)
        .setPlaceholder("Display another book")
        .setOptions(options),
    );

    return {
      embeds: [embed],
      components: [row],
    };
  }
}
