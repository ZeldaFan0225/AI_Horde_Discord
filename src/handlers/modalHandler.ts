import StableHorde from "@zeldafan0225/stable_horde";
import { ModalSubmitInteraction } from "discord.js";
import { Pool } from "pg";
import { StableHordeClient } from "../classes/client";
import { ModalContext } from "../classes/modalContext";

export async function handleModals(interaction: ModalSubmitInteraction, client: StableHordeClient, database: Pool, stable_horde_manager: StableHorde) {
    const command = await client.modals.getModal(interaction).catch(() => null)
    if(!command) return;
    let context = new ModalContext({interaction, client, database, stable_horde_manager})

    if(command.staff_only && !(Array.isArray(interaction.member?.roles) ? interaction.member?.roles.some(r => client.config.staff_roles?.includes(r)) : interaction.member?.roles.cache.some(r => client.config.staff_roles?.includes(r.id))))
        return await context.error({
            error: "You are not staff"
        })

    return await command.run(context).catch(console.error)
}