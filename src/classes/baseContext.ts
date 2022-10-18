import {
    Interaction,
} from "discord.js";
import { Pool } from "pg";
import {BaseContextInitOptions} from "../types";
import { APIManager } from "./apiManager";
import { StableHordeClient } from "./client";

export class BaseContext{
    interaction: Interaction
    client: StableHordeClient
    database: Pool
    api_manager: APIManager
    constructor(options: BaseContextInitOptions) {
        this.interaction = options.interaction
        this.client = options.client
        this.database = options.database
        this.api_manager = options.api_manager
    }
}