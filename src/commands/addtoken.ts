import { ButtonBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("addtoken")
    .setDMPermission(false)
    .setDescription(`Adds your token to the database`)

export default class extends Command {
    constructor() {
        super({
            name: "addtoken",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const commands = await ctx.interaction.guild?.commands.fetch()
        const add_token_button = new ButtonBuilder({
            custom_id: "save_token",
            label: "Save Token",
            style: 1
        })
        return ctx.interaction.reply({
            content: `Add your token by pressing the button below.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${commands?.find(c => c.name === "terms") ? `</terms:${commands?.find(c => c.name === "terms")!.id}>` : "/terms"}\n\n\nDon't know what the token is?\nCreate a stable horde account here: https://stablehorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })
    }
}