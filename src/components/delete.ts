import { ComponentType } from "discord.js";
import { Component } from "../classes/component";
import { ComponentContext } from "../classes/componentContext";


export default class extends Component {
    constructor() {
        super({
            name: "delete",
            staff_only: false,
            regex: /delete_\d+/
        })
    }

    override async run(ctx: ComponentContext<ComponentType.SelectMenu>): Promise<any> {
        if(ctx.interaction.customId.split("_")[1] !== ctx.interaction.user.id) return ctx.error({error: "Only the user who created this message can delete it"})
        await ctx.interaction.deferUpdate()
        await ctx.interaction.deleteReply()
    }
}