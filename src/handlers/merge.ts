import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import Fuse from "fuse.js";
import { Database } from "../dal/database.js";
import configs from "../configs/index.js";

export class MergeHandler {
  private spellNames: Fuse<string>;

  static info = new SlashCommandBuilder()
    .setName("merge")
    .setDescription("Convert two copies of a spell into scrolls")
    .addStringOption((option) =>
      option
        .setName("spell")
        .setDescription("The name of a spell you want to merge")
        .setRequired(true)
        .setAutocomplete(true),
    );

  constructor(private db: Database) {
    this.spellNames = new Fuse(configs.spellNames, {
      threshold: 1,
    });
  }

  async setup() {}

  dispose() {}

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == MergeHandler.info.name
    ) {
      await this.execute(interaction);
      return true;
    }

    if (
      interaction.isAutocomplete() &&
      interaction.commandName == MergeHandler.info.name
    ) {
      await this.autocomplete(interaction);
      return true;
    }

    return false;
  }

  private async execute(interaction: ChatInputCommandInteraction) {
    const user = await this.db.users.get(interaction.user.id);

    const spellName = interaction.options.getString("spell", true);
    const spellId = configs.spellNames.indexOf(spellName);

    if (spellId < 0) {
      const suggestions = this.spellNames.search(spellName);
      await interaction.reply({
        content: `That spell is unknown to me. Perhaps you mean **${suggestions[0].item}**?`,
        ephemeral: true,
      });

      return;
    }

    try {
      user.decrementSpell(spellId, 2);
    } catch {
      await interaction.reply({
        content: `You must possess at least 2 **${spellName}** to proceed.`,
        ephemeral: true,
      });

      return;
    }

    let scrolls;
    switch (this.getSpellLevel(spellId)) {
      case 1:
        scrolls = 3;
        break;

      case 2:
        scrolls = 5;
        break;

      case 3:
        scrolls = 8;
        break;
    }

    user.scrolls += scrolls;
    await this.db.users.upsert(user);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(`**${spellName}** ×2 ⟹ :scroll: ×${scrolls}`);

    await interaction.reply({
      embeds: [embed],
    });
  }

  private async autocomplete(interaction: AutocompleteInteraction) {
    const prefix = interaction.options.getString("spell", true).toLowerCase();
    const user = await this.db.users.get(interaction.user.id);

    const result = [];
    for (const spell of user.spells) {
      if (result.length >= 25) {
        break;
      }

      if (spell.amount < 2) {
        continue;
      }

      const spellName = configs.spellNames[spell.id];
      if (spellName.toLowerCase().startsWith(prefix)) {
        result.push({
          name: spellName,
          value: spellName,
        });
      }
    }

    await interaction.respond(result);
  }

  private getSpellLevel(spellId: number) {
    if (spellId % 12 < 5) {
      return 1;
    }

    if (spellId % 12 < 10) {
      return 2;
    }

    return 3;
  }
}
