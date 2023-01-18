import { Colors, GuildMember, TextInputModalData } from "discord.js";
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
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        const token = (ctx.interaction.components[0]?.components[0] as TextInputModalData).value
        if(!token?.length || token ===  (ctx.client.config.default_token || "0000000000")) {
            await ctx.database.query("DELETE FROM user_tokens WHERE id=$1", [ctx.interaction.user.id])
            return ctx.interaction.reply({
                content: "Deleted token from database",
                ephemeral: true
            })
        }
        const user_data = await ctx.stable_horde_manager.findUser({token}).catch(() => null)
        if(user_data?.worker_ids?.length && ctx.client.config.apply_roles_to_worker_owners?.length && ctx.interaction.inCachedGuild()) {
            if(ctx.interaction.member?.roles && ctx.client.config.apply_roles_to_worker_owners.some(r => !(ctx.interaction.member as GuildMember).roles.cache.has(r)))
                await ctx.interaction.member.roles.add(ctx.client.config.apply_roles_to_worker_owners).catch(console.error)
        }
        if(!user_data) return ctx.error({error: "Unable to find user with this token!"})
        const res = await ctx.database.query("INSERT INTO user_tokens VALUES (DEFAULT, $1, $2) ON CONFLICT (id) DO UPDATE SET token=$2 RETURNING *", [ctx.interaction.user.id, token])
        if(!res.rowCount) return ctx.error({error: "Unable to save token"})
        await ctx.interaction.reply({
            content: "Saved your token in the database.",
            ephemeral: true
        })
        const pending_kudos = await ctx.database.query<{unique_id: string, target_id: string, from_id: string, amount: number}>("DELETE FROM pending_kudos WHERE target_id=$1 RETURNING *", [ctx.interaction.user.id]).catch(console.error)
        if(pending_kudos?.rowCount) {
            const res_promise = pending_kudos.rows.map(async transaction => {
                const from_token = await ctx.client.getUserToken(transaction.from_id, ctx.database)
                if(!from_token) return {success: false, unique_id: transaction.unique_id, from: transaction.from_id, amount: transaction.amount}
                const res = await ctx.stable_horde_manager.postKudosTransfer({username: user_data.username!, amount: transaction.amount}, {token: from_token}).catch(console.error)
                if(!res?.transferred) return {success: false, unique_id: transaction.unique_id, from: transaction.from_id, amount: transaction.amount}
                else return {success: true, unique_id: transaction.unique_id, from: transaction.from_id, amount: res.transferred}
            })
            const res = await Promise.all(res_promise)
            ctx.interaction.user.send({
                embeds: [{
                    title: "Kudos",
                    description: `You claimed the following:\n${res.filter(r => r.success).map(r => `<@${r.from}> gifted you **${r.amount}** Kudos`).join("\n") || "none"}\n\nFollowing gifts failed:\n${res.filter(r => !r.success).map(r => `<@${r.from}>: **${r.amount}** Kudos`).join("\n") || "none"}`.slice(0,4000),
                    color: Colors.Green
                }]
            })
        }
    }
}