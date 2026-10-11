import { AttachmentBuilder, ButtonBuilder, ChannelType, Colors, EmbedBuilder, InteractionButtonComponentData, SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from "discord.js";
import { CommandContext } from "../classes/commandContext";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { Config } from "../types";
import { readFileSync, appendFileSync } from "fs";
import { ImageGenerationInput, ModelGenerationInputControlTypes, ModelGenerationInputSchedulers, ModelGenerationInputStableSamplers } from "@zeldafan0225/ai_horde";
import { applyForcedNegativePrompt, buildPostProcessing, downloadImage, FACE_FIXERS, fetchSourceImageURL, getWebPSize, NO_POST_PROCESSOR, parseAutocompleteValue, resolveNSFW, UPSCALERS } from "./generation";
const {buffer2webpbuffer} = require("webp-converter")

/**
 * /advanced_generate and /img2img share this pipeline.
 * img2img takes the source image options (attachment, URL, ControlNet, QR code), which frees those slots in advanced_generate.
 * Discord allows at most 25 options per command, keep that in mind when adding options.
 */
export type AdvancedGenerationMode = "advanced_generate" | "img2img"

const config = JSON.parse(readFileSync("./config.json").toString()) as Config

const SAMPLERS = Object.values(ModelGenerationInputStableSamplers) as string[]
const SCHEDULERS = Object.values(ModelGenerationInputSchedulers) as string[]
const CONTROL_TYPES = Object.values(ModelGenerationInputControlTypes) as string[]

/** The default failure timeout. The API sometimes reports jobs as stuck that still finish, so this is generous. */
const DEFAULT_FAILURE_TIMEOUT_SECONDS = 60 * 10

export function buildAdvancedCommandData(mode: AdvancedGenerationMode) {
    const restrictions = config.advanced_generate?.user_restrictions
    const command_data = new SlashCommandBuilder()
        .setName(mode)
        .setDMPermission(false)
        .setDescription(mode === "img2img" ? "Generates an image from a source image with ai horde" : "Generates an image with ai horde")

    const enabled = mode === "img2img" ? config.advanced_generate?.enabled && config.img2img?.enabled : config.advanced_generate?.enabled
    if(!enabled) return command_data

    command_data.addStringOption(
        new SlashCommandStringOption()
        .setName("prompt")
        .setDescription("The prompt to generate an image with")
        .setRequired(true)
    )
    if(mode === "img2img") {
        if(restrictions?.allow_source_image) {
            command_data
            .addAttachmentOption(
                new SlashCommandAttachmentOption()
                .setName("source_image")
                .setDescription("The image to use as the source image; max: 3072px")
            )
            if(config.img2img?.user_restrictions?.allow_source_url) {
                command_data.addStringOption(
                    new SlashCommandStringOption()
                    .setName("source_url")
                    .setDescription("A link to the image to use as the source image; max: 3072px")
                )
            }
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("keep_original_ratio")
                .setDescription("Whether to keep the aspect ratio and image size of the original image")
            )
            if(config.img2img?.user_restrictions?.allow_controlnet) {
                command_data
                .addStringOption(
                    new SlashCommandStringOption()
                    .setName("control_type")
                    .setDescription("The ControlNet type to guide the generation with the source image")
                    .setAutocomplete(true)
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                    .setName("image_is_control")
                    .setDescription("Set to true if the source image already is a ControlNet map")
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                    .setName("return_control_map")
                    .setDescription("Return the ControlNet map instead of a generated image")
                )
            }
        }
        if(restrictions?.allow_qr_codes) {
            command_data.addStringOption(
                new SlashCommandStringOption()
                .setName("qr_code_url")
                .setDescription("The url to use for the qr code")
            )
        }
    }
    if(restrictions?.allow_negative_prompt) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("negative_prompt")
            .setDescription("The negative prompt to generate an image with")
            .setRequired(false)
        )
    }
    if(restrictions?.allow_sampler) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("sampler")
            .setDescription("The sampler to use")
            // more samplers exist than discord allows as choices (25), so they are offered via autocomplete
            .setAutocomplete(true)
        )
    }
    if(restrictions?.allow_scheduler ?? restrictions?.allow_karras) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("scheduler")
            .setDescription("The noise schedule to sample on")
            .setChoices(...SCHEDULERS.map(s => ({name: s, value: s})))
        )
    }
    if(restrictions?.allow_cfg) {
        command_data.addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("cfg")
            .setDescription("How strictly to follow the given prompt")
            .setMinValue(restrictions.cfg?.min ?? 1)
            .setMaxValue(restrictions.cfg?.max ?? 100)
        )
    }
    if(restrictions?.allow_denoise) {
        command_data.addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("denoise")
            .setDescription("How much to denoise in %")
            .setMinValue(restrictions.denoise?.min ?? 0)
            .setMaxValue(restrictions.denoise?.max ?? 100)
        )
    }
    if(restrictions?.allow_seed) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("seed")
            .setDescription("The seed to use")
        )
    }
    if(restrictions?.height) {
        command_data.addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("height")
            .setDescription("The height of the result image")
            .setMinValue(restrictions.height?.min ?? 64)
            .setMaxValue(restrictions.height?.max ?? 3072)
            .setAutocomplete(true)
        )
    }
    if(restrictions?.allow_width) {
        command_data.addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("width")
            .setDescription("How width of the result image")
            .setMinValue(restrictions.width?.min ?? 64)
            .setMaxValue(restrictions.width?.max ?? 3072)
            .setAutocomplete(true)
        )
    }
    if(restrictions?.allow_face_fixer ?? restrictions?.allow_gfpgan) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("face_fixer")
            .setDescription("The face fixer to apply after generation")
            .setChoices({name: "None", value: NO_POST_PROCESSOR}, ...FACE_FIXERS.map(f => ({name: f, value: f})))
        )
    }
    if(restrictions?.allow_upscaler ?? restrictions?.allow_real_esrgan) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("upscaler")
            .setDescription("The upscaler to apply after generation")
            .setChoices({name: "None", value: NO_POST_PROCESSOR}, ...UPSCALERS.map(u => ({name: u, value: u})))
        )
    }
    if(restrictions?.allow_steps) {
        command_data.addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("steps")
            .setDescription("How many steps to go though while creating the image")
            .setMinValue(restrictions.steps?.min ?? 1)
            .setMaxValue(restrictions.steps?.max ?? 500)
        )
    }
    if(restrictions?.allow_amount) {
        command_data.addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("amount")
            .setDescription("How many images to generate")
            .setMinValue(1)
            .setMaxValue(restrictions.amount?.max ?? 4)
        )
    }
    if(restrictions?.allow_style) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("style")
            .setDescription("The style for this image")
            .setRequired(false)
            .setAutocomplete(true)
        )
    }
    if(restrictions?.allow_models) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("model")
            .setDescription("The model to use for this generation")
            .setAutocomplete(true)
        )
    }
    if(restrictions?.allow_sharing) {
        command_data.addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("share_result")
            .setDescription("Whether to share your generation result for research")
        )
    }
    if(restrictions?.allow_nsfw) {
        command_data.addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("nsfw")
            .setDescription(config.advanced_generate?.channel_based_nsfw ? "Whether to allow NSFW results (only in age restricted channels)" : "Whether to allow NSFW results")
        )
    }
    if(restrictions?.allow_clip_skip) {
        command_data.addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("clip_skip")
            .setDescription("The number of CLIP language processor layers to skip")
            .setMinValue(1) //1 is off/default
            .setMaxValue(12)
        )
    }
    if(mode === "advanced_generate") {
        if(restrictions?.allow_tiling) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("tiling")
                .setDescription("Makes generated image have a seemless transition when stitched together")
            )
        }
        if(restrictions?.allow_lora) {
            command_data.addStringOption(
                new SlashCommandStringOption()
                .setName("lora")
                .setDescription("The LORA, LoCon or LyCORIS to use for this request")
                .setAutocomplete(true)
            )
        }
        if(restrictions?.allow_tis) {
            command_data.addStringOption(
                new SlashCommandStringOption()
                .setName("textual_inversion")
                .setDescription("The textual inversions IDs to apply separated with comma")
            )
        }
        if(restrictions?.allow_hires_fix) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("hires_fix")
                .setDescription("Whether to apply hires_fix to the generation")
            )
        }
    }

    return command_data
}

