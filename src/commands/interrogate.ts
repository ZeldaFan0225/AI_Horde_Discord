import { AttachmentBuilder, ButtonBuilder, Colors, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { Config } from "../types";
import {readFileSync} from "fs"
import {ModelInterrogationInputStable, ModelInterrogationFormTypes, HordeAsyncRequestStates} from "@zeldafan0225/ai_horde";

const config = JSON.parse(readFileSync("./config.json").toString()) as Config

const command_data = new SlashCommandBuilder()
    .setName("interrogate")
    .setDMPermission(false)
    .setDescription(`Interrogates an image with ai horde`)
    if(config.interrogate?.enabled) {
        command_data.addAttachmentOption(
            new SlashCommandAttachmentOption()
            .setName("image")
            .setDescription("The image to interrogate")
            .setRequired(true)
        )
        if(config.interrogate.user_restrictions?.allow_nsfw) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("nsfw")
                .setDescription("Whether to interrogate the image for nsfw")
            )
        }
        if(config.interrogate.user_restrictions?.allow_caption) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("caption")
                .setDescription("Whether to create a caption for the image")
            )
        }
        if(config.interrogate.user_restrictions?.allow_interrogation) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("detailed_interrogation")
                .setDescription("Whether to create a detailed interrogation result")
            )
        }
        if(config.interrogate.user_restrictions?.allow_gfpgan) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("gfpgan")
                .setDescription("Whether to use GFPGAN for the interrogation")
            )
        }
        if(config.interrogate.user_restrictions?.allow_realesrgan_x4_plus) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("realesrgan_x4_plus")
                .setDescription("Whether to use RealESRGAN x4+ for the interrogation")
            )
        }
        if(config.interrogate.user_restrictions?.allow_realesrgan_x4_plus_anime) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("realesrgan_x4_plus_anime")
                .setDescription("Whether to use RealESRGAN x4+ anime for the interrogation")
            )
        }
        if(config.interrogate.user_restrictions?.allow_nmkd_siax) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("nmkd_siax")
                .setDescription("Whether to use NMKD_Siax for the interrogation")
            )
        }
        if(config.interrogate.user_restrictions?.allow_animesharp_x4) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("4x_animesharp")
                .setDescription("Whether to use 4x_AnimeSharp for the interrogation")
            )
        }
        if(config.interrogate.user_restrictions?.allow_codeformers) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("codeformers")
                .setDescription("Whether to use CodeFormers for the interrogation")
            )
        }
        if(config.interrogate.user_restrictions?.allow_strip_background) {
            command_data.addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("strip_background")
                .setDescription("Whether to strip the background from the image")
            )
        }
    }

