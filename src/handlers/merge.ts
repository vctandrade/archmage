import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { Users } from "../dal/index.js";
import configs from "../configs/index.js";

export default class MergeHandler {
  users: Users;

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

  constructor(users: Users) {
    this.users = users;
  }

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

  async execute(interaction: ChatInputCommandInteraction) {
    const user = await this.users.get(interaction.user.id);

    const spellName = interaction.options.getString("spell") ?? "";
    const spellId = configs.spellNames.indexOf(spellName);

    if (spellId < 0) {
      await interaction.reply({
        content: "Spell name invalid.",
        ephemeral: true,
      });

      return;
    }

    const spell = user.spells.find((spell) => spell.id == spellId);

    if (spell == null || spell.amount < 2) {
      await interaction.reply({
        content: `You need at least 2 **${spellName}** to proceed.`,
        ephemeral: true,
      });

      return;
    }

    let reward;
    if (spellId % 12 < 10) {
      const bookIndex = getRandomInt(0, configs.books.length);
      const newSpellId =
        spellId % 12 < 5
          ? 12 * bookIndex + getRandomInt(5, 10)
          : 12 * bookIndex + getRandomInt(10, 12);

      user.addSpell(newSpellId, 1);
      reward = configs.spellNames[newSpellId];
    } else {
      user.scrolls += 1;
      reward = ":scroll: ×1";
    }

    spell.amount -= 2;
    await this.users.upsert(user);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      // eslint-disable-next-line no-irregular-whitespace
      .setDescription(`${spellName} ×2 ⟹ ${reward}`);

    await interaction.reply({
      embeds: [embed],
    });
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const user = await this.users.get(interaction.user.id);
    const prefix = interaction.options.getString("spell", true).toLowerCase();

    const suggestions = [];
    for (const spell of user.spells) {
      if (spell.amount < 2) {
        continue;
      }

      const spellName = configs.spellNames[spell.id];
      if (spellName.toLowerCase().startsWith(prefix)) {
        suggestions.push(spellName);
      }
    }

    await interaction.respond(
      suggestions.map((suggestion) => ({
        name: suggestion,
        value: suggestion,
      })),
    );
  }
}

function getRandomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}
