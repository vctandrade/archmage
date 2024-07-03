import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";

interface Handler {
  setup(): Promise<void>;
  handle(interaction: Interaction): Promise<boolean>;
}

export default class Server {
  private client: Client;
  private handlers: Handler[] = [];

  constructor() {
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

  async stop() {
    await this.client.destroy();
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
    try {
      for (const handler of this.handlers) {
        if (await handler.handle(interaction)) {
          return;
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
}
