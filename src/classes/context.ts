import { ApplicationCommandType, RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody } from "discord.js"
import { CommandInitOptions } from "../types"
import { ContextContext } from "./contextContext"

export class Context {
    name: string
    commandData?: RESTPostAPIChatInputApplicationCommandsJSONBody | RESTPostAPIContextMenuApplicationCommandsJSONBody
    constructor(options: CommandInitOptions) {
        this.name = options.name
        this.commandData = options.command_data
    }

    async run(_context: ContextContext<ApplicationCommandType.User | ApplicationCommandType.Message>): Promise<any> {
        throw new Error("You need to override the base run method")
    }
}