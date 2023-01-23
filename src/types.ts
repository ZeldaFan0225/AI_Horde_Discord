import StableHorde from "@zeldafan0225/stable_horde";
import {
    AnySelectMenuInteraction,
    ApplicationCommandData, AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Interaction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";
import { Pool } from "pg";
import { StableHordeClient } from "./classes/client";

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
    database: Pool | undefined,
    stable_horde_manager: StableHorde
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
    interaction: AnySelectMenuInteraction
}

export interface ModalContextInitOptions extends BaseContextInitOptions {
    interaction: ModalSubmitInteraction
}

export interface AutocompleteContextInitOptions extends BaseContextInitOptions {
    interaction: AutocompleteInteraction
}

export interface RateNewImageData {
    dataset_id: string,
    id: string,
    url: string
}

export interface RateImageResponse {
    message: string,
    success: boolean,
    transfered: number
}

export interface Config {
    use_database?: boolean,
    default_token?: string,
    apply_roles_to_worker_owners?: string[],
    advanced?: {
        dev?: boolean,
        encrypt_token?: boolean
        pre_check_prompts_for_suspicion?: {
            enabled: boolean,
            timeout_duration?: number
        }
    },
    filter_actions?: {
        mode?: "whitelist" | "blacklist",
        guilds?: string[],
        apply_filter_to?: {
            react_to_transfer?: boolean,
            apply_roles_to_worker_owners?: boolean
        }
    },
    react_to_transfer?: {
        enabled?: boolean,
        emojis?: {
            id?: string,
            amount?: number,
            title?: string,
            message?: string
        }[],
        allow_delayed_claim?: boolean
    },
    logs?: {
        enabled?: boolean,
        directory?: string,
        plain?: boolean,
        csv?: boolean,
        log_actions?: {
            non_img2img?: boolean,
            img2img?: boolean
        }
    },
    interrogate?: {
        enabled?: boolean,
        update_interrogation_status_interval_seconds?: number,
        enable_user_captioning?: boolean,
        default?: {
            nsfw?: boolean,
            caption?: boolean,
            interrogation?: boolean
        },
        user_restrictions?: {
            allow_nsfw?: boolean,
            allow_caption?: boolean,
            allow_interrogation?: boolean
        }
    },
    advanced_generate?: {
        enabled?: boolean,
        require_login?: boolean,
        trusted_workers?: boolean,
        censor_nsfw?: boolean,
        workers?: string[],
        blacklisted_words?: string[],
        blacklisted_models?: string[],
        update_generation_status_interval_seconds?: number,
        improve_loading_time?: boolean,
        convert_a1111_weight_to_horde_weight?: boolean,
        default?: {
            tiling?: boolean,
            steps?: number,
            resolution?: {
                width?: number,
                height?: number
            },
            cfg?: number,
            sampler?: typeof StableHorde.ModelGenerationInputStableSamplers,
            model?: string,
            denoise?: number,
            gfpgan?: boolean,
            real_esrgan?: boolean,
            karras?: boolean,
            share?: boolean
        },
        img2img?: {
            require_login?: boolean,
            require_stable_horde_account_oauth_connection?: boolean,
            allow_non_webp?: boolean,
            require_nsfw_channel?: boolean,
            whitelist?: {
                only_allow_whitelist?: boolean,
                user_ids?: string[],
                bypass_checks?: boolean
            }
        },
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
            cfg?: {
                min?: number,
                max?: number
            },
            denoise?: {
                min?: number,
                max?: number
            },
            allow_sampler?: boolean,
            allow_cfg?: boolean,
            allow_seed?: boolean,
            allow_height?: boolean,
            allow_width?: boolean,
            allow_gfpgan?: boolean,
            allow_real_esrgan?: boolean,
            allow_seed_variation?: boolean,
            allow_tiling?: boolean,
            allow_steps?: boolean,
            allow_amount?: boolean,
            allow_models?: boolean,
            allow_nsfw?: boolean,
            allow_img2img?: boolean,
            allow_denoise?: boolean,
            allow_karras?: boolean,
            allow_sharing?: boolean,
            allow_rating?: boolean
        }
    }
}