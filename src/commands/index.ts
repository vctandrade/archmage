import { PrismaClient } from "@prisma/client";
import Blueprint from "./interfaces/blueprint.js";
import Command from "./interfaces/command.js";
import Users from "../dal/users.js";
import grimoire from "./grimoire.js";
import daily from "./daily.js";

const blueprints: Blueprint[] = [grimoire, daily];

export function getInfos() {
  const result = [];
  for (const blueprint of blueprints) {
    result.push(blueprint.getInfo());
  }

  return result;
}

export function getCommands(): Map<string, Command> {
  const prisma = new PrismaClient();
  const users = new Users(prisma);

  const result = new Map<string, Command>();
  for (const blueprint of blueprints) {
    const info = blueprint.getInfo();
    result.set(info.name, blueprint.getCommand(users));
  }

  return result;
}