function generateButtons(id: string) {
    let i = 0
    const getId = () => `followuprate_${i+1}_${id}`
    const components: {type: 1, components: InteractionButtonComponentData[]}[] = []
    while(i < 10) {
        const btn = {
            type: 2,
            label: `${i+1}`,
            customId: getId(),
            style: 1
        }
        if(!components[Math.floor(i/5)]?.components) components.push({type: 1, components: []})
        components[Math.floor(i/5)]!.components.push(btn)
        ++i
    }
    return components
}

export async function runAdvancedGeneration(ctx: CommandContext, mode: AdvancedGenerationMode): Promise<any> {
    const ag_config = ctx.client.config.advanced_generate
    if(!ag_config?.enabled) return ctx.error({error: "Generation is disabled."})
    if(mode === "img2img" && !ctx.client.config.img2img?.enabled) return ctx.error({error: "Image to image generation is disabled."})

    await ctx.interaction.deferReply({})
    let prompt = ctx.interaction.options.getString("prompt", true)

    const style_raw = parseAutocompleteValue(ctx.interaction.options.getString("style")) ?? ag_config.default?.style
    const style = ctx.client.horde_styles[style_raw?.toLowerCase() ?? ""] || {prompt: "{p}{np}"}

    const negative_prompt = applyForcedNegativePrompt(ctx.interaction.options.getString("negative_prompt") ?? "", ag_config.forced_negative_prompt)
    const sampler = (ctx.interaction.options.getString("sampler") ?? ag_config.default?.sampler ?? ModelGenerationInputStableSamplers.k_euler) as any
    const scheduler = ctx.interaction.options.getString("scheduler") || ag_config.default?.scheduler || (ag_config.default?.karras ? "karras" : undefined)
    const cfg = ctx.interaction.options.getInteger("cfg") ?? style.cfg_scale ?? ag_config.default?.cfg ?? 7.5
    const denoise = (ctx.interaction.options.getInteger("denoise") ?? ag_config.default?.denoise ?? 50)/100
    const seed = ctx.interaction.options.getString("seed")
    const face_fixer = ctx.interaction.options.getString("face_fixer") || ag_config.default?.face_fixer || (ag_config.default?.gfpgan ? "GFPGAN" : undefined)
    const upscaler = ctx.interaction.options.getString("upscaler") || ag_config.default?.upscaler || (ag_config.default?.real_esrgan ? "RealESRGAN_x4plus" : undefined)
    const tiling = !!(ctx.interaction.options.getBoolean("tiling") ?? ag_config.default?.tiling)
    const steps = ctx.interaction.options.getInteger("steps") ?? style.steps ?? ag_config.default?.steps ?? 30
    const amount = ctx.interaction.options.getInteger("amount") ?? ag_config.default?.amount ?? 1
    let height = ctx.interaction.options.getInteger("height") ?? style?.height ?? ag_config.default?.resolution?.height ?? 512
    let width = ctx.interaction.options.getInteger("width") ?? style?.width ?? ag_config.default?.resolution?.width ?? 512
    const model = parseAutocompleteValue(ctx.interaction.options.getString("model")) ?? style?.model ?? ag_config.default?.model
    const keep_ratio = ctx.interaction.options.getBoolean("keep_original_ratio") ?? ag_config.default?.keep_original_ratio ?? true
    const share_result = ctx.interaction.options.getBoolean("share_result") ?? ag_config.default?.share
    const lora_id = ctx.interaction.options.getString("lora")
    const ti_raw = ctx.interaction.options.getString("textual_inversion") ?? ag_config.default?.tis
    const hires_fix = ctx.interaction.options.getBoolean("hires_fix") ?? ag_config.default?.hires_fix
    const qr_code_url = ctx.interaction.options.getString("qr_code_url")
    const clipskip = ctx.interaction.options.getInteger("clip_skip") ?? style?.clip_skip ?? ag_config.default?.clip_skip
    const control_type = ctx.interaction.options.getString("control_type")
    const image_is_control = ctx.interaction.options.getBoolean("image_is_control") ?? undefined
    const return_control_map = ctx.interaction.options.getBoolean("return_control_map") ?? undefined
    const img = ctx.interaction.options.getAttachment("source_image")
    const source_url = ctx.interaction.options.getString("source_url")
    const has_source = !!(img || source_url)
    const {nsfw, censor_nsfw} = resolveNSFW({
        channel: ctx.interaction.channel,
        allow_nsfw: ag_config.user_restrictions?.allow_nsfw,
        censor_nsfw: ag_config.censor_nsfw,
        channel_based_nsfw: ag_config.channel_based_nsfw,
        requested: ctx.interaction.options.getBoolean("nsfw") ?? ag_config.default?.nsfw
    })

    const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
    const ai_horde_user = await ctx.ai_horde_manager.findUser({token: user_token  || ctx.client.config?.default_token || "0000000000"}).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
    const can_bypass = ag_config.source_image?.whitelist?.bypass_checks && ag_config.source_image?.whitelist?.user_ids?.includes(ctx.interaction.user.id)
    const party = await ctx.client.getParty(ctx.interaction.channelId, ctx.database)

    if(lora_id) {
        const lora = await ctx.client.fetchLORAByID(lora_id, ag_config.user_restrictions?.allow_nsfw)
        if(ctx.client.config.advanced?.dev) console.log(lora)
        if(!lora) return ctx.error({error: "A LORA ID from https://civitai.com/ has to be given. LoCon and LyCORIS are also acceptable.", codeblock: false})
        if(lora.type !== "LORA" && lora.type !== "LoCon") return ctx.error({error: "The given ID is not a LORA, LoCon or LyCORIS"})
        if(lora.modelVersions[0]?.files[0]?.sizeKB && lora.modelVersions[0]?.files[0]?.sizeKB > 225280 && !ctx.client.horde_curated_loras?.includes(lora.id)) return ctx.error({error: "The given LORA, LoCon or LyCORIS is larger than 220mb"})
    }
    const lora_obj = lora_id ? [{
            "name": lora_id,
            "inject_trigger": "all"
        }] : style?.loras;

    if(party?.channel_id) return ctx.error({error: `You can only use ${await ctx.client.getSlashCommandTag("generate")} in parties`, codeblock: false})
    if(ag_config.require_login && !user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use ${await ctx.client.getSlashCommandTag(mode)}`, codeblock: false})
    if(ag_config.blacklist_regex && new RegExp(ag_config.blacklist_regex, "i").test(prompt.replace(/[̀-ͯ]/g, ""))) return ctx.error({error: "Your prompt included one or more blacklisted words"})
    if(ag_config.blacklisted_words?.some(w => prompt.toLowerCase().includes(w.toLowerCase()))) return ctx.error({error: "Your prompt included one or more blacklisted words"})
    if(!SAMPLERS.includes(sampler)) return ctx.error({error: "Unknown sampler"})
    if(scheduler && !SCHEDULERS.includes(scheduler)) return ctx.error({error: "Unknown scheduler"})
    if(control_type && !CONTROL_TYPES.includes(control_type)) return ctx.error({error: "Unknown ControlNet type"})
    if(control_type && !has_source) return ctx.error({error: "A ControlNet type requires a source image"})
    if(mode === "img2img" && !has_source && !qr_code_url) return ctx.error({error: "Please provide a source image, a source URL or a QR code URL"})
    if(img && source_url) return ctx.error({error: "Please provide either a source image or a source URL, not both"})
    if(height % 64 !== 0) return ctx.error({error: "Height must be a multiple of 64"})
    if(width % 64 !== 0) return ctx.error({error: "Width must be a multiple of 64"})
    if(model && ag_config.blacklisted_models?.includes(model)) return ctx.error({error: "This model is blacklisted"})
    if(model && model !== "YOLO" && !(await ctx.ai_horde_manager.getModels()).find(m => m.name === model)) return ctx.error({error: "Unable to find this model"})
    if(has_source && !can_bypass && !user_token) return ctx.error({error: `You need to ${await ctx.client.getSlashCommandTag("login")} and agree to our ${await ctx.client.getSlashCommandTag("terms")} first before being able to use a source image`, codeblock: false})
    if(has_source && ag_config.source_image?.require_ai_horde_account_oauth_connection && (!ai_horde_user || ai_horde_user.pseudonymous)) return ctx.error({error: "Your ai horde account needs to be created with a oauth connection"})
    if(has_source && !can_bypass && ag_config.source_image?.require_nsfw_channel && (ctx.interaction.channel?.type !== ChannelType.GuildText || !ctx.interaction.channel.nsfw)) return ctx.error({error: "This channel needs to be marked as age restricted to use a source image"})
    if(has_source && ag_config.source_image?.whitelist?.only_allow_whitelist && !ag_config.source_image?.whitelist?.user_ids?.includes(ctx.interaction.user.id)) return ctx.error({error: "You are not whitelisted to use a source image"})
    if(img && !img.contentType?.startsWith("image/")) return ctx.error({error: "Source Image input must be a image"})
    if(img && ((img.height ?? 0) > 3072 || (img.width ?? 0) > 3072)) return ctx.error({error: "Source Image input too large (max. 3072 x 3072)"})

    // download the source image from the attachment or the given URL and convert it to webp
    let img_data: Buffer | undefined
    let source_size: {width: number, height: number} | null = img?.width && img?.height ? {width: img.width, height: img.height} : null
    if(has_source) {
        let raw: {data: Buffer, content_type: string}
        if(img) {
            const data = await downloadImage(img.url)
            if(!data) return ctx.error({error: "Unable to download the source image"})
            raw = {data, content_type: img.contentType ?? ""}
        } else {
            const fetched = await fetchSourceImageURL(source_url!)
            if("error" in fetched) return ctx.error({error: fetched.error})
            raw = fetched
        }
        if(!can_bypass && !ag_config.source_image?.allow_non_webp && raw.content_type !== "image/webp") return ctx.error({error: "You can only use webp as the source image"})

        if(raw.content_type === "image/webp") img_data = raw.data
        else {
            img_data = await buffer2webpbuffer(raw.data, raw.content_type.replace("image/",""),"-q 80").catch((e: Error) => ctx.client.config.advanced?.dev ? console.error(e) : null)
            if(!img_data) return ctx.error({
                error: "Image format conversion to webp failed"
            })
        }
        source_size ??= getWebPSize(img_data!)
        if(source_size && (source_size.height > 3072 || source_size.width > 3072)) return ctx.error({error: "Source Image input too large (max. 3072 x 3072)"})
    }

    if(keep_ratio && source_size) {
        const ratio = source_size.width/source_size.height
        const largest = ratio >= 1 ? source_size.width : source_size.height
        const m = largest > 3072 ? 3072/largest : 1
        const mod_height = Math.round(source_size.height*m)
        const mod_width = Math.round(source_size.width*m)
        height = mod_height%64 <= 32 ? mod_height-(mod_height%64) : mod_height+(64-(mod_height%64))
        width = mod_width%64 <= 32 ? mod_width-(mod_width%64) : mod_width+(64-(mod_width%64))
    }

    height = ctx.interaction.options.getInteger("height") ?? height
    width = ctx.interaction.options.getInteger("width") ?? width

    if(ag_config.convert_a1111_weight_to_horde_weight) {
        prompt = prompt.replace(/(\(+|\[+)|(?<!:\d(\.\d+)?)(\)+|]+)/g, (w) => {
            if(w.startsWith("(") || w.startsWith("[")) return "("
            if(w.startsWith(":")) return w;
            const weight = 1 + (0.1 * (w.startsWith(")") ? 1 : -1) * w.length)
            return `:${weight.toFixed(1)})`
        })
    }

    const tis = ti_raw?.split(",").map(ti => ti.trim()).filter(v => v).map(ti => ({name: ti, inject_ti: prompt.toLowerCase().indexOf("embedding:") === -1 ? "prompt" as const : undefined}))

    prompt = style.prompt.slice().replace("{p}", prompt)
    prompt = prompt.replace("{np}", !negative_prompt || prompt.includes("###") ? negative_prompt : `###${negative_prompt}`)

    if(party && party.wordlist.length) {
        if(ctx.client.config.advanced?.dev) {
            console.log(party.wordlist)
        }
        if(!party.wordlist.every(w => prompt.toLowerCase().includes(w))) return ctx.error({error: "Your prompt does not include all required words"})
    }

    if(ctx.client.config.advanced?.dev) {
        console.log(source_size)
        console.log(height)
        console.log(width)
    }

    const token = party?.shared_key || user_token || ctx.client.config.default_token || "0000000000"

    const generation_data: ImageGenerationInput = {
        prompt,
        params: {
            sampler_name: sampler,
            scheduler: scheduler as typeof ModelGenerationInputSchedulers[keyof typeof ModelGenerationInputSchedulers] | undefined,
            cfg_scale: cfg,
            clip_skip: clipskip,
            seed: seed ?? undefined,
            height,
            width,
            post_processing: buildPostProcessing(face_fixer, upscaler),
            tiling,
            steps,
            n: amount,
            denoising_strength: denoise,
            loras: lora_obj,
            tis,
            hires_fix,
            control_type: control_type as typeof ModelGenerationInputControlTypes[keyof typeof ModelGenerationInputControlTypes] | undefined,
            image_is_control: control_type ? image_is_control : undefined,
            return_control_map: control_type ? return_control_map : undefined,
            workflow: qr_code_url ? "qr_code" : undefined,
            extra_texts: qr_code_url ? [{text: qr_code_url, reference: "qr_code"}] : undefined
        },
        replacement_filter: ag_config.replacement_filter,
        nsfw,
        censor_nsfw,
        trusted_workers: ag_config.trusted_workers,
        workers: ag_config.workers,
        models: !model ? undefined : model === "YOLO" ? [] : [model],
        source_image: img_data?.toString("base64"),
        r2: true,
        shared: share_result
    }

    if(token === "0000000000" && ((generation_data.params?.width ?? 512) > 1024 || (generation_data.params?.height ?? 512) > 1024 || (generation_data.params?.steps ?? 512) > 100)) return ctx.error({error: "You need to be logged in to generate images with a size over 1024*1024 or more than 100 steps"})

    if(ctx.client.config.advanced?.dev) {
        console.log(token)
        console.log(generation_data)
    }

    const generation_start = await ctx.ai_horde_manager.postAsyncImageGenerate(generation_data, {token})
    .catch((e) => {
        if(ctx.client.config.advanced?.dev) console.error(e)
        return e.rawError as any;
    })
    if(!generation_start || !generation_start.id) return ctx.error({error: `Unable to start generation: ${generation_start.message}${Object.entries(generation_start.errors || {}).map(([k, v]) => `\n${k}: ${v}`).join("")}`});


    if (ctx.client.config.logs?.enabled) {
        if (ctx.client.config.logs.log_actions?.with_source_image && img_data) {
            if (ctx.client.config.logs.plain) logGeneration("txt");
            if (ctx.client.config.logs.csv) logGeneration("csv");
        } else if(ctx.client.config.logs.log_actions?.without_source_image && !img_data) {
            if (ctx.client.config.logs.plain) logGeneration("txt");
            if (ctx.client.config.logs.csv) logGeneration("csv");
        }
        function logGeneration(type: "txt" | "csv") {
            ctx.client.initLogDir();
            const log_dir = ctx.client.config.logs?.directory ?? "/logs";
            const content = type === "csv" ? `\n${new Date().toISOString()},${ctx.interaction.user.id},${generation_start?.id},${!!img_data},"${prompt}"` : `\n${new Date().toISOString()} | ${ctx.interaction.user.id}${" ".repeat(20 - ctx.interaction.user.id.length)} | ${generation_start?.id} | ${!!img_data}${" ".repeat(img_data ? 10 : 9)} | ${prompt}`;
            appendFileSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth() + 1}-${new Date().getFullYear()}.${type}`, content);
        }
    }

    if(ctx.client.config.advanced?.dev) console.log(`${ctx.interaction.user.id} generated${img_data ? " using a source image":""} with prompt "${prompt}" (${generation_start?.id})`)

    const start_status = await ctx.ai_horde_manager.getImageGenerationCheck(generation_start.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
    const start_horde_data = await ctx.ai_horde_manager.getPerformance()

    if(ctx.client.config.advanced?.dev) {
        console.log(start_status)
    }

    const embed = new EmbedBuilder({
        color: Colors.Blue,
        title: "Generation started",
        description: `Position: \`${start_status?.queue_position}\`/\`${start_horde_data.queued_requests}\`
Kudos consumed: \`${start_status?.kudos}\`
Workers: \`${start_horde_data.worker_count}\`

\`${start_status?.waiting}\`/\`${amount}\` Images waiting
\`${start_status?.processing}\`/\`${amount}\` Images processing
\`${start_status?.finished}\`/\`${amount}\` Images finished
${"🟥".repeat(start_status?.waiting ?? 0)}${"🟨".repeat(start_status?.processing ?? 0)}${"🟩".repeat(start_status?.finished ?? 0)}
${!start_status?.is_possible ? "\nRequest can not be fulfulled with current amount of workers...\n" : ""}
ETA: <t:${Math.floor(Date.now()/1000)+(start_status?.wait_time ?? 0)}:R>`
    })

    const login_embed = new EmbedBuilder({
        color: Colors.Red,
        title: "You are not logged in",
        description: `This will make your requests appear anonymous.\nThis can result in low generation speed due to low priority.\nLog in now with ${await ctx.client.getSlashCommandTag("login")}\n\nDon't know what the token is?\nCreate an ai horde account here: https://aihorde.net/register`
    })

    if(ctx.client.config.advanced?.dev) embed.setFooter({text: generation_start.id})

    const btn = new ButtonBuilder({
        label: "Cancel",
        custom_id: `cancel_gen_${generation_start.id}`,
        style: 4
    })
    const delete_btn: InteractionButtonComponentData = {
        label: "Delete this message",
        customId: `delete_${ctx.interaction.user.id}`,
        style: 4,
        type: 2
    }
    const components = [{type: 1,components: [btn.toJSON()]}]

    ctx.interaction.editReply({
        content: "",
        embeds: token === (ctx.client.config.default_token ?? "0000000000") ? [embed.toJSON(), login_embed.toJSON()] : [embed.toJSON()],
        components
    })

    const message = await ctx.interaction.fetchReply()

    const failure_timeout = 1000 * (ag_config.generation_failure_timeout_seconds ?? DEFAULT_FAILURE_TIMEOUT_SECONDS)
    let error_timeout = Date.now()*2
    let prev_left = 1

    let done = false

    if(ag_config.improve_loading_time && (start_status?.wait_time ?? 0) <= 3) {
        // wait before starting the loop so that the first iteration can already pick up the result
        const pre_test = await new Promise((resolve) => setTimeout(async () => {resolve(await getCheckAndDisplayResult().catch(console.error))},((start_status?.wait_time ?? 0) + 0.1) * 1000))
        if(!pre_test) return;
    }

    const inter = setInterval(async () => {
        const d = await getCheckAndDisplayResult().catch(console.error)
        if(!d) return;
        const {status, horde_data} = d
        if(ag_config.improve_loading_time && (status.wait_time ?? 0) <= 3) {
            // try to display result faster
            setTimeout(async () => {await getCheckAndDisplayResult().catch(console.error)},((start_status?.wait_time ?? 0) + 0.1) * 1000)
        }

        if(status?.wait_time === 0 && prev_left !== 0) error_timeout = Date.now()
        prev_left = status?.wait_time ?? 1

        if(error_timeout < (Date.now()-failure_timeout) || start_status?.faulted) {
            if(!done) {
                await ctx.ai_horde_manager.deleteImageGenerationRequest(generation_start.id!)
                message.edit({
                    components: [],
                    content: "Generation cancelled due to errors",
                    embeds: []
                })
            }
            clearInterval(inter)
            return;
        }

        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Generation started",
            description: `Position: \`${status.queue_position}\`/\`${horde_data.queued_requests}\`
Kudos consumed: \`${status?.kudos}\`
Workers: \`${horde_data.worker_count}\`

\`${status.waiting}\`/\`${amount}\` Images waiting
\`${status.processing}\`/\`${amount}\` Images processing
\`${status.finished}\`/\`${amount}\` Images finished
​${"🟥".repeat(status.waiting ?? 0)}​${"🟨".repeat(status.processing ?? 0)}​${"🟩".repeat(status.finished ?? 0)}
${!status.is_possible ? "\nRequest can not be fulfulled with current amount of workers...\n" : ""}
ETA: <t:${Math.floor(Date.now()/1000)+(status?.wait_time ?? 0)}:R>`
        })

        if(ctx.client.config.advanced?.dev) embed.setFooter({text: generation_start?.id ?? "Unknown ID"})

        let embeds = token === (ctx.client.config.default_token ?? "0000000000") ? [embed.toJSON(), login_embed.toJSON()] : [embed.toJSON()]

        if((status?.wait_time ?? 0) > 60 * 2) {
            embeds.push(new EmbedBuilder({
                color: Colors.Yellow,
                title: "AI Horde currently is under high load",
                description: "You can contribute your GPUs processing power to the project.\nRead more: https://aihorde.net/"
            }).toJSON())
        }

        return message.edit({
            content: "",
            embeds,
            components
        })
    }, 1000 * (ag_config.update_generation_status_interval_seconds || 5))

    async function getCheckAndDisplayResult(precheck?: boolean) {
        if(done) return;
        const status = await ctx.ai_horde_manager.getImageGenerationCheck(generation_start!.id!, {force: true}).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
        done = !!status?.done
        const horde_data = await ctx.ai_horde_manager.getPerformance()
        if(!status || (status as any).faulted) {
            if(!done) await message.edit({content: "Image generation has been cancelled", embeds: []});
            if(!precheck) clearInterval(inter)
            return null;
        }

        if(ctx.client.config.advanced?.dev) {
            console.log(status)
        }

        if(!status.done) return {status, horde_data}
        else {
            done = true
            const images = await ctx.ai_horde_manager.getImageGenerationStatus(generation_start!.id!)
            const seeds = images.generations?.map(g => g.seed).filter(s => s) ?? []
            const footer_text = `Generation ID ${generation_start!.id}${seeds.length ? ` | Seed${seeds.length > 1 ? "s" : ""} ${seeds.join(", ")}` : ""}`

            if(ctx.client.config.advanced?.result_structure_v2_enabled ?? true) {
                const image_map_r = images.generations?.map(async g => {
                    if(g.censored) return {attachment: null, generation: g, failed: false}
                    const body = await downloadImage(g.img!)
                    if(!body) return {attachment: null, generation: g, failed: true}
                    const attachment = new AttachmentBuilder(body, {name: `${g.id}.webp`})
                    return {attachment, generation: g, failed: false}
                }) || []
                if(!precheck) clearInterval(inter)

                const image_map = await Promise.all(image_map_r)
                const files = image_map.filter(i => i.attachment).map(i => i.attachment) as  AttachmentBuilder[]
                const failed_downloads = image_map.map((i, n) => i.failed ? `[Image ${n+1}](${i.generation.img})` : null).filter(l => l)
                if(img_data && image_map.length < 10) files.push(new AttachmentBuilder(img_data, {name: "original.webp"}))
                let components = [{type: 1, components: [delete_btn]}]
                const embeds = [
                    new EmbedBuilder({
                        title: "Generation Finished",
                        description: `**Prompt** ${prompt}\n**Style** ${style_raw}\n**Kudos Consumed** \`${images.kudos}\`${image_map.some(i => i.generation.censored) ? "\nCensored Images are not displayed" : ""}${failed_downloads.length ? `\nSome images could not be downloaded, open them here: ${failed_downloads.join(", ")}` : ""}`,
                        color: Colors.Blue,
                        footer: {text: footer_text},
                        thumbnail: img_data && image_map.length < 10 ? {url: "attachment://original.webp"} : img ? {url: img.url} : source_url ? {url: source_url} : undefined
                    })
                ]

                if(ag_config?.user_restrictions?.allow_rating && (generation_data.shared ?? true) && files.length === 1) {
                    components = [...generateButtons(generation_start!.id!), ...components]
                }
                await message.edit({content: null, components, embeds, files});
                return null
            }

            const image_map_r = images.generations?.map(async (g, i) => {
                const body = await downloadImage(g.img!)
                const embed = new EmbedBuilder({
                    title: `Image ${i+1}`,
                    color: Colors.Blue,
                    description: `**Seed:** ${g.seed}\n**Model:** ${g.model}\n**Generated by** ${g.worker_name}\n(\`${g.worker_id}\`)${!i ? `\n**Prompt:** ${prompt}\n**Total Kudos Cost:** \`${images.kudos}\`` : ""}${!body ? `\n**Unable to download this image, open it [here](${g.img})**` : ""}${ctx.client.config.advanced?.dev ? `\n\n**Image ID** ${g.id}` : ""}`,
                })
                if(!body) return {attachment: null, embed}
                embed.setImage(`attachment://${g.seed ?? `image${i}`}.webp`)
                if(img_data) embed.setThumbnail(`attachment://original.webp`)
                return {attachment: new AttachmentBuilder(body, {name: `${g.seed ?? `image${i}`}.webp`}), embed}
            }) || []
            if(!precheck) clearInterval(inter)

            const image_map = await Promise.all(image_map_r)
            const embeds = image_map.map(i => i.embed)
            embeds.at(-1)?.setFooter({text: footer_text})
            const files = image_map.filter(i => i.attachment).map(i => i.attachment) as AttachmentBuilder[]
            if(img_data) files.push(new AttachmentBuilder(img_data, {name: "original.webp"}))
            let components = [{type: 1, components: [delete_btn]}]
            if(ag_config?.user_restrictions?.allow_rating && (generation_data.shared ?? true) && files.length === 1) {
                components = [...generateButtons(generation_start!.id!), ...components]
            }
            await message.edit({content: `Image generation finished\n\n**A new view is available, check it out by enabling \`result_structure_v2_enabled\` in the bots config**`, components, embeds, files}).catch(console.error);
            return null
        }
    }
}

