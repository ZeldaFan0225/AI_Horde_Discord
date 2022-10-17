import { ButtonInteraction, ComponentType, SelectMenuInteraction } from "discord.js";
import { Pool } from "pg";
import { SupportClient } from "../classes/client";
import { ComponentContext } from "../classes/componentContext";

export async function handleComponents(interaction: ButtonInteraction | SelectMenuInteraction, client: SupportClient, database: Pool) {
    const command = await client.components.getComponent(interaction).catch(() => null)
    if(!command) return;
    let context

    if(interaction.componentType === ComponentType.Button) context = new ComponentContext({interaction, client, database})
    else context = new ComponentContext<ComponentType.SelectMenu>({interaction, client, database})

    if(command.staff_only && !(Array.isArray(interaction.member?.roles) ? interaction.member?.roles.some(r => client.config.staff_roles?.includes(r)) : interaction.member?.roles.cache.some(r => client.config.staff_roles?.includes(r.id))))
        return await context.error({
            content: "You are not staff"
        })

    return await command.run(context).catch(console.error)
}