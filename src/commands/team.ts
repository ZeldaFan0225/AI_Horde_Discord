import { SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("team")
    .setDMPermission(false)
    .setDescription(`Shows information on a team`)
    .addStringOption(
        new SlashCommandStringOption()
        .setName("query")
        .setDescription("The ID or Name of the team")
        .setAutocomplete(true)
    )

export default class extends Command {
    constructor() {
        super({
            name: "team",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const query = ctx.interaction.options.getString("query")
        if(query) {

        }
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        const option = context.interaction.options.getFocused(true)
        switch(option.name) {
            case "query": {
                const teams = await context.stable_horde_manager.getTeams()
                if(context.client.config.dev) console.log(teams)
                const available = teams.filter(t => t.name?.includes(option.value) || t.id?.includes(option.value)).map(t => ({name: `${t.name} | ${t.id}`, value: t.id!}))
                return await context.interaction.respond(available)
            }
        }
    }
}