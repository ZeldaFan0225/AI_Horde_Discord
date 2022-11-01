import { TextInputModalData } from "discord.js";
import { Modal } from "../classes/modal";
import { ModalContext } from "../classes/modalContext";


export default class extends Modal {
    constructor() {
        super({
            name: "save_token",
            staff_only: false,
            regex: /save_token/
        })
    }

    override async run(ctx: ModalContext): Promise<any> {
        const token = (ctx.interaction.components[0]?.components[0] as TextInputModalData).value
        if(!token?.length || token ===  (ctx.client.config.default_token || "0000000000")) {
            await ctx.database.query("DELETE FROM user_tokens WHERE id=$1", [ctx.interaction.user.id])
            return ctx.interaction.reply({
                content: "Deleted token from database",
                ephemeral: true
            })
        }
        const user_data = await ctx.stable_horde_manager.findUser({token}).catch(() => null)
        if(!user_data) return ctx.error({error: "Unable to find user with this token!"})
        const res = await ctx.database.query("INSERT INTO user_tokens VALUES (DEFAULT, $1, $2) ON CONFLICT (id) DO UPDATE SET token=$2 RETURNING *", [ctx.interaction.user.id, token])
        if(!res.rowCount) return ctx.error({error: "Unable to save token"})
        return ctx.interaction.reply({
            content: "Saved your token in the database",
            ephemeral: true
        })
    }
}