import { APIModalInteractionResponseCallbackData, ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { Context } from "../classes/context";
import { ContextContext } from "../classes/contextContext";


const command_data = new ContextMenuCommandBuilder()
    .setType(ApplicationCommandType.User)
    .setName("Remix Profile Picture")
    .setDMPermission(false)

export default class extends Context {
    constructor() {
        super({
            name: "Remix Profile Picture",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: ContextContext<ApplicationCommandType.User>): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        if(!ctx.client.config.remix?.enabled) return ctx.error({error: "This feature has been disabled"})
        const target_user = ctx.interaction.targetUser
        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)

        if(!user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use this action`, codeblock: false})

        const modal: APIModalInteractionResponseCallbackData = {
            title: "Enter Prompt",
            custom_id: `remix_${target_user.id}`,
            components: [{
                type: 1,
                components: [{
                    type: 4,
                    style: 1,
                    label: "Prompt",
                    custom_id: "prompt",
                    required: true,
                    placeholder: "Enter a prompt to remix the users avatar with",
                    value: target_user.username
                }]
            }]
        }

        if(ctx.client.config.remix.allow_custom_strength) {
            modal.components.push({
                type: 1,
                components: [{
                    type: 4,
                    style: 1,
                    label: "Edit Strength",
                    custom_id: "strength",
                    required: false,
                    placeholder: "Number between 1 and 100",
                    max_length: 3
                }]
            })
        }

        await ctx.interaction.showModal(modal)
    }
}