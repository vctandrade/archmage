import { BaseClient, Client } from "./client.js";
import { Shops } from "./shops.js";
import { TradeOffers } from "./trade-offers.js";
import { Users } from "./users.js";

export class Database {
  public shops: Shops;
  public tradeOffers: TradeOffers;
  public users: Users;

  constructor(private client: BaseClient) {
    this.shops = new Shops(client);
    this.tradeOffers = new TradeOffers(client);
    this.users = new Users(client);
  }

  public withTransaction(fn: (tx: Transaction) => Promise<void>) {
    return this.client.$transaction(async (client) => {
      const transaction = new Transaction(client);
      await fn(transaction);
    });
  }
}

class Transaction {
  public shops: Shops;
  public tradeOffers: TradeOffers;
  public users: Users;

  constructor(private client: Client) {
    this.shops = new Shops(client);
    this.tradeOffers = new TradeOffers(client);
    this.users = new Users(client);
  }
}
