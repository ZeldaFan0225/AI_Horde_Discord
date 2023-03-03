import { ButtonBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("login")
    .setDMPermission(false)
    .setDescription(`Adds your token to the database`)

export default class extends Command {
    constructor() {
        super({
            name: "login",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        const add_token_button = new ButtonBuilder({
            custom_id: "save_token",
            label: "Save Token",
            style: 1
        })
        return ctx.interaction.reply({
            content: `Add your token by pressing the button below.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${await ctx.client.getSlashCommandTag("terms")}\n**You agree to not upload or generate any illegal content**${!ctx.client.config.advanced?.encrypt_token ? "\n\n**The bot is configured not to save your token in an encrypted form!**" : ""}\n\n\nDon't know what the token is?\nCreate an ai horde account here: https://aihorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })
    }
}