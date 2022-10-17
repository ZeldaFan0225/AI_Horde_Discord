import { ButtonInteraction, ComponentType, SelectMenuInteraction } from "discord.js";
import { Pool } from "pg";
import { APIManager } from "../classes/apiManager";
import { SupportClient } from "../classes/client";
import { ComponentContext } from "../classes/componentContext";

export async function handleComponents(interaction: ButtonInteraction | SelectMenuInteraction, client: SupportClient, database: Pool, api_manager: APIManager) {
    const command = await client.components.getComponent(interaction).catch(() => null)
    if(!command) return;
    let context

    if(interaction.componentType === ComponentType.Button) context = new ComponentContext({interaction, client, database, api_manager})
    else context = new ComponentContext<ComponentType.SelectMenu>({interaction, client, database, api_manager})

    if(command.staff_only && !(Array.isArray(interaction.member?.roles) ? interaction.member?.roles.some(r => client.config.staff_roles?.includes(r)) : interaction.member?.roles.cache.some(r => client.config.staff_roles?.includes(r.id))))
        return await context.error({
            error: "You are not staff"
        })

    return await command.run(context).catch(console.error)
}