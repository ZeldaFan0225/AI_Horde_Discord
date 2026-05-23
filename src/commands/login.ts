import { ButtonBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("login")
    .setDMPermission(false)
    .setDescription(`Uses and stores your API key to interact with AI Horde or your account features`)

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
            label: "🗝️Log in to Stable Horde Bot",
            style: 1
        })
        return ctx.interaction.reply({
            content: `## Logging in to the bot\nUse the button below to initiate the login process.\nIn the pop-up window, enter your API key and Submit the form.\n-# This process is required to authorize the bot to perform actions on your behalf\n\nYour API key is your personal *(22-character)* key used to make generation requests that use your Kudos balance (and to access your profile if you registered without signing in).\n-#*Don't have an AI Horde account yet? Create one at[AI Horde](https://aihorde.net/register) or read the [FAQ](https://aihorde.net/faq).## Important\nBy logging in with your API key, you agree to the ${await ctx.client.getSlashCommandTag("terms")}\nYou agree to not upload or generate anything prohibited by law or the AI Horde Terms and Conditions, including but not limited to **any** illegal content **whatsoever**.${!ctx.client.config.advanced?.encrypt_token ? "\n\n\n:warning:**Warning!** The bot is configured to save your key **without encryption**. Use caution!" : ""}*`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })
    }
}
