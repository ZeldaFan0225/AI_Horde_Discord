import { ComponentType, ModalBuilder } from "discord.js";
import { Component } from "../classes/component";
import { ComponentContext } from "../classes/componentContext";


export default class extends Component {
    constructor() {
        super({
            name: "save_token",
            staff_only: false,
            regex: /save_token/
        })
    }

    override async run(ctx: ComponentContext<ComponentType.SelectMenu>): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        const token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        const modal = new ModalBuilder({
            title: "Save Token",
            custom_id: "save_token",
            components: [{
                type: 1,
                components: [{
                    type: 4,
                    label: "Token",
                    value: token || "0000000000",
                    custom_id: "token",
                    style: 1,
                    required: false
                }]
            }]
        })
        ctx.interaction.showModal(modal)
    }
}