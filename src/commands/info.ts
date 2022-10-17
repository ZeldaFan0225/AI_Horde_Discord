import { SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("info")
    .setDMPermission(false)
    .setDescription(`Information`)

export default class extends Command {
    constructor() {
        super({
            name: "info",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        ctx.interaction.reply({
            content: "Example command"
        })
    }
}