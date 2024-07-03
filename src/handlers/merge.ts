import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import Fuse from "fuse.js";
import { Users } from "../dal/index.js";
import { Random } from "../utils/random.js";
import configs from "../configs/index.js";

export class MergeHandler {
  private spellNames: Fuse<string>;

  static info = new SlashCommandBuilder()
    .setName("merge")
    .setDescription(
      "Convert two copies of a spell into a spell of higher level",
    )
    .addStringOption((option) =>
      option
        .setName("spell")
        .setDescription("the name of the spell to convert")
        .setRequired(true)
        .setAutocomplete(true),
    );

  constructor(private users: Users) {
    this.spellNames = new Fuse(configs.spellNames, {
      threshold: 1,
    });
  }

  async setup() {}

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
    const user = await this.users.get(interaction.user.id);

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

    let reward;
    if (spellId % 12 < 10) {
      const bookIndex = Random.getInt(0, configs.books.length);
      const newSpellId =
        spellId % 12 < 5
          ? 12 * bookIndex + Random.getInt(5, 10)
          : 12 * bookIndex + Random.getInt(10, 12);

      user.incrementSpell(newSpellId);
      reward = configs.spellNames[newSpellId];
    } else {
      user.scrolls += 1;
      reward = ":scroll: ×1";
    }

    await this.users.upsert(user);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      // eslint-disable-next-line no-irregular-whitespace
      .setDescription(`${spellName} ×2 ⟹ ${reward}`);

    await interaction.reply({
      embeds: [embed],
    });
  }

  private async autocomplete(interaction: AutocompleteInteraction) {
    const prefix = interaction.options.getString("spell", true).toLowerCase();
    const user = await this.users.get(interaction.user.id);

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
}
