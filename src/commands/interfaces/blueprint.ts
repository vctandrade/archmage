import { SharedSlashCommand } from "discord.js";
import Command from "./command.js";
import Users from "../../dal/users.js";

export default interface Blueprint {
  getInfo(): SharedSlashCommand;
  getCommand(users: Users): Command;
}
