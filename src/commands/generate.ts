import { AttachmentBuilder, ButtonBuilder, Colors, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { GenerationInput, ModelGenerationInputStableToggles } from "../stable_horde_types";
import { Config } from "../types";
import {readFileSync} from "fs"
import { AutocompleteContext } from "../classes/autocompleteContext";
import Centra from "centra";

const config = JSON.parse(readFileSync("./config.json").toString()) as Config

const command_data = new SlashCommandBuilder()
    .setName("generate")
    .setDMPermission(false)
    .setDescription(`Generates an image with stable horde`)
    .addStringOption(
        new SlashCommandStringOption()
        .setName("prompt")
        .setDescription("The prompt to generate an image with")
        .setRequired(true)
    )
    if(config.user_restrictions?.allow_img2img) {
        command_data
        .addAttachmentOption(
            new SlashCommandAttachmentOption()
            .setName("img2img")
            .setDescription("The image to use for img2img (.webp); max: 3072px")
        )
    }
    if(config.user_restrictions?.allow_sampler) {
        command_data
        .addStringOption(
            new SlashCommandStringOption()
            .setName("sampler")
            .setDescription("The sampler to use")
            .setChoices(
                ...Object.keys(ModelGenerationInputStableToggles).map(k => ({name: k, value: k}))
            )
        )
    }
    if(config.user_restrictions?.allow_cfg) {
        command_data
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("cfg")
            .setDescription("How strictly to follow the given prompt")
            .setMinValue(config.user_restrictions.cfg?.min ?? -40)
            .setMaxValue(config.user_restrictions.cfg?.min ?? -40)
        )
    }
    if(config.user_restrictions?.allow_denoise) {
        command_data
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("denoise")
            .setDescription("How much to denoise in %")
            .setMinValue(config.user_restrictions?.denoise?.min ?? 0)
            .setMaxValue(config.user_restrictions?.denoise?.max ?? 100)
        )
    }
    if(config.user_restrictions?.allow_seed) {
        command_data
        .addStringOption(
            new SlashCommandStringOption()
            .setName("seed")
            .setDescription("The seed to use")
        )
    }
    if(config.user_restrictions?.height) {
        command_data
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("height")
            .setDescription("The height of the result image")
            .setMinValue(config.user_restrictions?.height?.min ?? 64)
            .setMaxValue(config.user_restrictions?.height?.max ?? 1024)
        )
    }
    if(config.user_restrictions?.allow_width) {
        command_data
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("width")
            .setDescription("How width of the result image")
            .setMinValue(config.user_restrictions?.width?.min ?? 64)
            .setMaxValue(config.user_restrictions?.width?.max ?? 1024)
        )
    }
    if(config.user_restrictions?.allow_upscale) {
        command_data
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("upscale")
            .setDescription("Whether to upscale the image")
        )
    }
    if(config.user_restrictions?.allow_gfpgan) {
        command_data
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("gfpgan")
            .setDescription("Whether to use gfpgan (face correction)")
        )
    }
    if(config.user_restrictions?.allow_real_esrgan) {
        command_data
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("real_esrgan")
            .setDescription("Whether to use RealESRGAN")
        )
    }
    if(config.user_restrictions?.allow_ldsr) {
        command_data
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("ldsr")
            .setDescription("Whether to use LDSR")
        )
    }
    if(config.user_restrictions?.allow_seed_variation) {
        command_data
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("seed_variation")
            .setDescription("(amount needs to be provided) increment for the seed on each image")
            .setMinValue(1)
            .setMaxValue(1000)
        )
    }
    if(config.user_restrictions?.allow_steps) {
        command_data
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("steps")
            .setDescription("How many steps to go though while creating the image")
            .setMinValue(config.user_restrictions?.steps?.min ?? 1)
            .setMaxValue(config.user_restrictions?.steps?.max ?? 100)
        )
    }
    if(config.user_restrictions?.allow_amount) {
        command_data
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("amount")
            .setDescription("How many images to generate")
            .setMinValue(1)
            .setMaxValue(config.user_restrictions?.amount?.max ?? 4)
        )
    }
    if(config.user_restrictions?.allow_models) {
        command_data
        .addStringOption(
            new SlashCommandStringOption()
            .setName("model")
            .setDescription("The model to use for this generation")
            .setAutocomplete(true)
        )
    }

