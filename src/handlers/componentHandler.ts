import StableHorde from "@zeldafan0225/stable_horde";
import { AnySelectMenuInteraction, ButtonInteraction, ComponentType } from "discord.js";
import { Pool } from "pg";
import { StableHordeClient } from "../classes/client";
import { ComponentContext } from "../classes/componentContext";

export async function handleComponents(interaction: ButtonInteraction | AnySelectMenuInteraction, client: StableHordeClient, database: Pool | undefined, stable_horde_manager: StableHorde) {
    const command = await client.components.getComponent(interaction).catch(() => null)
    if(!command) return;
    if(!interaction.inCachedGuild()) return;
    let context

    if(interaction.componentType === ComponentType.Button) context = new ComponentContext<ComponentType.Button>({interaction, client, database, stable_horde_manager})
    else {
        switch(interaction.componentType) {
            case ComponentType.StringSelect: context = new ComponentContext<ComponentType.StringSelect>({interaction, client, database, stable_horde_manager}); break;
            case ComponentType.ChannelSelect: context = new ComponentContext<ComponentType.ChannelSelect>({interaction, client, database, stable_horde_manager}); break;
            case ComponentType.MentionableSelect: context = new ComponentContext<ComponentType.MentionableSelect>({interaction, client, database, stable_horde_manager}); break;
            case ComponentType.RoleSelect: context = new ComponentContext<ComponentType.RoleSelect>({interaction, client, database, stable_horde_manager}); break;
            case ComponentType.UserSelect: context = new ComponentContext<ComponentType.UserSelect>({interaction, client, database, stable_horde_manager}); break;
        }
    }
    
    if(interaction.appPermissions?.missing(client.required_permissions).length)
        return await context.error({
            error: `I require the following permissions to work:\n${interaction.appPermissions?.missing(client.required_permissions).join(", ")}`,
            codeblock: false,
            ephemeral: true
        })

    return await command.run(context).catch(console.error)
}