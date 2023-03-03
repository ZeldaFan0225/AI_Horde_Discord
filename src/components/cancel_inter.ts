import { ComponentType } from "discord.js";
import { Component } from "../classes/component";
import { ComponentContext } from "../classes/componentContext";


export default class extends Component {
    constructor() {
        super({
            name: "cancel_inter",
            staff_only: false,
            regex: /cancel_inter_.+/
        })
    }

    override async run(ctx: ComponentContext<ComponentType.SelectMenu>): Promise<any> {
        if(ctx.interaction.message.interaction?.user.id !== ctx.interaction.user.id) return ctx.error({error: "Only the author of this command can cancel the job"})
        const id = ctx.interaction.customId.slice(13)
        await ctx.ai_horde_manager.deleteInterrogationRequest(id)
        ctx.interaction.deferUpdate()
    }
}