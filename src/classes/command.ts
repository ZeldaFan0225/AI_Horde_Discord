import { RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody } from "discord.js"
import {CommandInitOptions} from "../types";
import { AutocompleteContext } from "./autocompleteContext";
import {CommandContext} from "./commandContext";

export class Command {
    name: string
    commandData?: RESTPostAPIChatInputApplicationCommandsJSONBody | RESTPostAPIContextMenuApplicationCommandsJSONBody
    constructor(options: CommandInitOptions) {
        this.name = options.name
        this.commandData = options.command_data
    }

    async run(_context: CommandContext): Promise<any> {
        throw new Error("You need to override the base run method")
    }

    async autocomplete(context: AutocompleteContext): Promise<any> {
        return context.interaction.respond([])
    }
}