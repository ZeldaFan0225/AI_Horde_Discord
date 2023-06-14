import {AIHorde} from "@zeldafan0225/ai_horde";
import { Colors, MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { Pool } from "pg";
import { AIHordeClient } from "../classes/client";

export async function handleMessageReact(reaction: PartialMessageReaction | MessageReaction, user: User | PartialUser, client: AIHordeClient, database: Pool | undefined, ai_horde_manager: AIHorde): Promise<any> {
    if(!client.config.use_database || !database || !client.config.react_to_transfer?.enabled) return;
    if(!client.checkGuildPermissions(reaction.message.guildId, "react_to_transfer")) return;
    const emoji = client.config.react_to_transfer?.emojis?.find(e => e.id === reaction.emoji.id)
    if(!emoji) return;
    const u = await (user.partial ? user.fetch() : user)
    const r = await (reaction.partial ? reaction.fetch() : reaction)
    let target_user = r.message.author
    const usertoken = await client.getUserToken(u.id, database)
    if(!target_user?.id) return await r.users.remove(u)
    if(target_user.bot && (r.message.interaction?.commandName === "generate" || r.message.interaction?.commandName === "advanced_generate")) {
        target_user = r.message.interaction.user
    } else if (target_user.bot) return await r.users.remove(u)
    if(target_user?.id === u.id) return await r.users.remove(u)
    if(!usertoken) {
        await r.users.remove(u)
        await u.send({
            embeds: [{
                title: "Gifting Kudos",
                description: `You tried gifting kudos to ${target_user.tag ?? "somebody"} but you are not logged in.\nTo gift kudos use /login.`,
                color: Colors.Blue
            }]
        }).catch(console.error)
        return;
    }
    const target_usertoken = await client.getUserToken(target_user.id, database)
    if(!target_usertoken) {
        // target user has not logged in
        if(client.config.react_to_transfer.allow_delayed_claim) {
            const res = await database.query(`INSERT INTO pending_kudos (unique_id, target_id, from_id, amount) VALUES ($1, $2, $3, $4) ON CONFLICT (unique_id) DO UPDATE SET amount = pending_kudos.amount + $4, updated_at = CURRENT_TIMESTAMP RETURNING *`, [`${target_user.id}_${u.id}`, target_user.id, u.id, emoji.amount]).catch(console.error)
            if(res?.rowCount) {
                await target_user.send({
                    embeds: [{
                        title: emoji.title ?? "Surprise",
                        description: `**${u.tag}** tried to gifted you **${emoji.amount ?? 1}** Kudos on [this message](${r.message.url}).${emoji.message ? `\n${emoji.message}` : ""}\n\nSince you are not logged in you **did not** receive them. Log in with your [ai horde account](https://aihorde.net/register) within a week to claim your Kudos.`,
                        color: Colors.Red
                    }]
                }).catch(console.error)
                await u.send({
                    embeds: [{
                        title: "Gifting Kudos",
                        description: `The target user is currently not logged in.\nKudos will be transferred as soon as they log in.`,
                        color: Colors.Red
                    }]
                }).catch(console.error)
                return;
            }
        }
        return await r.users.remove(u);
    }
    const target_shuser = await ai_horde_manager.findUser({token: target_usertoken})
    if(!target_shuser) return await r.users.remove(u);
    const transfer = await ai_horde_manager.postKudosTransfer({username: target_shuser.username!, amount: emoji.amount ?? 1}, {token: usertoken}).catch(console.error)

    if(!transfer?.transferred) {
        await r.users.remove(u);
        await u.send({
            embeds: [{
                title: "Gifting Kudos",
                description: `Gifting Kudos failed.`,
                color: Colors.Red
            }]
        }).catch(console.error)
        return;
    }

    
    await u.send({
        embeds: [{
            title: "Gifting Kudos",
            description: `Successfully gifted ${target_user?.tag ?? "somebody"} ${emoji.amount ?? 1} Kudos.`,
            color: Colors.Green
        }]
    }).catch(console.error)
    const res = await target_user.send({
        embeds: [{
            title: emoji.title ?? "Surprise",
            description: `**${u.tag}** gifted you **${emoji.amount ?? 1}** Kudos on [this message](${r.message.url}).${emoji.message ? `\n${emoji.message}` : ""}`,
            color: Colors.Yellow
        }]
    }).catch(console.error)
    if(!res?.id) await r.message.reply({
        embeds: [{
            title: emoji.title ?? "Surprise",
            description: `**${u.tag}** gifted you **${emoji.amount ?? 1}** Kudos on [this message](${r.message.url}).${emoji.message ? `\n${emoji.message}` : ""}`,
            color: Colors.Yellow
        }]
    }).catch(console.error)
}