import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import Command from "./interfaces/command.js";
import Users from "../dal/users.js";
import configs from "../configs/index.js";

class MergeCommand implements Command {
  users: Users;

  constructor(users: Users) {
    this.users = users;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
}

function getRandomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

export default {
  getInfo() {
    return new SlashCommandBuilder()
      .setName("merge")
      .setDescription(
        "Convert two copies of a spell into a spell of higher level",
      )
      .addStringOption((option) =>
        option
          .setName("spell")
          .setDescription("the name of the spell to convert")
          .setRequired(true),
      );
  },

  getCommand(users: Users) {
    return new MergeCommand(users);
  },
};
