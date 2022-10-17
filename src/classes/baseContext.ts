import {
    Interaction,
} from "discord.js";
import {BaseContextInitOptions} from "../types";
import { SupportClient } from "./client";

export class BaseContext{
    interaction: Interaction
    client: SupportClient
    constructor(options: BaseContextInitOptions) {
        this.interaction = options.interaction
        this.client = options.client
    }
}