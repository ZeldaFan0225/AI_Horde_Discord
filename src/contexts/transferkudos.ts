import { ApplicationCommandType, ButtonBuilder, ContextMenuCommandBuilder, ModalBuilder } from "discord.js";
import { Context } from "../classes/context";
import { ContextContext } from "../classes/contextContext";

const command_data = new ContextMenuCommandBuilder()
    .setType(ApplicationCommandType.User)
    .setName("Transfer Kudos")
    .setDMPermission(false)

export default class extends Context {
    constructor() {
        super({
            name: "Transfer Kudos",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: ContextContext<ApplicationCommandType.User>): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        let token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        const add_token_button = new ButtonBuilder({
            custom_id: "save_token",
            label: "Save Token",
            style: 1
        })
        if(!token) return ctx.interaction.reply({
            content: `Please add your token before your user details can be shown.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${await ctx.client.getSlashCommandTag("terms")}\n\n\nDon't know what the token is?\nCreate an ai horde account here: https://aihorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })

        const target_token = await ctx.client.getUserToken(ctx.interaction.targetId, ctx.database)
        const target_user = await ctx.ai_horde_manager.findUser({token: target_token})
        const own_user = await ctx.ai_horde_manager.findUser({token})
        const modal = new ModalBuilder({
            title: "Transfer Kudos",
            custom_id: "transfer_kudos",
            components: [{
                type: 1,
                components: [{
                    type: 4,
                    custom_id: "username",
                    style: 1,
                    label: "Username",
                    required: true,
                    value: target_user?.username,
                    placeholder: "The user to transfer to"
                }]
            },{
                type: 1,
                components: [{
                    type: 4,
                    custom_id: "amount",
                    style: 1,
                    label: "Amount",
                    required: true,
                    value: "1",
                    placeholder: `The amount to transfer to (max. ${Object.values(own_user.kudos_details ?? {}).reduce((a, b) => (a) + b)})`
                }]
            }]
        })

        ctx.interaction.showModal(modal)
    }
}