import { SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("end_party")
    .setDMPermission(false)
    .setDescription(`Ends a party`)


export default class extends Command {
    constructor() {
        super({
            name: "end_party",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.client.config.party?.enabled) return ctx.error({error: "Party is disabled."})
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})

        const party = await ctx.client.getParty(ctx.interaction.channelId, ctx.database)
        if(!party?.channel_id) return ctx.error({error: "Unable to find party"})
        if(party?.creator_id !== ctx.interaction.user.id) return ctx.error({error: "Only the creator can stop this party"})
        const party_data = await ctx.database.query("DELETE FROM parties WHERE channel_id=$1 RETURNING *", [ctx.interaction.channelId]).catch(console.error)
        if(!party_data?.rowCount) return ctx.error({error: "Unable to end party"})
        ctx.client.cache.delete(`party-${ctx.interaction.channelId}`)

        await ctx.interaction.reply({content: "Party ended.", ephemeral: true})
        ctx.interaction.channel?.send({
            content: `The party police showed up and broke down this party.\n${party_data.rows[0].users?.length} users participated.\nThanks to <@${party.creator_id}> for hosting this party`
        })
    }
}