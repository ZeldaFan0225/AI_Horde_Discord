import Centra from "centra";
import { Modal } from "../classes/modal";
import { ModalContext } from "../classes/modalContext";
import { appendFileSync } from "fs";
import {SourceImageProcessingTypes, ImageGenerationInput, ModelGenerationInputStableSamplers} from "@zeldafan0225/ai_horde";
import { EmbedBuilder } from "@discordjs/builders";
import { AttachmentBuilder, ButtonBuilder, Colors } from "discord.js";


export default class extends Modal {
    constructor() {
        super({
            name: "remix",
            staff_only: false,
            regex: /remix_\d{17,20}/
        })
    }

    override async run(ctx: ModalContext): Promise<any> {
        if(!ctx.client.config.remix?.enabled) return ctx.error({error: "This feature has been disabled"})
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        
        await ctx.interaction.deferReply()

        const target_user_id = ctx.interaction.customId.split("_")[1] ?? ctx.interaction.user.id
        const target_user = await ctx.client.users.fetch(target_user_id).catch(console.error)
        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        if(!target_user?.id) return ctx.error({error: "Unable to find target user"})
        if(ctx.client.config.remix?.require_login && !user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use the remix action`, codeblock: false})

        const avatar_url = target_user.displayAvatarURL({size: 2048, extension: "webp"})
        let prompt = ctx.interaction.fields.getTextInputValue("prompt")


        const image_req = await Centra(avatar_url, "GET").send()
        if(!image_req.statusCode?.toString().startsWith("2")) return ctx.error({error: "Unable to fetch users avatar"})
        const image = image_req.body.toString("base64")

        
        if(ctx.client.config.remix?.blacklisted_words?.some(w => prompt.toLowerCase().includes(w.toLowerCase()))) return ctx.error({error: "Your prompt included one or more blacklisted words"})
        
        if(ctx.client.config.remix?.convert_a1111_weight_to_horde_weight) {
            prompt = prompt.replace(/(\(+|\[+)|(?<!\:\d(\.\d+)?)(\)+|\]+)/g, (w) => {
                if(w.startsWith("(") || w.startsWith("[")) return "("
                if(w.startsWith(":")) return w;
                const weight = 1 + (0.1 * (w.startsWith(")") ? 1 : -1) * w.length)
                return `:${weight.toFixed(1)})`
            })
        }

        const generation_options = ctx.client.config.remix.generation_options
        
        let strength = parseInt(ctx.interaction.fields.getTextInputValue("strength") || `${generation_options?.denoise ?? 100}` || "60")
        if(strength > 100) strength = 100
        if(strength < 1) strength = 1

        const generation_data: ImageGenerationInput = {
            prompt,
            params: {
                sampler_name: generation_options?.sampler_name as typeof ModelGenerationInputStableSamplers[keyof typeof ModelGenerationInputStableSamplers] | undefined,
                height: generation_options?.height,
                width: generation_options?.width,
                cfg_scale: generation_options?.cfg,
                steps: generation_options?.steps,
                denoising_strength: strength / 100
            },
            nsfw: !!(generation_options?.allow_nsfw ?? true),
            censor_nsfw: !!(generation_options?.censor_nsfw ?? true),
            trusted_workers: !!(ctx.client.config.remix?.trusted_workers ?? true),
            models: generation_options?.model ? [generation_options.model] : undefined,
            r2: true,
            shared: generation_options?.share_result,
            source_image: image,
            source_processing: SourceImageProcessingTypes.img2img
        }

        if(ctx.client.config.advanced?.dev) {
            console.log(generation_data)
            console.log(generation_options)
        }

        const message = await ctx.interaction.editReply({content: `Remixing...`})

        const generation_start = await ctx.ai_horde_manager.postAsyncImageGenerate(generation_data, {token: user_token})
        .catch((e) => {
            if(ctx.client.config.advanced?.dev) console.error(e)
            return e;
        })
        if(!generation_start || !generation_start.id) return await error(generation_start.message)

        if(ctx.client.config.advanced?.dev) {
            console.log(generation_start)
        }
        
        if (ctx.client.config.logs?.enabled) {
            if (ctx.client.config.logs.log_actions?.with_source_image) {
                if (ctx.client.config.logs.plain) logGeneration("txt");
                if (ctx.client.config.logs.csv) logGeneration("csv");
            }
            function logGeneration(type: "txt" | "csv") {
                ctx.client.initLogDir();
                const log_dir = ctx.client.config.logs?.directory ?? "/logs";
                const content = type === "csv" ? `\n${new Date().toISOString()},${ctx.interaction.user.id},${generation_start?.id},${true},"${prompt}"` : `\n${new Date().toISOString()} | ${ctx.interaction.user.id}${" ".repeat(20 - ctx.interaction.user.id.length)} | ${generation_start?.id} | ${true}${" ".repeat(10)} | ${prompt}`;
                appendFileSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth() + 1}-${new Date().getFullYear()}.${type}`, content);
            }
        }
        
        const inter = setInterval(async () => {
            const status = await ctx.ai_horde_manager.getImageGenerationCheck(generation_start?.id!)
            if(ctx.client.config.advanced?.dev) {
                console.log(status)
                if(!status.done && !status.faulted) await message.edit({
                    content: `Remixing...\n\n__**DEV**__\n**ID** ${generation_start.id}\n**Eta** ${status.wait_time}s\n**Kudos** ${status.kudos}\n**Possible** ${status.is_possible}`
                })
            }
            if(status.done) await displayResult()
            else if(status.faulted) displayError()
        }, 1000 * 5)

        async function displayResult() {
            clearInterval(inter)
            if(!target_user?.id) return displayError();
            const result = await ctx.ai_horde_manager.getImageGenerationStatus(generation_start.id)
            const generation = result.generations?.[0]
            if(!generation?.id) return displayError();
            if(ctx.client.config.advanced?.dev) console.log(generation)
            const req = await Centra(generation.img!, "get").send().then(res => res.body)
            const attachment = new AttachmentBuilder(req, {name: `${generation.seed ?? `image${0}`}.webp`})
            const embed = new EmbedBuilder({
                color: Colors.Blue,
                title: "Remixing finished",
                description: `**Prompt**\n${prompt}\n**Target**\n${target_user?.tag}\n**Strength** ${strength}%${ctx.client.config.advanced?.dev ? `\n**Seed** ${generation.seed}` : ""}`,
                thumbnail: {url: target_user?.displayAvatarURL({extension: "webp", size: 2048})},
                image: {url: `attachment://${generation.seed ?? `image${0}`}.webp`},
            })
            embed.setThumbnail(`attachment://original.webp`)
            const delete_btn = new ButtonBuilder({
                label: "Delete this message",
                custom_id: `delete_${ctx.interaction.user.id}`,
                style: 4
            })
            await message.edit({content: null, files: [attachment], embeds: [embed], components: [{type: 1, components: [delete_btn.toJSON()]}]}).catch(console.error)
        }

        async function displayError() {
            clearInterval(inter)
            await error()
        }

        async function error(msg?: string) {
            await ctx.interaction.followUp({content: `Unable to remix...${msg?.length ? `\n${msg}` : ""}`, ephemeral: true}).catch(console.error)
            await message.delete()
        }
    }
}