export default class extends Command {
    constructor() {
        super({
            name: "generate",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const prompt = ctx.interaction.options.getString("prompt", true)
        const sampler = (ctx.interaction.options.getString("sampler") ?? ctx.client.config.default_sampler ?? ModelGenerationInputStableToggles.k_euler) as ModelGenerationInputStableToggles
        const cfg = ctx.interaction.options.getInteger("cfg") ?? ctx.client.config.default_cfg ?? 5
        const denoise = (ctx.interaction.options.getInteger("denoise_percentage") ?? 0)/100
        const seed = ctx.interaction.options.getString("seed")
        const height = ctx.interaction.options.getInteger("height") ?? ctx.client.config.default_res?.height ?? 512
        const width = ctx.interaction.options.getInteger("width") ?? ctx.client.config.default_res?.width ?? 512
        const upscale = !!ctx.interaction.options.getBoolean("upscale")
        const gfpgan = !!ctx.interaction.options.getBoolean("gfpgan")
        const real_esrgan = !!ctx.interaction.options.getBoolean("real_esrgan")
        const ldsr = !!ctx.interaction.options.getBoolean("ldsr")
        const seed_variation = ctx.interaction.options.getInteger("seed_variation") ?? 1
        const steps = ctx.interaction.options.getInteger("steps") ?? ctx.client.config.default_steps ?? 30
        const amount = ctx.interaction.options.getInteger("amount") ?? 1
        const model = ctx.interaction.options.getString("model")
        const img = ctx.interaction.options.getAttachment("img2img")

        if(ctx.client.config.blacklisted_words?.some(w => prompt.toLowerCase().includes(w.toLowerCase()))) return ctx.error({error: "Your prompt included one or more blacklisted words"})
        if(height % 64 !== 0) return ctx.error({error: "Height must be a multiple of 64"})
        if(width % 64 !== 0) return ctx.error({error: "Width must be a multiple of 64"})
        if(model && ctx.client.config.blacklisted_models?.includes(model)) return ctx.error({error: "This model is blacklisted"})
        if(model && model !== "YOLO" && !(await ctx.api_manager.getStatusModels()).find(m => m.name === model)) return ctx.error({error: "Unable to find this model"})
        if(img && img.contentType !== "image/webp") return ctx.error({error: "Image to Image input must be a webp file"})
        if(img && ((img.height ?? 0) > 3072 || (img.width ?? 0) > 3072)) return ctx.error({error: "Image to Image input too large (max. 3072 x 3072)"})

        const token = await ctx.api_manager.getUserToken(ctx.interaction.user.id) || ctx.client.config.default_token || "0000000000"
        let img_data
        if(img) {
            img_data = await Centra(img.url, "GET")
                .send()
                .then(res => res.body.toString("base64"))
        }

        const generation_data: GenerationInput = {
            prompt,
            params: {
                toggles: [1, 4],
                sampler_name: sampler,
                cfg_scale: cfg,
                seed: seed ?? undefined,
                height,
                width,
                seed_variation,
                use_gfpgan: gfpgan,
                use_ldsr: ldsr,
                use_real_esrgan: real_esrgan,
                use_upscaling: upscale,
                steps,
                n: amount,
                denoising_strength: denoise
            },
            nsfw: ctx.client.config.user_restrictions?.allow_nsfw,
            censor_nsfw: ctx.client.config.censor_nsfw,
            trusted_workers: ctx.client.config.trusted_workers,
            workers: ctx.client.config.workers,
            models: !model ? (ctx.client.config.default_model ? [ctx.client.config.default_model] : undefined) : model === "YOLO" ? [] : [model],
            source_image: img_data
        }

        if(ctx.client.config.dev) {
            console.log(token)
            console.log(generation_data)
        }
        await ctx.interaction.deferReply({
            //ephemeral: true
        })

        const generation_start = await ctx.api_manager.postAsyncGeneration(generation_data, token).catch((e) => ctx.client.config.dev ? console.error(e) : null)
        if(!generation_start?.id) return ctx.error({error: "Unable to start generation"})
        const start_status = await ctx.api_manager.getGenerateCheck(generation_start.id!).catch((e) => ctx.client.config.dev ? console.error(e) : null);
        const start_horde_data = await ctx.api_manager.getStatusPerformance()

        if(ctx.client.config.dev) {
            console.log(start_status)
        }

        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Generation started",
            description: `Position: \`${start_status?.queue_position}\`/\`${start_horde_data.queued_requests}\`
Workers: \`${start_horde_data.worker_count}\`

\`${start_status?.waiting}\`/\`${amount}\` Images waiting
\`${start_status?.processing}\`/\`${amount}\` Images processing
\`${start_status?.finished}\`/\`${amount}\` Images finished
​${"🟥".repeat(start_status?.waiting ?? 0)}​${"🟨".repeat(start_status?.processing ?? 0)}​${"🟩".repeat(start_status?.finished ?? 0)}

ETA: <t:${Math.floor(Date.now()/1000)+(start_status?.wait_time ?? 0)}:R>`
        })

        const login_embed = new EmbedBuilder({
            color: Colors.Red,
            title: "You are not logged in",
            description: `This will make your requests appear anonymous.\nThis can result in low generation speed due to low priority.\nLog in now with ${await ctx.client.getSlashCommandTag("login")}\n\nDon't know what the token is?\nCreate a stable horde account here: https://stablehorde.net/register`
        })

        if(ctx.client.config.dev) embed.setFooter({text: generation_start.id})

        const btn = new ButtonBuilder({
            label: "Cancel",
            custom_id: `cancel_gen_${generation_start.id}`,
            style: 4
        })
        const delete_btn = new ButtonBuilder({
            label: "Delete this message",
            custom_id: `delete_${ctx.interaction.user.id}`,
            style: 4
        })
        const components = [{type: 1,components: [btn.toJSON()]}]

        ctx.interaction.editReply({
            content: "",
            embeds: token === (ctx.client.config.default_token ?? "0000000000") ? [embed.toJSON(), login_embed.toJSON()] : [embed.toJSON()],
            components
        })

        const message = await ctx.interaction.fetchReply()

        let done = false

        let error_timeout = Date.now()*2
        let prev_left = 1

        const inter = setInterval(async () => {
            const status = await ctx.api_manager.getGenerateCheck(generation_start.id!).catch((e) => ctx.client.config.dev ? console.error(e) : null);
            const horde_data = await ctx.api_manager.getStatusPerformance()

            if(!status || (status as any).faulted) {
                clearInterval(inter);
                return message.edit({content: "Image generation has been cancelled", embeds: []});
            }

            if(ctx.client.config.dev) {
                console.log(status)
            }


            if(status?.wait_time === 0 && prev_left !== 0) error_timeout = Date.now()
            prev_left = status?.wait_time ?? 1


            if(error_timeout < (Date.now()-1000*60*2)) {
                await ctx.api_manager.deleteGenerateStatus(generation_start.id!)
                message.edit({
                    components: [],
                    content: "Generation cancelled due to errors",
                    embeds: []
                })
                clearInterval(inter)
                return;
            }

            done = status.done ?? false

            if(done) {
                const images = await ctx.api_manager.getGenerateStatus(generation_start.id!)

                const image_map = images.generations?.map((g, i) => {
                    const attachment = new AttachmentBuilder(Buffer.from(g.img!, "base64"), {name: `${g.seed ?? `image${i}`}.webp`})
                    const embed = new EmbedBuilder({
                        title: `Image ${i+1}`,
                        image: {url: `attachment://${g.seed ?? `image${i}`}.webp`},
                        color: Colors.Blue,
                        description: `**Seed:** ${g.seed}\n**Model:** ${g.model}${!i ? `\n**Prompt:** ${prompt}` : ""}`,
                    })
                    if(img && img.url) embed.setThumbnail(img.url)
                    return {attachment, embed}
                })
                clearInterval(inter);
                return message.edit({content: `Image generation finished`, components: [{type: 1, components: [delete_btn.toJSON()]}], embeds: image_map?.map(i => i.embed), files: image_map?.map(i => i.attachment)});
            }
            
            const embed = new EmbedBuilder({
                color: Colors.Blue,
                title: "Generation started",
                description: `Position: \`${status.queue_position}\`/\`${horde_data.queued_requests}\`
Workers: \`${horde_data.worker_count}\`

\`${status.waiting}\`/\`${amount}\` Images waiting
\`${status.processing}\`/\`${amount}\` Images processing
\`${status.finished}\`/\`${amount}\` Images finished
​${"🟥".repeat(status.waiting ?? 0)}​${"🟨".repeat(status.processing ?? 0)}​${"🟩".repeat(status.finished ?? 0)}

ETA: <t:${Math.floor(Date.now()/1000)+(status?.wait_time ?? 0)}:R>`
            })

            if(ctx.client.config.dev) embed.setFooter({text: generation_start?.id ?? "Unknown ID"})

            let embeds = token === (ctx.client.config.default_token ?? "0000000000") ? [embed.toJSON(), login_embed.toJSON()] : [embed.toJSON()]

            if((status?.wait_time ?? 0) > 60 * 2) {
                embeds.push(new EmbedBuilder({
                    color: Colors.Yellow,
                    title: "Stable Horde currently is under high load",
                    description: "You can contribute your GPUs processing power to the project.\nRead more: https://stablehorde.net/"
                }).toJSON())
            }

            return message.edit({
                content: "",
                embeds,
                components
            })
        }, 1000 * (ctx.client.config?.update_generation_status_interval_seconds || 5))
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        const option = context.interaction.options.getFocused(true)
        switch(option.name) {
            case "model": {
                const models = await context.api_manager.getStatusModels()
                if(context.client.config.dev) console.log(models)
                const available = [{name: "Any Model", value: "YOLO"}, ...models.sort((a, b) => b.performance!-a.performance!).map(m => ({name: `${m.name} | Workers: ${m.count} | Performance: ${m.performance}`, value: m.name!}))]
                context.interaction.respond(available.filter(o => o.name.includes(option.value)))
            }
        }
    }
}