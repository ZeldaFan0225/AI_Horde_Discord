import { SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("logout")
    .setDMPermission(false)
    .setDescription(`Deletes your token from the database`)

export default class extends Command {
    constructor() {
        super({
            name: "logout",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        const token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        if(!token) return ctx.interaction.reply({
            content: "You don't have your ai horde token saved in our database",
            ephemeral: true
        })
        await ctx.database.query("DELETE FROM user_tokens WHERE id=$1", [ctx.interaction.user.id])
        ctx.interaction.reply({
            content: "Deleted.",
            ephemeral: true
        })
    }
}