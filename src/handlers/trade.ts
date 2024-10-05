import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelManager,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
  UserManager,
} from "discord.js";
import Fuse from "fuse.js";
import { Database } from "../dal/database.js";
import { TradeOffer, User } from "../models/index.js";
import { HashMap } from "../collections/hash-map.js";
import { Lock } from "../utils/lock.js";
import { Task } from "../utils/task.js";
import { sleepUntil } from "../utils/time.js";
import configs from "../configs/index.js";

export class TradeHandler {
  private spellIds: Map<string, number>;
  private spellNames: Fuse<string>;
  private tasks = new HashMap<TradeOffer, Task>();

  static info = new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Make a trade offer to other players")
    .addStringOption((option) =>
      option
        .setName("give")
        .setDescription("Comma-separated names of the offered spells")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("receive")
        .setDescription("Comma-separated names of the desired spells")
        .setRequired(true),
    );

  constructor(
    private userManager: UserManager,
    private channelManager: ChannelManager,
    private db: Database,
    private lock: Lock,
  ) {
    this.spellIds = new Map();
    for (let i = 0; i < configs.spellNames.length; i++) {
      this.spellIds.set(configs.spellNames[i].toLowerCase(), i);
    }

    this.spellNames = new Fuse(configs.spellNames, {
      threshold: 1,
    });
  }

  async setup() {
    const tradeOffers = await this.db.tradeOffers.getAll();
    for (const tradeOffer of tradeOffers) {
      const task = this.createTask(tradeOffer);
      this.expire(tradeOffer, task).catch(console.error);
    }
  }

