import {AIHorde} from "@zeldafan0225/ai_horde";
import { AnySelectMenuInteraction, ButtonInteraction, ComponentType, PermissionsBitField } from "discord.js";
import { Pool } from "pg";
import { AIHordeClient } from "../classes/client";
import { ComponentContext } from "../classes/componentContext";

export async function handleComponents(interaction: ButtonInteraction | AnySelectMenuInteraction, client: AIHordeClient, database: Pool | undefined, ai_horde_manager: AIHorde) {
    const command = await client.components.getComponent(interaction).catch(() => null)
    if(!command) return;
    if(!interaction.inCachedGuild()) return;
    let context

    if(interaction.componentType === ComponentType.Button) context = new ComponentContext<ComponentType.Button>({interaction, client, database, ai_horde_manager})
    else {
        switch(interaction.componentType) {
            case ComponentType.StringSelect: context = new ComponentContext<ComponentType.StringSelect>({interaction, client, database, ai_horde_manager}); break;
            case ComponentType.ChannelSelect: context = new ComponentContext<ComponentType.ChannelSelect>({interaction, client, database, ai_horde_manager}); break;
            case ComponentType.MentionableSelect: context = new ComponentContext<ComponentType.MentionableSelect>({interaction, client, database, ai_horde_manager}); break;
            case ComponentType.RoleSelect: context = new ComponentContext<ComponentType.RoleSelect>({interaction, client, database, ai_horde_manager}); break;
            case ComponentType.UserSelect: context = new ComponentContext<ComponentType.UserSelect>({interaction, client, database, ai_horde_manager}); break;
        }
    }
    
    if(interaction.appPermissions?.missing(client.getNeededPermissions(interaction.guildId)).length)
        return await context.error({
            error: `I require the following permissions to work:\n${(interaction.appPermissions || new PermissionsBitField).missing(client.getNeededPermissions(interaction.guildId)).join(", ")}`,
            codeblock: false,
            ephemeral: true
        })

    return await command.run(context).catch(console.error)
}