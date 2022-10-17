import { ChatInputCommandInteraction } from "discord.js";
import { Pool } from "pg";
import { APIManager } from "../classes/apiManager";
import { SupportClient } from "../classes/client";
import { CommandContext } from "../classes/commandContext";

export async function handleCommands(interaction: ChatInputCommandInteraction, client: SupportClient, database: Pool, api_manager: APIManager) {
    const command = await client.commands.getCommand(interaction).catch(() => null)
    if(!command) return;
    const context = new CommandContext({interaction, client, database, api_manager})
    if(!interaction.inGuild())
        return await context.error({
            error: "You can only use commands in guilds",
            ephemeral: true
        })
    if(!interaction.channel)
        return await context.error({
            error: "Please add me to the private thread (by mentioning me) to use commands",
            ephemeral: true
        })
    if(command.staff_only && !(Array.isArray(interaction.member.roles) ? interaction.member.roles.some(r => client.config.staff_roles?.includes(r)) : interaction.member.roles.cache.some(r => client.config.staff_roles?.includes(r.id))))
        return await context.error({
            error: "You are not staff"
        })
    return await command.run(context).catch(console.error)
}