  destroy() {
    for (const task of this.tasks.values()) {
      task.cancel();
    }
  }

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == TradeHandler.info.name
    ) {
      await this.execute(interaction);
      return true;
    }

    if (interaction.isButton()) {
      switch (interaction.customId) {
        case `${TradeHandler.info.name}.accept`:
          await this.accept(interaction);
          return true;

        case `${TradeHandler.info.name}.abort`:
          await this.abort(interaction);
          return true;
      }
    }

    return false;
  }

  private async execute(interaction: ChatInputCommandInteraction) {
    let give, receive;

    try {
      give = this.parse(interaction.options.getString("give", true));
      receive = this.parse(interaction.options.getString("receive", true));
    } catch (error) {
      if (!(error instanceof ErrorInvalidSpell)) {
        throw error;
      }

      const suggestions = this.spellNames.search(error.spellName);
      await interaction.reply({
        content: `The spell "**${error.spellName}**" is unknown to me. Perhaps you mean ${suggestions[0].item}?`,
        ephemeral: true,
      });

      return;
    }

    const reply = this.buildReply(interaction, give, receive);
    const message = await interaction.reply(reply);

    const tradeOffer = await this.db.tradeOffers.create(
      interaction.channelId,
      message.id,
      interaction.user.id,
      give,
      receive,
    );

    const task = this.createTask(tradeOffer);
    this.expire(tradeOffer, task).catch(console.error);
  }

  private async accept(interaction: ButtonInteraction) {
    const tradeOffer = await this.db.tradeOffers.get(
      interaction.channelId,
      interaction.message.id,
    );

    if (tradeOffer == null) {
      await interaction.reply({
        content: "Fate has already been sealed.",
        ephemeral: true,
      });

      return;
    }

    if (interaction.user.id == tradeOffer.userId) {
      await interaction.reply({
        content: "One may not accept their own offer.",
        ephemeral: true,
      });

      return;
    }

    const giver = await this.db.users.get(tradeOffer.userId);
    const receiver = await this.db.users.get(interaction.user.id);

    try {
      for (const spellId of tradeOffer.give) {
        this.transferSpell(spellId, giver, receiver);
      }

      for (const spellId of tradeOffer.receive) {
        this.transferSpell(spellId, receiver, giver);
      }
    } catch (error) {
      if (!(error instanceof ErrorBadSpellTransfer)) {
        throw error;
      }

      const user = await this.userManager.fetch(error.userId);

      await interaction.reply({
        content: `${user.displayName} is unable to bestow the knowledge of **${error.spellName}** upon you.`,
        ephemeral: true,
      });

      return;
    }

    const task = this.getTask(tradeOffer);
    task.cancel();

    await this.db.withTransaction(async (tx) => {
      await tx.users.upsert(giver);
      await tx.users.upsert(receiver);
    });

    const embed = new EmbedBuilder(interaction.message.embeds[0].data)
      .setColor("Green")
      .setFooter({ text: `Accepted by ${interaction.user.displayName}` })
      .setTimestamp(Date.now());

    await interaction.update({
      embeds: [embed],
      components: [],
    });

    await this.db.tradeOffers.delete(
      interaction.channelId,
      interaction.message.id,
    );
  }

  private async abort(interaction: ButtonInteraction) {
    const tradeOffer = await this.db.tradeOffers.get(
      interaction.channelId,
      interaction.message.id,
    );

    if (tradeOffer == null) {
      await interaction.reply({
        content: "Fate has already been sealed.",
        ephemeral: true,
      });

      return;
    }

    if (interaction.user.id != tradeOffer.userId) {
      await interaction.reply({
        content: "You lack the priviledge to do so.",
        ephemeral: true,
      });

      return;
    }

    const task = this.getTask(tradeOffer);
    task.cancel();

    const embed = new EmbedBuilder(interaction.message.embeds[0].data)
      .setColor("Red")
      .setFooter({ text: "Aborted" })
      .setTimestamp(Date.now());

    await interaction.update({
      embeds: [embed],
      components: [],
    });

    await this.db.tradeOffers.delete(
      interaction.channelId,
      interaction.message.id,
    );
  }

  private createTask(tradeOffer: TradeOffer) {
    const result = new Task();
    this.tasks.set(tradeOffer, result);
    result.on("cancel", () => this.tasks.delete(tradeOffer));
    return result;
  }

  private getTask(tradeOffer: TradeOffer) {
    return this.tasks.get(tradeOffer) ?? Task.cancel();
  }

  private async expire(tradeOffer: TradeOffer, task: Task) {
    await sleepUntil(tradeOffer.expiresAt, task);
    await this.lock.acquire();

    try {
      if (task.isCancelled) {
        return;
      }

      this.tasks.delete(tradeOffer);

      const channel = await this.channelManager.fetch(tradeOffer.channelId);
      if (channel == null || !channel.isTextBased()) {
        throw new Error(`Invalid channelId: "${tradeOffer.channelId}".`);
      }

      const message = await channel.messages.fetch(tradeOffer.messageId);
      const embed = new EmbedBuilder(message.embeds[0].data)
        .setColor("Red")
        .setFooter({ text: "Expired" })
        .setTimestamp(Date.now());

      await message.edit({
        embeds: [embed],
        components: [],
      });

      await this.db.tradeOffers.delete(
        tradeOffer.channelId,
        tradeOffer.messageId,
      );
    } finally {
      this.lock.release();
    }
  }

  private parse(input: string) {
    const result = [];
    for (let spellName of input.split(",")) {
      spellName = spellName.trim();

      const spellId = this.spellIds.get(spellName.toLowerCase());
      if (spellId == null) {
        throw new ErrorInvalidSpell(spellName);
      }

      result.push(spellId);
    }

    result.sort();
    return result;
  }

  private buildReply(
    interaction: Interaction,
    give: number[],
    receive: number[],
  ) {
    const fields = [
      {
        name: interaction.user.displayName,
        value: this.format(give),
        inline: true,
      },
      {
        name: "⇄",
        value: " ",
        inline: true,
      },
      {
        name: "You",
        value: this.format(receive),
        inline: true,
      },
    ];

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("Trade Offer")
      .setFields(fields)
      .setFooter({ text: "Expires in 1 hour" });

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(`${TradeHandler.info.name}.accept`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${TradeHandler.info.name}.abort`)
        .setLabel("Abort")
        .setStyle(ButtonStyle.Danger),
    );

    return {
      embeds: [embed],
      components: [row],
      fetchReply: true,
    };
  }

  private format(spellIds: number[]) {
    return spellIds.map((spellId) => configs.spellNames[spellId]).join("\n");
  }

  private transferSpell(spellId: number, giver: User, receiver: User) {
    try {
      giver.decrementSpell(spellId);
      receiver.incrementSpell(spellId);
    } catch {
      throw new ErrorBadSpellTransfer(giver.id, configs.spellNames[spellId]);
    }
  }
}

class ErrorInvalidSpell extends Error {
  constructor(public spellName: string) {
    super(`Invalid spell name: "${spellName}".`);
  }
}

class ErrorBadSpellTransfer extends Error {
  constructor(
    public userId: string,
    public spellName: string,
  ) {
    super(`User with id="${userId}" cannot transfer spell "${spellName}".`);
  }
}
