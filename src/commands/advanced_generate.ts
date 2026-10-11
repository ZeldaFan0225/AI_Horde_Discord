import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { advancedGenerationAutocomplete, buildAdvancedCommandData, runAdvancedGeneration } from "../utils/advancedGeneration";

export default class extends Command {
    constructor() {
        super({
            name: "advanced_generate",
            command_data: buildAdvancedCommandData("advanced_generate").toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        return await runAdvancedGeneration(ctx, "advanced_generate")
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        return await advancedGenerationAutocomplete(context)
    }
}
