import { ComponentType } from "discord.js";
import { Component } from "../classes/component";
import { ComponentContext } from "../classes/componentContext";


export default class extends Component {
    constructor() {
        super({
            name: "cancel_gen",
            staff_only: false,
            regex: /cancel_gen_.+/
        })
    }

    override async run(ctx: ComponentContext<ComponentType.SelectMenu>): Promise<any> {
        if(ctx.interaction.message.interaction?.user.id !== ctx.interaction.user.id) return ctx.error({error: "Only the creator of this prompt can cancel the job"})
        const id = ctx.interaction.customId.slice(11)
        await ctx.ai_horde_manager.deleteGenerationRequest(id)
        ctx.interaction.update({
            components: [],
            content: "Generation cancelled",
            embeds: []
        })
    }
}