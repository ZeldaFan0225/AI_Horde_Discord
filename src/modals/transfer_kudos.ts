import { TextInputModalData } from "discord.js";
import { Modal } from "../classes/modal";
import { ModalContext } from "../classes/modalContext";


export default class extends Modal {
    constructor() {
        super({
            name: "transfer_kudos",
            staff_only: false,
            regex: /transfer_kudos/
        })
    }

    override async run(ctx: ModalContext): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        const username = (ctx.interaction.components[0]?.components[0] as TextInputModalData).value
        const amount = parseInt((ctx.interaction.components[1]?.components[0] as TextInputModalData).value)
        const token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        if(isNaN(amount) || amount <= 0) return ctx.error({
            error: "You can only send one or mode kudos"
        })
        if(!username.includes("#")) return ctx.error({
            error: "The username must follow the scheme: Name#1234"
        })

        const transfer = await ctx.ai_horde_manager.postKudosTransfer({
            username,
            amount
        }, {token}).catch(e => e)

        if(!transfer?.transferred) return ctx.error({error: "Unable to transfer kudos"})
        
        ctx.interaction.reply({
            content: `Transferred ${amount} kudos to ${username}`
        })
    }
}