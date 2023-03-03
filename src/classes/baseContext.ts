import AIHorde from "@zeldafan0225/ai_horde";
import {
    Interaction,
} from "discord.js";
import { Pool } from "pg";
import {BaseContextInitOptions} from "../types";
import { AIHordeClient } from "./client";

export class BaseContext{
    interaction: Interaction
    client: AIHordeClient
    database: Pool | undefined
    ai_horde_manager: AIHorde
    constructor(options: BaseContextInitOptions) {
        this.interaction = options.interaction
        this.client = options.client
        this.database = options.database
        this.ai_horde_manager = options.ai_horde_manager
    }
}