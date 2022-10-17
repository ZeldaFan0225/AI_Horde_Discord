import { SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("deletetoken")
    .setDMPermission(false)
    .setDescription(`Deletes your token from the database`)

export default class extends Command {
    constructor() {
        super({
            name: "deletetoken",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const token = await ctx.api_manager.getUserToken(ctx.interaction.user.id)
        if(!token) return ctx.interaction.reply({
            content: "You don't have your stable horde token saved in our database",
            ephemeral: true
        })
        await ctx.database.query("DELETE FROM user_tokens WHERE id=$1", [ctx.interaction.user.id])
        ctx.interaction.reply({
            content: "Deleted.",
            ephemeral: true
        })
    }
}