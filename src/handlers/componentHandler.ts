import StableHorde from "@zeldafan0225/stable_horde";
import { ButtonInteraction, ComponentType, SelectMenuInteraction } from "discord.js";
import { Pool } from "pg";
import { StableHordeClient } from "../classes/client";
import { ComponentContext } from "../classes/componentContext";

export async function handleComponents(interaction: ButtonInteraction | SelectMenuInteraction, client: StableHordeClient, database: Pool | undefined, stable_horde_manager: StableHorde) {
    const command = await client.components.getComponent(interaction).catch(() => null)
    if(!command) return;
    let context

    if(interaction.componentType === ComponentType.Button) context = new ComponentContext({interaction, client, database, stable_horde_manager})
    else context = new ComponentContext<ComponentType.SelectMenu>({interaction, client, database, stable_horde_manager})

    return await command.run(context).catch(console.error)
}