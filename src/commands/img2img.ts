import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { advancedGenerationAutocomplete, buildAdvancedCommandData, runAdvancedGeneration } from "../utils/advancedGeneration";

export default class extends Command {
    constructor() {
        super({
            name: "img2img",
            command_data: buildAdvancedCommandData("img2img").toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        return await runAdvancedGeneration(ctx, "img2img")
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        return await advancedGenerationAutocomplete(context)
    }
}