export async function advancedGenerationAutocomplete(context: AutocompleteContext): Promise<any> {
    const option = context.interaction.options.getFocused(true)
    switch(option.name) {
        case "model": {
            const models = await context.ai_horde_manager.getModels()
            if(context.client.config.advanced?.dev) console.log(models)
            const available = [{name: "Any Model", value: "YOLO"}, ...models.sort((a, b) => b.performance!-a.performance!).map(m => ({name: `${m.name} | Workers: ${m.count} | Performance: ${m.performance} | Queued: ${m.queued}`, value: m.name!}))].filter(v => !context.client.config.advanced_generate?.blacklisted_models?.includes(v.value)).filter(v => !option.value || v.name.toLowerCase().includes(option.value.toLowerCase()))
            return await context.interaction.respond(available.filter(o => o.name?.toLowerCase().includes(option.value.toLowerCase())).slice(0,25))
        }
        case "sampler": {
            const samplers = SAMPLERS.map(s => ({name: s, value: s}))
            return await context.interaction.respond(samplers.filter(s => s.name.toLowerCase().includes(option.value.toLowerCase())).slice(0,25))
        }
        case "control_type": {
            const control_types = CONTROL_TYPES.map(c => ({name: c, value: c}))
            return await context.interaction.respond(control_types.filter(c => c.name.toLowerCase().includes(option.value.toLowerCase())).slice(0,25))
        }
        case "width":
        case "height": {
            const steps = Array.from({length: 3072/64}).map((_, i) => ({name: `${(i+1)*64}px${(i+1)*64 > 1024 ? " (Requires Kudos upfront)" : ""}`, value: (i+1)*64})).filter(v => v.value >= (context.client.config.advanced_generate?.user_restrictions?.height?.min ?? 64) && v.value <= (context.client.config.advanced_generate?.user_restrictions?.height?.max ?? 3072))
            const inp = context.interaction.options.getFocused(true)
            return await context.interaction.respond(steps.filter((v) => !inp.value || v.name.includes(inp.value)).slice(0,25))
        }
        case "style": {
            const styles = Object.keys(context.client.horde_styles)
            const available = styles.map(s => ({name: s, value: s}))
            const ret = option.value ? available.filter(s => s.name.toLowerCase().includes(option.value.toLowerCase())) : available
            return await context.interaction.respond(ret.slice(0,25))
        }
        case "lora": {
            const ret = []

            if(!isNaN(Number(option.value)) && option.value) {
                const lora_by_id = await context.client.fetchLORAByID(option.value, context.client.config.advanced_generate?.user_restrictions?.allow_nsfw)

                if(lora_by_id?.name && (lora_by_id?.modelVersions[0]?.files[0]?.sizeKB && (lora_by_id?.modelVersions[0]?.files[0]?.sizeKB <= 225280 || context.client.horde_curated_loras?.includes(lora_by_id.id)))) ret.push({
                    name: lora_by_id.name,
                    value: lora_by_id.id.toString()
                })
            } else {
                const loras = await context.client.fetchLORAs(option.value, 5, context.client.config.advanced_generate?.user_restrictions?.allow_nsfw)

                ret.push(
                    ...loras.items.filter(l => l?.name && l?.id.toString()).map(l => ({
                        name: l!.name,
                        value: l!.id.toString()
                    }))
                )
            }

            // the api isn't particularly fast, so sometimes it might send the result too late
            return await context.interaction.respond(ret.slice(0,25)).catch(() => null)
        }
    }
}
