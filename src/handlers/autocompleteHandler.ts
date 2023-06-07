import {AIHorde} from "@zeldafan0225/ai_horde";
import { AutocompleteInteraction } from "discord.js";
import { Pool } from "pg";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { AIHordeClient } from "../classes/client";

export async function handleAutocomplete(interaction: AutocompleteInteraction, client: AIHordeClient, database: Pool | undefined, ai_horde_manager: AIHorde) {
    const command = await client.commands.getCommand(interaction).catch(() => null)
    if(!command) return;
    const context = new AutocompleteContext({interaction, client, database, ai_horde_manager})
    if(!interaction.inGuild())
        return await context.error()
    if(!interaction.channel)
        return await context.error()
    return await command.autocomplete(context).catch(console.error)
}