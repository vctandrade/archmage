import {
  ActionRowBuilder,
  ChannelManager,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextBasedChannel,
} from "discord.js";
import dayjs from "dayjs";
import configs from "../configs/index.js";
import { Shops, Users } from "../dal/index.js";
import { Shop } from "../models/index.js";
import { Random } from "../utils/random.js";
import { Task } from "../utils/task.js";
import { TableBuilder } from "../utils/table.js";
import { sleepFor, sleepUntil } from "../utils/time.js";

type Item = {
  name: string;
  id: string;
  price: number;
  amount?: number;
};

export class ShopHandler {
  private tasks = new Map<string, Task>();

  static info = new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Configures a shop in this channel")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("open")
        .setDescription("Sets the time for the shop to open")
        .addStringOption((option) =>
          option
            .setName("time")
            .setDescription('Time of day in the format "2:30 pm -0300"')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("close").setDescription("Closes the shop"),
    );

  constructor(
    private channelManager: ChannelManager,
    private users: Users,
    private shops: Shops,
  ) {}

  async setup() {
    const shops = await this.shops.getAll();
    for (const shop of shops) {
      const task = this.createTask(shop.channelId);
      this.update(shop.channelId, dayjs(shop.updatesAt), task).catch(
        console.error,
      );
    }
  }

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == ShopHandler.info.name
    ) {
      await this.execute(interaction);
      return true;
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId == `${ShopHandler.info.name} buy`
    ) {
      await this.buy(interaction);
      return true;
    }

    return false;
  }

  private async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case "open":
        await this.open(interaction);
        return;

      case "close":
        await this.close(interaction);
        return;
    }

    throw new Error(`Unkown subcommand: "${subcommand}".`);
  }

  private async open(interaction: ChatInputCommandInteraction) {
    let time = dayjs(interaction.options.getString("time", true), "h:mm a ZZ");
    if (!time.isValid()) {
      await interaction.reply({
        content: "That moment in time eludes me.",
        ephemeral: true,
      });

      return;
    }

    while (time.isBefore()) {
      time = time.add(1, "day");
    }

    const task = this.getTask(interaction.channelId);
    await task.lock.acquire();
    task.cancel();

    const taskNew = this.createTask(interaction.channelId);
    taskNew.lock.acquire();
    task.lock.release();

    let shop;
    try {
      shop = await this.shops.get(interaction.channelId);
      shop ??= new Shop({ channelId: interaction.channelId });
      shop.updatesAt = time.toDate();
      await this.shops.upsert(shop);
    } finally {
      taskNew.lock.release();
    }

    await interaction.reply({
      content: "I will prepare my wares.",
      ephemeral: true,
    });

    this.update(shop.channelId, time, taskNew).catch(console.error);
  }

  private async close(interaction: ChatInputCommandInteraction) {
    const task = this.getTask(interaction.channelId);
    await task.lock.acquire();

    try {
      if (task.cancelled) {
        await interaction.reply({
          content: "One cannot close that which is not open.",
          ephemeral: true,
        });

        return;
      }

      task.cancel();

      const shop = await this.shops.get(interaction.channelId);
      if (shop == null) {
        throw new Error(
          `Shop not found with channelId=${interaction.channelId}.`,
        );
      }

      const channel = await this.channelManager.fetch(shop.channelId);
      if (channel == null || !channel.isTextBased()) {
        throw new Error(`Invalid channelId: ${shop.channelId}.`);
      }

      await this.expire(channel, shop.messageId);
      await this.shops.delete(shop.channelId);

      await interaction.reply({
        content: "See you next time!",
        ephemeral: true,
      });
    } finally {
      task.lock.release();
    }
  }

  private async buy(interaction: StringSelectMenuInteraction) {
    const task = this.getTask(interaction.channelId);
    await task.lock.acquire();

    try {
      if (task.cancelled) {
        await interaction.reply({
          content: "I must apologize, for my wares are unavailable.",
          ephemeral: true,
        });

        return;
      }

      const shop = await this.shops.get(interaction.channelId);
      if (shop == null) {
        throw new Error(
          `Shop not found with channelId=${interaction.channelId}.`,
        );
      }

      const channel = await this.channelManager.fetch(shop.channelId);
      if (channel == null || !channel.isTextBased()) {
        throw new Error(`Invalid channelId: ${shop.channelId}.`);
      }

      if (shop.messageId == null) {
        throw new Error(
          `Shop with channelId="${shop.channelId}" has no message.`,
        );
      }

      const message = await channel.messages.fetch(shop.messageId);
      const user = await this.users.get(interaction.user.id);
      const itemId = interaction.values[0];

      let spellId;
      let price;

      switch (itemId) {
        case "gatcha-2":
          spellId = Random.getSpellId(2);
          price = 3;
          break;

        case "gatcha-3":
          spellId = Random.getSpellId(3);
          price = 5;
          break;

        default:
          spellId = Number(itemId);
          price = this.getSpellPrice(spellId);

          try {
            shop.decrementSpell(spellId);
          } catch (error) {
            await interaction.reply({
              content: "I cannot sell that which I do not possess.",
              ephemeral: true,
            });

            await message.edit({
              components: message.components,
            });

            return;
          }

          break;
      }

      if (price > user.scrolls) {
        await interaction.reply({
          content: "The price of this item is beyond your reach.",
          ephemeral: true,
        });

        await message.edit({
          components: message.components,
        });

        return;
      }

      user.scrolls -= price;
      user.incrementSpell(spellId);

      // TODO: transaction
      await this.users.upsert(user);
      await this.shops.upsert(shop);

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setDescription(
          `:scroll: ×${price} ⟹ **${configs.spellNames[spellId]}** ×1`,
        );

      await interaction.reply({
        embeds: [embed],
      });

      const ui = this.buildUI(shop);
      await message.edit(ui);
      channel.messages.cache.delete(message.id);
    } finally {
      task.lock.release();
    }
  }

  private async update(channelId: string, updatesAt: dayjs.Dayjs, task: Task) {
    while (true) {
      await sleepUntil(updatesAt.toDate(), task);
      await task.lock.acquire();

      try {
        if (task.cancelled) {
          return;
        }

        const channel = await this.channelManager.fetch(channelId);
        if (channel == null || !channel.isTextBased()) {
          this.shops.delete(channelId);
          console.warn(
            `Deleted shop because channelId="${channelId}" was invalid.`,
          );
          return;
        }

        const shop = await this.shops.get(channelId);
        if (shop == null) {
          task.cancel();
          console.warn(
            `Cancelled task because shop with channelId="${channelId}" was not found.`,
          );
          return;
        }

        await this.expire(channel, shop.messageId);
        const message = await channel.send("I bring wares!");

        while (updatesAt.isBefore()) {
          updatesAt = updatesAt.add(1, "day");
        }

        shop.updatesAt = updatesAt.toDate();
        shop.messageId = message.id;

        this.setRandomSpells(shop);
        await this.shops.upsert(shop);

        const ui = this.buildUI(shop);
        await message.edit(ui);
        channel.messages.cache.delete(message.id);
      } catch (error) {
        console.error(error);
        await sleepFor(5000);
      } finally {
        task.lock.release();
      }
    }
  }

  private createTask(channelId: string) {
    if (this.tasks.has(channelId)) {
      throw new Error(`Task for channelId="${channelId}" already exists.`);
    }

    const result = new Task();
    this.tasks.set(channelId, result);
    result.onCancel(() => this.tasks.delete(channelId));
    return result;
  }

  private getTask(channelId: string) {
    return this.tasks.get(channelId) ?? Task.cancel();
  }

  private async expire(channel: TextBasedChannel, messageId: string | null) {
    if (messageId == null) {
      return;
    }

    const message = await channel.messages.fetch(messageId);
    if (message.embeds.length == 0) {
      return;
    }

    const embed = new EmbedBuilder(message.embeds[0].data)
      .setColor("Red")
      .setFooter({ text: "Closed" })
      .setTimestamp(Date.now());

    await message.edit({
      embeds: [embed],
      components: [],
    });
  }

  private setRandomSpells(shop: Shop) {
    shop.spells = [];

    for (let i = 0; i < 3; i++) {
      shop.addSpell(Random.getSpellId(1), 1);
    }

    for (let i = 0; i < 3; i++) {
      shop.addSpell(Random.getSpellId(2), 1);
    }
  }

  private buildUI(shop: Shop) {
    const items: Item[] = [
      {
        name: "Random level 2",
        id: "gatcha-2",
        price: 3,
      },
      {
        name: "Random level 3",
        id: "gatcha-3",
        price: 5,
      },
    ];

    for (const spell of shop.spells) {
      items.push({
        name: configs.spellNames[spell.id],
        id: spell.id.toString(),
        price: this.getSpellPrice(spell.id),
        amount: spell.amount,
      });
    }

    const tableBuilder = new TableBuilder(
      ["Qty", "Spell", "📜"],
      ["r", "l", "r"],
    );

    for (const item of items) {
      tableBuilder.addRow([item.amount ?? "∞", item.name, item.price]);
    }

    const options = [];
    for (const item of items) {
      if (item.amount == null || item.amount > 0) {
        options.push(
          new StringSelectMenuOptionBuilder()
            .setValue(item.id)
            .setLabel(item.name),
        );
      }
    }

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("Shop")
      .setDescription("```" + tableBuilder.build() + "```")
      .setFooter({ text: "Closes in 24 hours" });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${ShopHandler.info.name} buy`)
        .setPlaceholder("What does your heart desire?")
        .setOptions(...options),
    );

    return {
      content: "",
      embeds: [embed],
      components: [row],
      fetchReply: true,
    };
  }

  private getSpellPrice(spellId: number) {
    if (spellId % 12 < 5) {
      return 3;
    }

    if (spellId % 12 < 10) {
      return 5;
    }

    return 8;
  }
}
