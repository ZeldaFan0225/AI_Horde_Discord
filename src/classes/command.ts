import { ApplicationCommandData } from "discord.js"
import {CommandInitOptions} from "../types";
import { AutocompleteContext } from "./autocompleteContext";
import {CommandContext} from "./commandContext";

export class Command {
    name: string
    commandData?: ApplicationCommandData
    staff_only: boolean
    constructor(options: CommandInitOptions) {
        this.name = options.name
        this.commandData = options.command_data
        this.staff_only = options.staff_only ?? false
    }

    async run(_context: CommandContext): Promise<any> {
        throw new Error("You need to override the base run method")
    }

    async autocomplete(context: AutocompleteContext): Promise<any> {
        return context.interaction.respond([])
    }
}