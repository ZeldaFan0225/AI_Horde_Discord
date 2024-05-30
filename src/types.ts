import {ModelGenerationInputStableSamplers, AIHorde, ModelPayloadTextInversionsStable} from "@zeldafan0225/ai_horde";
import {
    AnySelectMenuInteraction,
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Interaction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody,
    UserContextMenuCommandInteraction
} from "discord.js";
import { Pool } from "pg";
import { AIHordeClient } from "./classes/client";

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
    command_data: RESTPostAPIChatInputApplicationCommandsJSONBody | RESTPostAPIContextMenuApplicationCommandsJSONBody,
    staff_only: boolean,
}


export interface CustomIDInitOptions {
    name: string,
    staff_only?: boolean,
    regex: RegExp,
}

export interface BaseContextInitOptions {
    interaction: Interaction,
    client: AIHordeClient,
    database: Pool | undefined,
    ai_horde_manager: AIHorde
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


export interface Party {
    index: number,
    channel_id: string,
    guild_id: string,
    creator_id: string,
    created_at: Date,
    ends_at: Date,
    style: string,
    award: number,
    recurring: boolean,
    shared_key?: string,
    users: string[],
    wordlist: string[]
}

export interface LORAFetchResponse {
    items: LORAData[],
    metadata: {
        totalItems: number,
        currentPage: number,
        pageSize: number,
        totalPages: number
    }
}

export interface LORAData {
    id: number,
    name: string,
    description: string,
    type: string,
    poi: boolean,
    nsfw: boolean,
    allowNoCredit: boolean,
    allowCommercialUse: string,
    allowDerivatives: boolean,
    allowDifferentLicense: boolean,
    stats: {
        downloadedCount: number,
        favoriteCount: number,
        commentCount: number,
        ratingCount: number,
        rating: number
    },
    creator: {
        username: string,
        image: string,
    },
    tags: string[],
    modelVersions: {
        id: number,
        modelId: number,
        name: string,
        createdAt: string,
        updatedAt: string,
        trainedWords: string[],
        baseModel: string,
        earlyAccessTimeFrame: number,
        description: string,
        stats: {
            downloadCount: number,
            ratingCount: number,
            rating: number
        },
        files: {
            name: string,
            id: number,
            sizeKB: number,
            type: string,
            metadata: {
                fp: null,
                size: null,
                format: string
            },
            pickleScanResult: string,
            pickleScanMessage: string,
            virusScanResult: string,
            scannedAt: string,
            hashes: {
                AutoV1: string,
                AutoV2: string,
                SHA256: string,
                CRC32: string,
                BLAKE3: string
            },
            downloadURL: string,
            primary: true
        }[],
        images: {
            url: string,
            nsfw: string,
            width: number,
            height: number,
            hash: string,
            meta: Record<string, any>
        }[],
        downloadUrl: string
    }[]
}

export interface HordeStyleData {
    prompt: string,
    model?: string,
    sampler_name?: string,
    width?: number,
    clip_skip?: number,
    height?: number,
    steps?: number,
    cfg_scale?: number,
    hires_fix?: boolean,
    loras?: {
        name: string,
        model?: number,
        clip?: number,
        is_version?: boolean,
        inject_trigger?: string
    }[],
    tis?: {
        name: string,
        inject_ti?: (typeof ModelPayloadTextInversionsStable[keyof typeof ModelPayloadTextInversionsStable]),
        strength?: number
    }[]
}

export interface Config {
    use_database?: boolean,
    default_token?: string,
    apply_roles_to_worker_owners?: string[],
    apply_roles_to_trusted_users?: string[],
    apply_roles_to_logged_in_users?: string[],
    advanced?: {
        dev?: boolean,
        encrypt_token?: boolean,
        result_structure_v2_enabled: boolean
    },
    filter_actions?: {
        mode?: "whitelist" | "blacklist",
        guilds?: string[],
        apply_filter_to?: {
            react_to_transfer?: boolean,
            apply_roles_to_worker_owners?: boolean,
            apply_roles_to_trusted_users?: boolean,
            apply_roles_to_logged_in_users?: boolean
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
            without_source_image?: boolean,
            with_source_image?: boolean
        }
    },
    interrogate?: {
        enabled?: boolean,
        update_interrogation_status_interval_seconds?: number,
        enable_user_captioning?: boolean,
        enable_image_description_context?: boolean,
        default?: {
            nsfw?: boolean,
            caption?: boolean,
            interrogation?: boolean,
            gfpgan?: boolean,
            realesrgan_x4_plus?: boolean,
            realesrgan_x4_plus_anime?: boolean,
            nmkd_siax?: boolean,
            animesharp_x4?: boolean,
            codeformers?: boolean,
            strip_background?: boolean
        },
        user_restrictions?: {
            allow_nsfw?: boolean,
            allow_caption?: boolean,
            allow_interrogation?: boolean,
            allow_gfpgan?: boolean,
            allow_realesrgan_x4_plus?: boolean,
            allow_realesrgan_x4_plus_anime?: boolean,
            allow_nmkd_siax?: boolean,
            allow_animesharp_x4?: boolean,
            allow_codeformers?: boolean,
            allow_strip_background?: boolean
        }
    },
    advanced_generate?: {
        enabled?: boolean,
        require_login?: boolean,
        trusted_workers?: boolean,
        censor_nsfw?: boolean,
        replacement_filter?: boolean,
        workers?: string[],
        blacklisted_words?: string[],
        blacklisted_models?: string[],
        blacklist_regex?: string,
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
            clip_skip?: number,
            amount?: number,
            sampler?: typeof ModelGenerationInputStableSamplers,
            model?: string,
            denoise?: number,
            gfpgan?: boolean,
            real_esrgan?: boolean,
            karras?: boolean,
            share?: boolean,
            keep_original_ratio: boolean
            style?: string,
            hires_fix?: boolean,
            tis?: string
        },
        source_image?: {
            require_login?: boolean,
            require_ai_horde_account_oauth_connection?: boolean,
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
            allow_negative_prompt: boolean,
            allow_style: boolean,
            allow_sampler?: boolean,
            allow_cfg?: boolean,
            allow_clip_skip?: boolean,
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
            allow_source_image?: boolean,
            allow_denoise?: boolean,
            allow_karras?: boolean,
            allow_sharing?: boolean,
            allow_rating?: boolean,
            allow_lora?: boolean,
            allow_hires_fix?: boolean,
            allow_tis?: boolean,
            allow_qr_codes?: boolean
        }
    },
    generate?: {
        enabled?: boolean,
        require_login?: boolean,
        trusted_workers?: boolean,
        censor_nsfw?: boolean,
        replacement_filter?: boolean,
        blacklisted_words?: string[],
        blacklisted_styles?: string[],
        blacklist_regex?: string,
        update_generation_status_interval_seconds?: number,
        improve_loading_time?: boolean,
        convert_a1111_weight_to_horde_weight?: boolean,
        default?: {
            tiling?: boolean,
            clip_skip?: number,
            amount?: number,
            share?: boolean,
            style?: string,
            keep_original_ratio?: boolean,
            denoise?: number
        },
        source_image?: {
            require_login?: boolean,
            require_ai_horde_account_oauth_connection?: boolean,
            allow_non_webp?: boolean,
            require_nsfw_channel?: boolean,
            whitelist?: {
                only_allow_whitelist?: boolean,
                user_ids?: string[],
                bypass_checks?: boolean
            }
        },
        user_restrictions?: {
            amount?: {
                max?: number
            },
            denoise?: {
                min?: 0,
                max?: 100
            },
            allow_negative_prompt: boolean,
            allow_style: boolean,
            allow_tiling?: boolean,
            allow_amount?: boolean,
            allow_nsfw?: boolean,
            allow_sharing?: boolean,
            allow_rating?: boolean,
            allow_source_image?: boolean,
            allow_denoise?: boolean,
            allow_qr_codes?: boolean
        }
    },
    remix?: {
        enabled?: boolean,
        require_login?: boolean,
        trusted_workers?: boolean,
        blacklisted_words?: string[],
        blacklist_regex?: string,
        convert_a1111_weight_to_horde_weight?: boolean,
        allow_custom_strength: boolean,
        generation_options?: {
            sampler_name?: string,
            width?: number,
            height?: number,
            allow_nsfw?: boolean,
            censor_nsfw?: boolean,
            model: string,
            share_result?: boolean,
            cfg?: number,
            denoise?: number,
            steps?: number
        }
    },
    party?: {
        enabled?: boolean,
        mention_roles?: string[],
        default?: {
            recurring?: boolean
            pay_for_generations?: boolean
        },
        user_restrictions?: {
            award?: {
                min?: number,
                max?: number
            },
            duration?: {
                min?: number,
                max?: number
            },
            wordlist?: {
                min?: number,
                max?: number
            }
        }
    },
    data_sources?: {
        curated_loras_source?: string
        styles_source?: string
        style_categories_source?: string,
    }
}
