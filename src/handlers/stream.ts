import {
  ActivityType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
  VoiceChannel,
} from "discord.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import ytstream, { Stream } from "yt-stream";
import Server from "../server.js";
import { Random } from "../utils/random.js";

export class StreamHandler {
  static infoSummon = new SlashCommandBuilder()
    .setName("summon")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The voice channel you wish to summon me into")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true),
    )
    .setDescription("Summons me into a voice channel");

  static infoDismiss = new SlashCommandBuilder()
    .setName("dismiss")
    .setDescription("Dismisses me from all voice channels");

  static infoConjure = new SlashCommandBuilder()
    .setName("conjure")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The URL of a song or playlist on YouTube")
        .setRequired(true),
    )
    .setDescription("Conjures a song into the playlist");

  static infoBanish = new SlashCommandBuilder()
    .setName("banish")
    .setDescription("Banishes the current song");

  managers = new Map<string, Manager>();

  constructor(private server: Server) {}

  async setup() {}

  dispose() {
    for (let manager of this.managers.values()) {
      manager.dispose();
    }
  }

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.infoSummon.name
    ) {
      await this.summon(interaction);
      return true;
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.infoDismiss.name
    ) {
      await this.dismiss(interaction);
      return true;
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.infoConjure.name
    ) {
      await this.conjure(interaction);
      return true;
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.infoBanish.name
    ) {
      await this.banish(interaction);
      return true;
    }

    return false;
  }

  async summon(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel<ChannelType.GuildVoice>(
      "channel",
      true,
    );

    const manager =
      this.managers.get(channel.guild.id) ?? new Manager(this.server);

    try {
      await manager.connect(channel);
      this.managers.set(channel.guild.id, manager);

      await interaction.reply({
        content: "I am at your command.",
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      manager.dispose();
    }
  }

  async dismiss(interaction: ChatInputCommandInteraction) {
    this.server.setActivity();

    if (interaction.guild != null) {
      const manager = this.managers.get(interaction.guild.id);
      if (manager != null) {
        manager.dispose();
        this.managers.delete(interaction.guild.id);
      }
    }

    await interaction.reply({
      content: "At last, I have greater matters to attend to.",
      ephemeral: true,
    });
  }

  async conjure(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url", true);

    let manager;
    if (interaction.guild != null) {
      manager = this.managers.get(interaction.guild.id);
    }

    if (manager == null) {
      await interaction.reply({
        content: "I shall not aid you lest I'm summoned.",
        ephemeral: true,
      });

      return;
    }

    if (ytstream.validateVideoURL(url)) {
      const data = await ytstream.getInfo(url);
      await manager.add(url);

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setDescription(`You conjured the sounds of **${data.title}**.`);

      await interaction.reply({
        embeds: [embed],
      });

      return;
    }

    if (ytstream.validatePlaylistURL(url)) {
      const playlist = await ytstream.getPlaylist(url);

      const urls: string[] = [];
      for (let video of playlist.videos) {
        urls.push(video.video_url);
      }

      await manager.add(...urls);

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setDescription(
          `You conjured ${playlist.videos.length} sounds of **${playlist.title}**.`,
        );

      await interaction.reply({
        embeds: [embed],
      });

      return;
    }

    console.error(`Invalid URL "${url}".`);

    await interaction.reply({
      content: "The spell fails. Perhaps you used the wrong components.",
      ephemeral: true,
    });
  }

  async banish(interaction: ChatInputCommandInteraction) {
    let manager;
    if (interaction.guild != null) {
      manager = this.managers.get(interaction.guild.id);
    }

    if (manager == null || manager.data == null) {
      await interaction.reply({
        content: "There is nothing to banish.",
        ephemeral: true,
      });

      return;
    }

    const data = manager.data;
    await manager.playNext(false);

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setDescription(`You banished the sounds of **${data.title}**.`);

    await interaction.reply({
      embeds: [embed],
    });
  }
}

class Manager {
  private player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private stream: Stream | null = null;

  private queue: string[] = [];
  private trash: string[] = [];

  get data() {
    return this.stream?.info;
  }

  constructor(private server: Server) {
    this.player = createAudioPlayer({
      behaviors: {
        maxMissedFrames: 250,
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    this.player.on(AudioPlayerStatus.Idle, () =>
      this.playNext().catch(console.error),
    );
  }

  dispose() {
    this.player.stop();
    this.connection?.destroy();
    this.stream?.destroy();

    this.connection = null;
    this.stream = null;
  }

  async connect(channel: VoiceChannel) {
    if (this.connection != null) {
      this.connection.destroy();
    }

    this.connection = joinVoiceChannel({
      adapterCreator: channel.guild
        .voiceAdapterCreator as DiscordGatewayAdapterCreator,
      guildId: channel.guild.id,
      channelId: channel.id,
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 5_000);
    this.connection.subscribe(this.player);
  }

  async add(...urls: string[]) {
    this.queue.push(...urls);

    if (this.stream == null) {
      await this.playNext();
    }
  }

  async playNext(keep: Boolean = true) {
    this.player.stop();

    if (this.stream != null) {
      this.stream.destroy();

      if (keep) {
        this.trash.push(this.stream.video_url);
      }
    }

    if (this.queue.length == 0 && !this.recycle()) {
      this.server.setActivity();
      return;
    }

    const url = Random.pop(this.queue);

    this.stream = await ytstream.stream(url, {
      quality: "high",
      type: "audio",
      highWaterMark: 1048576 * 32,
      download: true,
    });

    this.server.setActivity({
      type: ActivityType.Listening,
      name: this.stream.info.title,
    });

    const audioResource = createAudioResource(this.stream.stream);
    this.player.play(audioResource);
  }

  private recycle() {
    if (this.trash.length == 0) {
      this.stream = null;
      return false;
    }

    this.queue = this.trash;
    this.trash = [];
    return true;
  }
}
