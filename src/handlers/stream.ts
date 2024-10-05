import EventEmitter from "events";
import { Readable } from "stream";
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
import ytdl, { MoreVideoDetails } from "@distube/ytdl-core";
import ytpl from "@distube/ytpl";
import Server from "../server.js";
import { Random } from "../utils/random.js";

export class StreamHandler {
  private instances = new Map<string, Instance>();

  static info = {
    summon: new SlashCommandBuilder()
      .setName("summon")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The voice channel you wish to summon me into")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true),
      )
      .setDescription("Summons me into a voice channel"),
    dismiss: new SlashCommandBuilder()
      .setName("dismiss")
      .setDescription("Dismisses me from all voice channels"),
    conjure: new SlashCommandBuilder()
      .setName("conjure")
      .addStringOption((option) =>
        option
          .setName("url")
          .setDescription("The URL of a song or playlist")
          .setRequired(true),
      )
      .setDescription("Conjures a song into the playlist"),
    banish: new SlashCommandBuilder()
      .setName("banish")
      .setDescription("Banishes the current song"),
  };

  constructor(private server: Server) {}

  async setup() {}

  destroy() {
    for (const instance of this.instances.values()) {
      instance.destroy();
    }
  }

  async handle(interaction: Interaction) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.info.summon.name
    ) {
      await this.summon(interaction);
      return true;
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.info.dismiss.name
    ) {
      await this.dismiss(interaction);
      return true;
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.info.conjure.name
    ) {
      await this.conjure(interaction);
      return true;
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == StreamHandler.info.banish.name
    ) {
      await this.banish(interaction);
      return true;
    }

    return false;
  }

  private async summon(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel<ChannelType.GuildVoice>(
      "channel",
      true,
    );

    const instance =
      this.instances.get(channel.guild.id) ??
      this.buildInstance(channel.guild.id);

    try {
      await instance.setup(channel);
      await interaction.reply({
        content: "I am at your command.",
        ephemeral: true,
      });
    } catch (error) {
      instance.destroy();
      throw error;
    }
  }

  private async dismiss(interaction: ChatInputCommandInteraction) {
    this.server.setActivity();

    if (interaction.guild != null) {
      const instance = this.instances.get(interaction.guild.id);
      if (instance != null) {
        instance.destroy();
      }
    }

    await interaction.reply({
      content: "At last, I have greater matters to attend to.",
      ephemeral: true,
    });
  }

  private async conjure(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url", true);

    let instance;
    if (interaction.guild != null) {
      instance = this.instances.get(interaction.guild.id);
    }

    if (instance == null) {
      await interaction.reply({
        content: "I shall not aid you lest I'm summoned.",
        ephemeral: true,
      });

      return;
    }

    if (ytdl.validateURL(url)) {
      const info = await ytdl.getBasicInfo(url);

      instance.add(url);
      await instance.ensurePlay();

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setDescription(`You conjured **${info.videoDetails.title}**.`);

      await interaction.reply({
        embeds: [embed],
      });

      return;
    }

    if (ytpl.validateID(url)) {
      const playlist = await ytpl(url);

      for (const item of playlist.items) {
        instance.add(item.url);
      }

      await instance.ensurePlay();

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setDescription(
          `You conjured ${playlist.items.length} entities of **${playlist.title}**.`,
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

  private async banish(interaction: ChatInputCommandInteraction) {
    let instance;
    if (interaction.guild != null) {
      instance = this.instances.get(interaction.guild.id);
    }

    if (instance == null || instance.trackDetails == null) {
      await interaction.reply({
        content: "There is nothing to banish.",
        ephemeral: true,
      });

      return;
    }

    const trackDetails = instance.trackDetails;
    await instance.playNext(false);

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setDescription(`You banished the sounds of **${trackDetails.title}**.`);

    await interaction.reply({
      embeds: [embed],
    });
  }

  private buildInstance(guildId: string) {
    const result = new Instance(this.server);
    this.instances.set(guildId, result);

    result.on("destroy", () => {
      this.instances.delete(guildId);
    });

    return result;
  }
}

class Instance extends EventEmitter<InstanceEventMap> {
  private player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private track: Track | null = null;

  private queue: string[] = [];
  private trash: string[] = [];

  constructor(private server: Server) {
    super();

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

  get trackDetails() {
    return this.track?.details;
  }

  async setup(channel: VoiceChannel) {
    if (this.connection != null) {
      this.connection.destroy();
    }

    this.connection = joinVoiceChannel({
      adapterCreator: channel.guild
        .voiceAdapterCreator as DiscordGatewayAdapterCreator,
      guildId: channel.guild.id,
      channelId: channel.id,
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.destroy();
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 5_000);
    this.connection.subscribe(this.player);
  }

  destroy() {
    this.player.stop();
    this.connection?.destroy();
    this.track?.destroy();

    this.connection = null;
    this.track = null;

    this.emit("destroy");
  }

  add(url: string) {
    this.queue.push(url);
  }

  async ensurePlay() {
    if (this.track == null) {
      await this.playNext();
    }
  }

  async playNext(keep: boolean = true) {
    this.player.stop();

    if (this.track != null) {
      this.track.destroy();

      if (keep) {
        this.trash.push(this.track.details.video_url);
      }
    }

    if (this.queue.length == 0 && !this.recycle()) {
      this.server.setActivity();
      return;
    }

    const info = await ytdl.getInfo(Random.pop(this.queue));
    const stream = ytdl.downloadFromInfo(info, {
      filter: "audioonly",
      quality: "highestaudio",
    });

    this.track = new Track(info.videoDetails, stream);

    this.server.setActivity({
      type: ActivityType.Listening,
      name: info.videoDetails.title,
    });

    const audioResource = createAudioResource(stream);
    this.player.play(audioResource);
  }

  private recycle() {
    if (this.trash.length == 0) {
      this.track = null;
      return false;
    }

    this.queue = this.trash;
    this.trash = [];
    return true;
  }
}

interface InstanceEventMap {
  destroy: [];
}

class Track {
  constructor(
    public details: MoreVideoDetails,
    private stream: Readable,
  ) {}

  destroy() {
    this.stream.destroy();
  }
}
