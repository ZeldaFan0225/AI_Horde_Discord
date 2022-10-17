import { SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("terms")
    .setDMPermission(false)
    .setDescription(`Shows our privacy policy and other terms`)

export default class extends Command {
    constructor() {
        super({
            name: "terms",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const commands = await ctx.interaction.guild?.commands.fetch()
        return ctx.interaction.reply({
            content: `By entering your token you agree to the terms below:\n- we save only your token until you use ${commands?.find(c => c.name === "deletetoken") ? `</deletetoken:${commands?.find(c => c.name === "deletetoken")!.id}>` : "/deletetoken"} which will permanently delete your token from our database\n- we make requests using your token to provide the service. We ensure nobody can perform actions using your token\n\n\nDon't know what the token is?\nCreate a stable horde account here: https://stablehorde.net/register`,
            ephemeral: true
        })
    }
}