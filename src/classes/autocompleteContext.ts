import { AutocompleteInteraction } from "discord.js";
import { AutocompleteContextInitOptions } from "../types";
import { BaseContext } from "./baseContext";

export class AutocompleteContext extends BaseContext {
    override interaction: AutocompleteInteraction
    constructor(options: AutocompleteContextInitOptions) {
        super(options)
        this.interaction = options.interaction
    }

    async error() {
        return await this.interaction.respond([]).catch()
    }
}