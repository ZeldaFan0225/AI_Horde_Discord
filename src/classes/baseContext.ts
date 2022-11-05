import StableHorde from "@zeldafan0225/stable_horde";
import {
    Interaction,
} from "discord.js";
import { Pool } from "pg";
import {BaseContextInitOptions} from "../types";
import { StableHordeClient } from "./client";

export class BaseContext{
    interaction: Interaction
    client: StableHordeClient
    database: Pool | undefined
    stable_horde_manager: StableHorde
    constructor(options: BaseContextInitOptions) {
        this.interaction = options.interaction
        this.client = options.client
        this.database = options.database
        this.stable_horde_manager = options.stable_horde_manager
    }
}