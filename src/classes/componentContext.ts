import {
    ButtonInteraction,
    Colors,
    ComponentType,
    EmbedBuilder,
    MessageComponentType,
    SelectMenuInteraction
} from "discord.js";
import { BaseContext } from "./baseContext";
import {ButtonContextInitOptions, SelectMenuContextInitOptions} from "../types";

export class ComponentContext<T extends MessageComponentType> extends BaseContext {
    override interaction: T extends ComponentType.Button ? ButtonInteraction : SelectMenuInteraction
    constructor(options: T extends ComponentType.Button ? ButtonContextInitOptions : SelectMenuContextInitOptions) {
        super(options)
        this.interaction = options.interaction as (T extends ComponentType.Button ? ButtonInteraction : SelectMenuInteraction)
    }

    async error(options: { error?: string, ephemeral?: boolean, codeblock?: boolean }) {
        const err_string = options.error ?? "Unknown Error"
        const embed = new EmbedBuilder({
            color: Colors.Red,
            description: `❌ **Error** | ${(options.codeblock ?? true) ? `\`${err_string}\`` : err_string}`,
        })
        if(this.interaction.replied || this.interaction.deferred) return await this.interaction.editReply({embeds: [embed], components: [], files: [], content: ""})
        else return await this.interaction.reply({embeds: [embed], ephemeral: options.ephemeral ?? true, components: [], files: [], content: ""})
    }
}