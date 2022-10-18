import {
    ApplicationCommandData, AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Interaction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";
import { Pool } from "pg";
import { APIManager } from "./classes/apiManager";
import { StableHordeClient } from "./classes/client";
import { ModelGenerationInputStableToggles } from "./stable_horde_types";

export enum StoreTypes {
    COMMANDS,
    COMPONENTS,
    CONTEXTS,
    MODALS
}

export interface StoreInitOptions {
    files_folder: string
    load_classes_on_init?: boolean,
    storetype: StoreTypes
}

export interface CommandInitOptions {
    name: string,
    command_data: ApplicationCommandData,
    staff_only: boolean,
}


export interface CustomIDInitOptions {
    name: string,
    staff_only?: boolean,
    regex: RegExp,
}

export interface BaseContextInitOptions {
    interaction: Interaction,
    client: StableHordeClient,
    database: Pool,
    api_manager: APIManager
}

export interface CommandContextInitOptions extends BaseContextInitOptions {
    interaction: ChatInputCommandInteraction
}

export interface UserContextContextInitOptions extends BaseContextInitOptions {
    interaction: UserContextMenuCommandInteraction
}

export interface MessageContextContextInitOptions extends BaseContextInitOptions {
    interaction: MessageContextMenuCommandInteraction
}

export interface ButtonContextInitOptions extends BaseContextInitOptions {
    interaction: ButtonInteraction
}

export interface SelectMenuContextInitOptions extends BaseContextInitOptions {
    interaction: SelectMenuInteraction
}

export interface ModalContextInitOptions extends BaseContextInitOptions {
    interaction: ModalSubmitInteraction
}

export interface AutocompleteContextInitOptions extends BaseContextInitOptions {
    interaction: AutocompleteInteraction
}

export interface Config {
    staff_roles?: string[],
    allow_nsfw?: boolean,
    trusted_workers?: boolean,
    censor_nsfw?: boolean,
    workers?: string[],
    default_steps?: number,
    default_res?: {
        width?: number,
        height?: number
    },
    default_cfg?: number,
    default_sampler?: ModelGenerationInputStableToggles,
    default_token?: string,
    dev?: boolean,
    blacklisted_words?: string[],
    blacklisted_models?: string[]
    update_generation_status_interval_seconds?: number,
    user_restrictions?: {
        width?: {
            min?: number,
            max?: number
        },
        height?: {
            min?: number,
            max?: number
        },
        amount?: {
            max?: number
        },
        steps?: {
            min?: number,
            max?: number
        },
        allow_models?: boolean
    }
}

export const ICONS = Object.freeze({
    "AMONG_US": "<a:AmongPartywo:843160353386135553>"
} as const)