export default class extends Command {
    constructor() {
        super({
            name: "interrogate",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.client.config.interrogate?.enabled) return ctx.error({error: "Interrogation is disabled."})

        await ctx.interaction.deferReply({})
        const attachment = ctx.interaction.options.getAttachment("image", true)
        const nsfw = ctx.interaction.options.getBoolean("nsfw") ?? ctx.client.config.interrogate?.default?.nsfw
        const caption = ctx.interaction.options.getBoolean("caption") ?? ctx.client.config.interrogate?.default?.caption
        const detailed = ctx.interaction.options.getBoolean("detailed_interrogation") ?? ctx.client.config.interrogate?.default?.interrogation
        const gfpgan = ctx.interaction.options.getBoolean("gfpgan") ?? ctx.client.config.interrogate?.default?.gfpgan
        const x4plus = ctx.interaction.options.getBoolean("realesrgan_x4_plus") ?? ctx.client.config.interrogate?.default?.realesrgan_x4_plus
        const x4plus_anime = ctx.interaction.options.getBoolean("realesrgan_x4_plus_anime") ?? ctx.client.config.interrogate?.default?.realesrgan_x4_plus_anime
        const nmkd_siax = ctx.interaction.options.getBoolean("nmkd_siax") ?? ctx.client.config.interrogate?.default?.nmkd_siax
        const animesharp_4x = ctx.interaction.options.getBoolean("4x_animesharp") ?? ctx.client.config.interrogate?.default?.animesharp_x4
        const codeformers = ctx.interaction.options.getBoolean("codeformers") ?? ctx.client.config.interrogate?.default?.codeformers
        const strip_background = ctx.interaction.options.getBoolean("strip_background") ?? ctx.client.config.interrogate?.default?.strip_background

        if(ctx.interaction.options.data.length <= 1) return ctx.error({error: "One of the interrogation types must be selected"})

        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)

        if(!user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use ${await ctx.client.getSlashCommandTag("interrogate")}`, codeblock: false})
        if(!attachment.contentType?.startsWith("image/")) return ctx.error({error: "Attachment input must be a image"})

        const token = user_token || ctx.client.config.default_token || "0000000000"

        const forms = []

        if(nsfw) forms.push({name: ModelInterrogationFormTypes.nsfw})
        if(caption) forms.push({name: ModelInterrogationFormTypes.caption})
        if(detailed) forms.push({name: ModelInterrogationFormTypes.interrogation})
        if(gfpgan) forms.push({name: ModelInterrogationFormTypes.GFPGAN})
        if(x4plus) forms.push({name: ModelInterrogationFormTypes.RealESRGAN_x4plus})
        if(x4plus_anime) forms.push({name: ModelInterrogationFormTypes.RealESRGAN_x4plus_anime_6B})
        if(nmkd_siax) forms.push({name: ModelInterrogationFormTypes.NMKD_Siax})
        if(animesharp_4x) forms.push({name: ModelInterrogationFormTypes["4x_AnimeSharp"]})
        if(codeformers) forms.push({name: ModelInterrogationFormTypes.CodeFormers})
        if(strip_background) forms.push({name: ModelInterrogationFormTypes.strip_background})

        const interrogation_data: ModelInterrogationInputStable = {
            source_image: attachment.url,
            forms
        }

        const interrogation_start = await ctx.ai_horde_manager.postAsyncInterrogate(interrogation_data, {token})
        .catch((e) => {
            if(ctx.client.config.advanced?.dev) console.error(e)
            ctx.error({error: `Unable to start interrogation: ${e.message}`})
            return null;
        })
        if(!interrogation_start || !interrogation_start.id) return;

        if(ctx.client.config.advanced?.dev) console.log(`${ctx.interaction.user.id} interrogated ${attachment.url} (${interrogation_start?.id})`)

        const start_status = await ctx.ai_horde_manager.getInterrogationStatus(interrogation_start.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
        const start_horde_data = await ctx.ai_horde_manager.getPerformance()

        if(ctx.client.config.advanced?.dev) {
            console.log(start_status)
        }

        const text_status = []

        if(nsfw) text_status.push(`**NSFW** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.nsfw)?.state}\``)
        if(caption) text_status.push(`**Caption** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.caption)?.state}\``)
        if(detailed) text_status.push(`**Detailed Interrogation** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.interrogation)?.state}\``)
        if(gfpgan) text_status.push(`**GFPGAN** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.GFPGAN)?.state}\``)
        if(x4plus) text_status.push(`**RealESRGAN x4+** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.RealESRGAN_x4plus)?.state}\``)
        if(x4plus_anime) text_status.push(`**RealESRGAN x4+ anime** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.RealESRGAN_x4plus_anime_6B)?.state}\``)
        if(nmkd_siax) text_status.push(`**NMKD_Siax** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.NMKD_Siax)?.state}\``)
        if(animesharp_4x) text_status.push(`**4x_AnimeSharp** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes["4x_AnimeSharp"])?.state}\``)
        if(codeformers) text_status.push(`**CodeFormers** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.CodeFormers)?.state}\``)
        if(strip_background) text_status.push(`**Strip Background** \`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.strip_background)?.state}\``)


        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Interrogation started",
            description: `Please wait...

Interrogation workers: \`${start_horde_data.interrogator_count}\`
Interrogations queued: \`${start_horde_data.queued_forms}\`

${text_status.join("\n")}`,
            image: {
                url: attachment.url
            }
        })


        if(ctx.client.config.advanced?.dev) embed.setFooter({text: interrogation_start.id})

        const btn = new ButtonBuilder({
            label: "Cancel",
            custom_id: `cancel_inter_${interrogation_start.id}`,
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
            embeds: [embed.toJSON()],
            components
        })

        const message = await ctx.interaction.fetchReply()
        let done = false
        
        const inter = setInterval(async () => {
            const d = await getCheckAndDisplayResult()
            if(!d) return;
            const {status, horde_data} = d


            if(start_status?.state === HordeAsyncRequestStates.faulted) {
                if(!done) {
                    await ctx.ai_horde_manager.deleteInterrogationRequest(interrogation_start.id!)
                    message.edit({
                        components: [],
                        content: "Interrogation cancelled due to errors",
                        embeds: []
                    })
                }
                clearInterval(inter)
                return;
            }

            const text_status = []

            if(nsfw) text_status.push(`**NSFW** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.nsfw)?.state}\``)
            if(caption) text_status.push(`**Caption** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.caption)?.state}\``)
            if(detailed) text_status.push(`**Detailed Interrogation** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.interrogation)?.state}\``)
            if(gfpgan) text_status.push(`**GFPGAN** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.GFPGAN)?.state}\``)
            if(x4plus) text_status.push(`**RealESRGAN x4+** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.RealESRGAN_x4plus)?.state}\``)
            if(x4plus_anime) text_status.push(`**RealESRGAN x4+ anime** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.RealESRGAN_x4plus_anime_6B)?.state}\``)
            if(nmkd_siax) text_status.push(`**NMKD_Siax** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.NMKD_Siax)?.state}\``)
            if(animesharp_4x) text_status.push(`**4x_AnimeSharp** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes["4x_AnimeSharp"])?.state}\``)
            if(codeformers) text_status.push(`**CodeFormers** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.CodeFormers)?.state}\``)
            if(strip_background) text_status.push(`**Strip Background** \`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.strip_background)?.state}\``)

            const embed = new EmbedBuilder({
                color: Colors.Blue,
                title: "Interrogation started",
                description: `Please wait...

Interrogation workers: \`${horde_data.interrogator_count}\`
Interrogations queued: \`${horde_data.queued_forms}\`

${text_status.join("\n")}`,
                image: {
                    url: attachment.url
                }
            })

            if(ctx.client.config.advanced?.dev) embed.setFooter({text: interrogation_start?.id ?? "Unknown ID"})

            return message.edit({
                content: "",
                embeds: [embed.toJSON()],
                components
            })
        }, 1000 * (ctx.client.config?.interrogate?.update_interrogation_status_interval_seconds || 5))


        async function getCheckAndDisplayResult(precheck?: boolean) {
            if(done) return;
            const status = await ctx.ai_horde_manager.getInterrogationStatus(interrogation_start!.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
            done = status?.state === HordeAsyncRequestStates.done
            const horde_data = await ctx.ai_horde_manager.getPerformance()
            if(!status || status.state === HordeAsyncRequestStates.faulted) {
                if(!done) await message.edit({content: "Interrogation has been cancelled", embeds: []});
                if(!precheck) clearInterval(inter)
                return null;
            }

            if(ctx.client.config.advanced?.dev) {
                console.log(status)
                console.log(status.forms)
            }

            if(status.state !== HordeAsyncRequestStates.done && status.state !== HordeAsyncRequestStates.partial) return {status, horde_data}
            else {
                done = true

                const nsfw_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.nsfw)
                const caption_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.caption)
                const detailed_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.interrogation)
                const gfpgan_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.GFPGAN)
                const x4plus_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.RealESRGAN_x4plus)
                const x4plus_anime_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.RealESRGAN_x4plus_anime_6B)
                const nmkd_siax_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.NMKD_Siax)
                const animesharp_4x_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes["4x_AnimeSharp"])
                const codeformers_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.CodeFormers)
                const strip_background_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.strip_background)

                const text_status = []

                if(nsfw) text_status.push(`**NSFW** \`${nsfw_res?.state !== HordeAsyncRequestStates.done ? nsfw_res?.state : nsfw_res?.result?.nsfw}\``)
                if(caption) text_status.push(`**Caption** \`${caption_res?.state !== HordeAsyncRequestStates.done ? caption_res?.state : caption_res?.result?.caption}\``)
                if(detailed) text_status.push(`**Detailed Interrogation** \`${detailed_res?.state !== HordeAsyncRequestStates.done ? detailed_res?.state : "Result attached"}\``)
                if(gfpgan) text_status.push(`**GFPGAN** \`${gfpgan_res?.state !== HordeAsyncRequestStates.done ? gfpgan_res?.state : "GFPGAN.webp"}\``)
                if(x4plus) text_status.push(`**RealESRGAN x4+** \`${x4plus_res?.state !== HordeAsyncRequestStates.done ? x4plus_res?.state : "RealESRGAN_x4plus.webp"}\``)
                if(x4plus_anime) text_status.push(`**RealESRGAN x4+ anime** \`${x4plus_anime_res?.state !== HordeAsyncRequestStates.done ? x4plus_anime_res?.state : "RealESRGAN_x4plus_anime_6B.webp"}\``)
                if(nmkd_siax) text_status.push(`**NMKD_Siax** \`${nmkd_siax_res?.state !== HordeAsyncRequestStates.done ? nmkd_siax_res?.state : "NMKD_Siax.webp"}\``)
                if(animesharp_4x) text_status.push(`**4x_AnimeSharp** \`${animesharp_4x_res?.state !== HordeAsyncRequestStates.done ? animesharp_4x_res?.state : "4x_AnimeSharp.webp"}\``)
                if(codeformers) text_status.push(`**CodeFormers** \`${codeformers_res?.state !== HordeAsyncRequestStates.done ? codeformers_res?.state : "CodeFormers.webp"}\``)
                if(strip_background) text_status.push(`**Strip Background** \`${strip_background_res?.state !== HordeAsyncRequestStates.done ? strip_background_res?.state : "strip_background.webp"}\``)

                
                const embed = new EmbedBuilder({
                    color: Colors.Blue,
                    title: "Interrogation finished",
                    description: `${text_status.join("\n")}`,
                    image: {
                        url: attachment.url
                    }
                })

                if(!precheck) clearInterval(inter)

                const files = []
                if(detailed && detailed_res?.state === HordeAsyncRequestStates.done) files.push(new AttachmentBuilder(Buffer.from(JSON.stringify((status?.forms?.find(f => f.form === ModelInterrogationFormTypes.interrogation)?.result?.interrogation || {}), null, 2)), {name: "detailed.json"}))
        
                const images = (status.forms?.filter(f => f.result?.[f.form as typeof ModelInterrogationFormTypes[keyof typeof ModelInterrogationFormTypes]]?.["startsWith"]("https://")).map(f => ({url: f.result?.[f.form as typeof ModelInterrogationFormTypes[keyof typeof ModelInterrogationFormTypes]], filename: `${f.form}.webp`})) || []) as unknown as ({url: string, filename: string})[]
                
                for(const image of images) {
                    const data = await fetch(image.url)
                    files.push(new AttachmentBuilder(Buffer.from(await data.arrayBuffer()), {name: image.filename}))
                }

                await message.edit({components: [{type: 1, components: [delete_btn.toJSON()]}], embeds: [embed], files});
                return null
            } 
        }
    }
}