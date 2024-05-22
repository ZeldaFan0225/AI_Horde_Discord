import { Colors, TextInputModalData } from "discord.js";
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
        const raw_token = (ctx.interaction.components[0]?.components[0] as TextInputModalData).value
        if(!raw_token?.length || raw_token ===  (ctx.client.config.default_token || "0000000000")) {
            await ctx.database.query("DELETE FROM user_tokens WHERE id=$1", [ctx.interaction.user.id])
            return ctx.interaction.reply({
                content: "Deleted token from database",
                ephemeral: true
            })
        }
        const user_data = await ctx.ai_horde_manager.findUser({token: raw_token}).catch(() => null)
        if(!user_data || !user_data?.id) return ctx.error({error: "Unable to find user with this token!"})
        const token = ctx.client.config.advanced?.encrypt_token ? ctx.client.encryptString(raw_token) : raw_token
        if(!token) return ctx.error({error: "Unable to encrypt token"})
        const res = await ctx.database.query("INSERT INTO user_tokens VALUES (DEFAULT, $1, $2, $3) ON CONFLICT (id) DO UPDATE SET token=$2, horde_id=$3 RETURNING *", [ctx.interaction.user.id, token, user_data.id])
        if(!res.rowCount) return ctx.error({error: "Unable to save token"})
        if(ctx.interaction.inCachedGuild()) {
            const member = ctx.interaction.member
            let apply_roles = []
            if (ctx.client.checkGuildPermissions(ctx.interaction.guildId, "apply_roles_to_worker_owners") && user_data.worker_ids?.length && ctx.client.config.apply_roles_to_worker_owners?.length) apply_roles.push(...ctx.client.config.apply_roles_to_worker_owners)
            if (ctx.client.checkGuildPermissions(ctx.interaction.guildId, "apply_roles_to_trusted_users") && user_data.trusted && ctx.client.config.apply_roles_to_trusted_users?.length) apply_roles.push(...ctx.client.config.apply_roles_to_trusted_users)
            if (ctx.client.checkGuildPermissions(ctx.interaction.guildId, "apply_roles_to_logged_in_users") && ctx.client.config.apply_roles_to_logged_in_users?.length) apply_roles.push(...ctx.client.config.apply_roles_to_logged_in_users)
    
            apply_roles = apply_roles.filter(r => !member?.roles.cache.has(r))
            if(apply_roles.length) await member?.roles.add(apply_roles).catch(console.error)
        }
        await ctx.interaction.reply({
            content: `S${ctx.client.config.advanced?.encrypt_token ? "ecurely s" : ""}aved your token in the database.`,
            ephemeral: true
        })
        const pending_kudos = await ctx.database.query<{unique_id: string, target_id: string, from_id: string, amount: number}>("DELETE FROM pending_kudos WHERE target_id=$1 RETURNING *", [ctx.interaction.user.id]).catch(console.error)
        if(pending_kudos?.rowCount) {
            const res_promise = pending_kudos.rows.map(async transaction => {
                const from_token = await ctx.client.getUserToken(transaction.from_id, ctx.database)
                if(!from_token) return {success: false, unique_id: transaction.unique_id, from: transaction.from_id, amount: transaction.amount}
                const res = await ctx.ai_horde_manager.postKudosTransfer({username: user_data.username!, amount: transaction.amount}, {token: from_token}).catch(console.error)
                if(!res?.transferred) return {success: false, unique_id: transaction.unique_id, from: transaction.from_id, amount: transaction.amount}
                else return {success: true, unique_id: transaction.unique_id, from: transaction.from_id, amount: res.transferred}
            })
            const res = await Promise.all(res_promise)
            const embed = {
                title: "Kudos",
                description: `You claimed the following:\n${res.filter(r => r.success).map(r => `<@${r.from}> gifted you **${r.amount}** Kudos`).join("\n") || "none"}\n\nFollowing gifts failed:\n${res.filter(r => !r.success).map(r => `<@${r.from}>: **${r.amount}** Kudos`).join("\n") || "none"}`.slice(0,4000),
                color: Colors.Green
            }
            const sent = await ctx.interaction.user.send({
                embeds: [embed]
            }).catch(console.error)
            if(!sent?.id) await ctx.interaction.followUp({
                ephemeral: true,
                embeds: [embed]
            }).catch(console.error)
        }
    }
}