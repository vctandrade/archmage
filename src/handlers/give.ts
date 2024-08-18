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

export class GiveHandler {
  private spellNames: Fuse<string>;

  static info = new SlashCommandBuilder()
    .setName("give")
    .setDescription("Adds a spell to a mage's grimoire")
    .addUserOption((option) =>
      option
        .setName("mage")
        .setDescription("The mage to whom give the spell")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("spell")
        .setDescription("The name of the spell to give")
        .setRequired(true)
        .setAutocomplete(true),
    );

  constructor(private db: Database) {
    this.spellNames = new Fuse(configs.spellNames, {
      threshold: 1,
    });
  }

  async setup() {}

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == GiveHandler.info.name
    ) {
      await this.execute(interaction);
      return true;
    }

    if (
      interaction.isAutocomplete() &&
      interaction.commandName == GiveHandler.info.name
    ) {
      await this.autocomplete(interaction);
      return true;
    }

    return false;
  }

  private async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("mage", true);
    const spellName = interaction.options.getString("spell", true);

    const user = await this.db.users.get(target.id);
    const spellId = configs.spellNames.indexOf(spellName);

    if (spellId < 0) {
      const suggestions = this.spellNames.search(spellName);
      await interaction.reply({
        content: `That spell is unknown to me. Perhaps you mean **${suggestions[0].item}**?`,
        ephemeral: true,
      });

      return;
    }

    user.incrementSpell(spellId);
    await this.db.users.upsert(user);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(`**${spellName}** was gifted to ${target}.`);

    await interaction.reply({
      embeds: [embed],
    });
  }

  private async autocomplete(interaction: AutocompleteInteraction) {
    const prefix = interaction.options.getString("spell", true).toLowerCase();

    const result = [];
    for (const spellName of configs.spellNames) {
      if (result.length >= 25) {
        break;
      }

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
