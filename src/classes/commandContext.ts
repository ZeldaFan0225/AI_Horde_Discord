import {ChatInputCommandInteraction, Colors, EmbedBuilder} from "discord.js";
import {CommandContextInitOptions} from "../types";
import {BaseContext} from "./baseContext";

export class CommandContext extends BaseContext {
    override interaction: ChatInputCommandInteraction
    constructor(options: CommandContextInitOptions) {
        super(options)
        this.interaction = options.interaction
    }

    async error(options: { error?: string, ephemeral?: boolean, codeblock?: boolean }) {
        const err_string = options.error ?? "Unknown Error"
        const embed = new EmbedBuilder({
            color: Colors.Red,
            description: `❌ **Error** | ${(options.codeblock ?? true) ? `\`${err_string}\`` : err_string}`
        })
        if(this.interaction.replied || this.interaction.deferred) return await this.interaction.editReply({embeds: [embed]})
        else return await this.interaction.reply({embeds: [embed], ephemeral: options.ephemeral ?? true})
    }
}