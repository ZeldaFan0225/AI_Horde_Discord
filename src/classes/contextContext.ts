import { ApplicationCommandType, Colors, ContextMenuCommandType, EmbedBuilder, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { MessageContextContextInitOptions, UserContextContextInitOptions } from "../types";
import { BaseContext } from "./baseContext";

export class ContextContext<T extends ContextMenuCommandType> extends BaseContext {
    override interaction: T extends ApplicationCommandType.User ? UserContextMenuCommandInteraction : MessageContextMenuCommandInteraction
    constructor(options: T extends ApplicationCommandType.User ? UserContextContextInitOptions : MessageContextContextInitOptions) {
        super(options)
        this.interaction = options.interaction as (T extends ApplicationCommandType.User ? UserContextMenuCommandInteraction : MessageContextMenuCommandInteraction)
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