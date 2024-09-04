import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { Lock } from "./utils/lock.js";

interface Handler {
  setup(): Promise<void>;
  dispose(): void;
  handle(interaction: Interaction): Promise<boolean>;
}

export default class Server {
  private client: Client;
  private handlers: Handler[] = [];

  constructor(private lock: Lock) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    this.client.on(Events.InteractionCreate, (interaction) =>
      this.handle(interaction),
    );
  }

  async start() {
    await this.client.login(process.env.DISCORD_TOKEN);
    for (const handler of this.handlers) {
      await handler.setup();
    }
  }

  async dispose() {
    for (const handler of this.handlers) {
      handler.dispose();
    }

    this.lock.acquire();

    try {
      await this.client.destroy();
    } finally {
      this.lock.release();
    }
  }

  get users() {
    return this.client.users;
  }

  get channels() {
    return this.client.channels;
  }

  addHandler(handler: Handler) {
    this.handlers.push(handler);
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
