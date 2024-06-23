import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";

interface Handler {
  handle: (interaction: Interaction) => Promise<boolean>;
}

export default class Server {
  client: Client;
  handlers: Handler[] = [];

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    this.client.on(Events.InteractionCreate, this.handle.bind(this));
  }

  async start() {
    await this.client.login(process.env.DISCORD_TOKEN);
  }

  async stop() {
    await this.client.destroy();
  }

  addHandler(handler: Handler) {
    this.handlers.push(handler);
  }

  async handle(interaction: Interaction) {
    for (const handler of this.handlers) {
      if (await handler.handle(interaction)) {
        return;
      }
    }
  }
}
