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
import { Database } from "../dal/database.js";
import { UserSpell } from "../models/user.js";
import configs from "../configs/index.js";

class Checklist {
  data = new Map<number, Set<number>>();

  constructor(spells: UserSpell[]) {
    for (const spell of spells) {
      if (spell.amount > 0) this.add(spell.id);
    }
  }

  has(spellId: number) {
    const bookIndex = Math.floor(spellId / 12);
    return this.getSpellIds(bookIndex).has(spellId);
  }

  add(spellId: number) {
    const bookIndex = Math.floor(spellId / 12);
    this.getSpellIds(bookIndex).add(spellId);
  }

  getDescription(bookIndex: number) {
    const spellIds = this.getSpellIds(bookIndex);
    if (spellIds.size >= 12) {
      return "Complete!";
    }

    let count1 = 0;
    let count2 = 0;
    let count3 = 0;

    for (const spellId of spellIds) {
      if (spellId % 12 < 5) count1++;
      else if (spellId % 12 < 10) count2++;
      else count3++;
    }

    return `${count1} • ${count2} • ${count3} known spells`;
  }

  private getSpellIds(bookIndex: number) {
    let result = this.data.get(bookIndex);
    if (result == null) {
      result = new Set<number>();
      this.data.set(bookIndex, result);
    }

    return result;
  }
}

export class ChecklistHandler {
  static info = new SlashCommandBuilder()
    .setName("checklist")
    .setDescription("Shows which spells you are missing");

  constructor(private db: Database) {}

  async setup() {}

  destroy() {}

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

  private async execute(interaction: ChatInputCommandInteraction) {
    const reply = await this.buildReply(interaction.user.id, 0);
    await interaction.reply(reply);
  }

  private async changeBook(interaction: StringSelectMenuInteraction) {
    const [userId, bookIndexString] = interaction.values[0].split(" ");
    const bookIndex = parseInt(bookIndexString);

    const reply = await this.buildReply(userId, bookIndex);
    await interaction.update(reply);
  }

  private async buildReply(userId: string, bookIndex: number) {
    const user = await this.db.users.get(userId);

    const checklist = new Checklist(user.spells);
    const offset = bookIndex * 12;

    const fields = [
      this.buildSpellList(checklist, "Level 1", offset + 0, offset + 5),
      this.buildSpellList(checklist, "Level 2", offset + 5, offset + 10),
      this.buildSpellList(checklist, "Level 3", offset + 10, offset + 12),
    ];

    const embed = new EmbedBuilder()
      .setColor("Purple")
      .setTitle(
        `${configs.books[bookIndex].icon} ${configs.books[bookIndex].name}`,
      )
      .setFields(fields);

    const options = [];
    for (let bookIndex = 0; bookIndex < configs.books.length; bookIndex++) {
      const book = configs.books[bookIndex];
      const description = checklist.getDescription(bookIndex);

      options.push(
        new StringSelectMenuOptionBuilder()
          .setValue(`${user.id} ${bookIndex}`)
          .setEmoji(book.icon)
          .setLabel(book.name)
          .setDescription(description),
      );
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
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

  private buildSpellList(
    checklist: Checklist,
    name: string,
    minId: number,
    maxId: number,
  ) {
    const content = [];
    for (let spellId = minId; spellId < maxId; spellId++) {
      const spellName = configs.spellNames[spellId];
      content.push(
        format(checklist.has(spellId) ? "☑ %s" : "☐ %s", spellName),
      );
    }

    return {
      name,
      value: content.join("\n"),
      inline: true,
    };
  }
}
