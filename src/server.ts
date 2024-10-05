import {
  ActivityOptions,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
} from "discord.js";
import { Lock } from "./utils/lock.js";

interface Handler {
  setup(): Promise<void>;
  destroy(): void;
  handle(interaction: Interaction): Promise<boolean>;
}

export default class Server {
  private client: Client;
  private handlers: Handler[] = [];

  get users() {
    return this.client.users;
  }

  get channels() {
    return this.client.channels;
  }

  constructor(private lock: Lock) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    this.client.on(Events.InteractionCreate, (interaction) =>
      this.handle(interaction),
    );
  }

  async setup() {
    await this.client.login(process.env.DISCORD_TOKEN);
    for (const handler of this.handlers) {
      await handler.setup();
    }
  }

  async destroy() {
    for (const handler of this.handlers) {
      handler.destroy();
    }

    this.lock.acquire();

    try {
      await this.client.destroy();
    } finally {
      this.lock.release();
    }
  }

  addHandler(handler: Handler) {
    this.handlers.push(handler);
  }

  setActivity(options?: ActivityOptions) {
    if (this.client.isReady()) {
      this.client.user.setActivity(options);
    }
  }

  private async handle(interaction: Interaction) {
    this.lock.acquire();

    try {
      for (const handler of this.handlers) {
        if (await handler.handle(interaction)) {
          return;
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.lock.release();
    }
  }
}
