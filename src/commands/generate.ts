import { ActionRowData, AttachmentBuilder, ButtonBuilder, ChannelType, Colors, EmbedBuilder, InteractionButtonComponentData, SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { readFileSync, appendFileSync } from "fs";
import { Config } from "../types";
import {ModelGenerationInputStableSamplers, ImageGenerationInput} from "@zeldafan0225/ai_horde";
import Centra from "centra";
const {buffer2webpbuffer} = require("webp-converter")

const config = JSON.parse(readFileSync("./config.json").toString()) as Config

const command_data = new SlashCommandBuilder()
    .setName("generate")
    .setDMPermission(false)
    .setDescription(`Generates an image with ai horde`)
    if(config.generate?.enabled) {
        command_data.addStringOption(
            new SlashCommandStringOption()
            .setName("prompt")
            .setDescription("The prompt to generate an image with")
            .setRequired(true)
        )
        if(config.generate?.user_restrictions?.allow_negative_prompt) {
            command_data.addStringOption(
                new SlashCommandStringOption()
                .setName("negative_prompt")
                .setDescription("The negative prompt to generate an image with")
                .setRequired(false)
            )
        }
        if(config.generate?.user_restrictions?.allow_style) {
            command_data.addStringOption(
                new SlashCommandStringOption()
                .setName("style")
                .setDescription("The style for this image")
                .setRequired(false)
                .setAutocomplete(true)
            )
        }
        if(config.advanced_generate?.user_restrictions?.allow_source_image) {
            command_data
            .addAttachmentOption(
                new SlashCommandAttachmentOption()
                .setName("source_image")
                .setDescription("The image to use as the source image; max: 3072px")
            )
            .addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("keep_original_ratio")
                .setDescription("Whether to keep the aspect ratio and image size of the original image")
            )
        }
        if(config.generate?.user_restrictions?.allow_denoise) {
            command_data
            .addIntegerOption(
                new SlashCommandIntegerOption()
                .setName("denoise")
                .setDescription("How much to denoise in %")
                .setMinValue(config.generate?.user_restrictions?.denoise?.min ?? 0)
                .setMaxValue(config.generate?.user_restrictions?.denoise?.max ?? 100)
            )
        }
        if(config.generate?.user_restrictions?.allow_amount) {
            command_data
            .addIntegerOption(
                new SlashCommandIntegerOption()
                .setName("amount")
                .setDescription("How many images to generate")
                .setMinValue(1)
                .setMaxValue(config.generate?.user_restrictions?.amount?.max ?? 4)
            )
        }
        if(config.generate?.user_restrictions?.allow_tiling) {
            command_data
            .addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("tiling")
                .setDescription("Makes generated image have a seemless transition when stitched together")
            )
        }
        if(config.generate?.user_restrictions?.allow_sharing) {
            command_data
            .addBooleanOption(
                new SlashCommandBooleanOption()
                .setName("share_result")
                .setDescription("Whether to share your generation result for research")
            )
        }
        if(config.generate.user_restrictions?.allow_qr_codes) {
            command_data
            .addStringOption(
                new SlashCommandStringOption()
                .setName("qr_code_url")
                .setDescription("The url to use for the qr code")
            )
        }
    }

function generateButtons(id: string) {
    let i = 0
    const getId = () => `followuprate_${i+1}_${id}`
    const components: ActionRowData<InteractionButtonComponentData>[] = []
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

export default class extends Command {
    constructor() {
        super({
            name: "generate",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.client.config.generate?.enabled) return ctx.error({error: "Generation is disabled."})

        await ctx.interaction.deferReply({})
        const party = await ctx.client.getParty(ctx.interaction.channelId, ctx.database)
        let prompt = ctx.interaction.options.getString("prompt", true)
        const negative_prompt = ctx.interaction.options.getString("negative_prompt") ?? ""
        const style_raw = ctx.interaction.options.getString("style") ?? party?.style ?? ctx.client.config.generate?.default?.style ?? "raw"
        const denoise = (ctx.interaction.options.getInteger("denoise") ?? ctx.client.config.generate?.default?.denoise ?? 50)/100
        const amount = ctx.interaction.options.getInteger("amount") ?? 1
        const tiling = !!(ctx.interaction.options.getBoolean("tiling") ?? ctx.client.config.generate?.default?.tiling)
        const share_result = ctx.interaction.options.getBoolean("share_result") ?? ctx.client.config.generate?.default?.share
        const keep_ratio = ctx.interaction.options.getBoolean("keep_original_ratio") ?? ctx.client.config.generate?.default?.keep_original_ratio ?? true
        const qr_code_url = ctx.interaction.options.getString("qr_code_url")
        let img = ctx.interaction.options.getAttachment("source_image")

        const style = ctx.client.getHordeStyle(style_raw)
        const clipskip = style?.clip_skip ?? ctx.client.config.generate?.default?.clip_skip

        let height = style?.height
        let width = style?.width

        if(ctx.client.config.advanced?.dev) {
            console.log(style)
        }

        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        const ai_horde_user = await ctx.ai_horde_manager.findUser({token: user_token  || ctx.client.config?.default_token || "0000000000"}).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
        const can_bypass = ctx.client.config.generate?.source_image?.whitelist?.bypass_checks && ctx.client.config.generate?.source_image?.whitelist?.user_ids?.includes(ctx.interaction.user.id)

        if(!style?.prompt?.length) return ctx.error({error: "Unable to find style for input"})
        if(party?.style && party.style !== style_raw.toLowerCase()) return ctx.error({error: `Please use the style '${party.style}' for this party`})
        if(ctx.client.config.generate?.require_login && !user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use ${await ctx.client.getSlashCommandTag("generate")}`, codeblock: false})
        if(ctx.client.config.generate.blacklist_regex && new RegExp(ctx.client.config.generate.blacklist_regex, "i").test(prompt.replace(/[\u0300-\u036f]/g, ""))) return ctx.error({error: "Your prompt included one or more blacklisted words"})
        if(ctx.client.config.generate?.blacklisted_words?.some(w => prompt.toLowerCase().includes(w.toLowerCase()))) return ctx.error({error: "Your prompt included one or more blacklisted words"})
        if(ctx.client.config.generate?.blacklisted_styles?.includes(style_raw.toLowerCase())) return ctx.error({error: "The chosen style or category is blacklisted"})
        if(ctx.client.config.generate?.blacklisted_styles?.includes(style.name)) return ctx.error({error: "The randomly chosen style from the category is blacklisted"})
        if(img && !can_bypass && !user_token) return ctx.error({error: `You need to ${await ctx.client.getSlashCommandTag("login")} and agree to our ${await ctx.client.getSlashCommandTag("terms")} first before being able to use a source image`, codeblock: false})
        if(img && ctx.client.config.generate?.source_image?.require_ai_horde_account_oauth_connection && (!ai_horde_user || ai_horde_user.pseudonymous)) return ctx.error({error: "Your ai horde account needs to be created with a oauth connection"})
        if(img && !can_bypass && ctx.client.config.generate?.source_image?.require_nsfw_channel && (ctx.interaction.channel?.type !== ChannelType.GuildText || !ctx.interaction.channel.nsfw)) return ctx.error({error: "This channel needs to be marked as age restricted to use a source image"})
        if(img && !img.contentType?.startsWith("image/")) return ctx.error({error: "Source Image input must be a image"})
        if(img && ((img.height ?? 0) > 3072 || (img.width ?? 0) > 3072)) return ctx.error({error: "Source Image input too large (max. 3072 x 3072)"})
        if(img && !can_bypass && !ctx.client.config?.generate?.source_image?.allow_non_webp && img.contentType !== "image/webp") return ctx.error({error: "You can only upload webp as the source image"})
        if(img && ctx.client.config.generate?.source_image?.whitelist?.only_allow_whitelist && !ctx.client.config.generate?.source_image?.whitelist?.user_ids?.includes(ctx.interaction.user.id)) return ctx.error({error: "You are not whitelisted to use a source image"})

        if(ctx.client.config.generate.convert_a1111_weight_to_horde_weight) {
            prompt = prompt.replace(/(\(+|\[+)|(?<!\:\d(\.\d+)?)(\)+|\]+)/g, (w) => {
                if(w.startsWith("(") || w.startsWith("[")) return "("
                const weight = 1 + (0.1 * (w.startsWith(")") ? 1 : -1) * w.length)
                return `:${weight.toFixed(1)})`
            })
        }
        
        prompt = style.prompt.slice().replace("{p}", prompt)
        prompt = prompt.replace("{np}", !negative_prompt || prompt.includes("###") ? negative_prompt : `###${negative_prompt}`)
        
        if(party && party.wordlist?.length) {
            if(ctx.client.config.advanced?.dev) {
                console.log(party.wordlist)
            }
            if(!party.wordlist?.every(w => prompt.toLowerCase().includes(w))) return ctx.error({error: "Your prompt does not include all required words"})
        }

        if(keep_ratio && img?.width && img?.height) {
            const ratio = img?.width/img?.height
            const largest = ratio >= 1 ? img.width : img.height
            const m = largest > 3072 ? 3072/largest : 1
            const mod_height = Math.round(img.height*m)
            const mod_width = Math.round(img.width*m)
            height = mod_height%64 <= 32 ? mod_height-(mod_height%64) : mod_height+(64-(mod_height%64))
            width = mod_width%64 <= 32 ? mod_width-(mod_width%64) : mod_width+(64-(mod_width%64))
        }
        
        if(ctx.client.config.advanced?.dev) {
            console.log(img?.height)
            console.log(img?.width)
            console.log(height)
            console.log(width)
        }

        const token = party?.shared_key || user_token || ctx.client.config.default_token || "0000000000"
        let img_data: Buffer | undefined
        if(img) {
            let img_data_res = await Centra(img.url, "GET")
                .send()
            
            if(img.contentType === "image/webp") img_data = img_data_res.body
            else {
                img_data = await buffer2webpbuffer(img_data_res.body, img.contentType?.replace("image/",""),"-q 80").catch((e: Error) => ctx.client.config.advanced?.dev ? console.error(e) : null)
                if(!img_data) return ctx.error({
                    error: "Image format conversion to webp failed"
                })
            }
        }


        const generation_data: ImageGenerationInput = {
            prompt,
            params: {
                sampler_name: style.sampler_name as typeof ModelGenerationInputStableSamplers[keyof typeof ModelGenerationInputStableSamplers],
                height: height,
                clip_skip: clipskip,
                width: width,
                n: amount,
                tiling,
                denoising_strength: denoise,
                cfg_scale: style.cfg_scale,
                loras: style.loras,
                steps: style.steps,
                tis: style.tis,
                hires_fix: style.hires_fix,
                workflow: qr_code_url ? "qr_code" : undefined,
                extra_texts: qr_code_url ? [{text: qr_code_url, reference: "qr_code"}] : undefined
            },
            replacement_filter: ctx.client.config.generate.replacement_filter,
            nsfw: ctx.client.config.generate?.user_restrictions?.allow_nsfw,
            censor_nsfw: ctx.client.config.generate?.censor_nsfw,
            trusted_workers: ctx.client.config.generate?.trusted_workers,
            models: style.model ? [style.model] : undefined,
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
            if (ctx.client.config.logs.log_actions?.with_source_image && img) {
                if (ctx.client.config.logs.plain) logGeneration("txt");
                if (ctx.client.config.logs.csv) logGeneration("csv");
            } else if(ctx.client.config.logs.log_actions?.without_source_image && !img) {
                if (ctx.client.config.logs.plain) logGeneration("txt");
                if (ctx.client.config.logs.csv) logGeneration("csv");
            }
            function logGeneration(type: "txt" | "csv") {
                ctx.client.initLogDir();
                const log_dir = ctx.client.config.logs?.directory ?? "/logs";
                const content = type === "csv" ? `\n${new Date().toISOString()},${ctx.interaction.user.id},${generation_start?.id},${!!img},"${prompt}"` : `\n${new Date().toISOString()} | ${ctx.interaction.user.id}${" ".repeat(20 - ctx.interaction.user.id.length)} | ${generation_start?.id} | ${!!img}${" ".repeat(img ? 10 : 9)} | ${prompt}`;
                appendFileSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth() + 1}-${new Date().getFullYear()}.${type}`, content);
            }
        }

        if(ctx.client.config.advanced?.dev) console.log(`${ctx.interaction.user.id} generated${!!img ? " using a source image":""} with prompt "${prompt}" (${generation_start?.id})`)

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

        let error_timeout = Date.now()*2
        let prev_left = 1

        let done = false

        if(ctx.client.config.generate?.improve_loading_time && (start_status?.wait_time ?? 0) <= 3) {
            // wait before starting the loop so that the first iteration can already pick up the result
            const pre_test = await new Promise((resolve) => setTimeout(async () => {resolve(await getCheckAndDisplayResult())},((start_status?.wait_time ?? 0) + 0.1) * 1000))
            if(!pre_test) return;
        }
        
        const inter = setInterval(async () => {
            const d = await getCheckAndDisplayResult()
            if(!d) return;
            const {status, horde_data} = d
            if(ctx.client.config.generate?.improve_loading_time && (status.wait_time ?? 0) <= 3) {
                // try to display result faster
                setTimeout(async () => {await getCheckAndDisplayResult()},((start_status?.wait_time ?? 0) + 0.1) * 1000)
            }

            if(status?.wait_time === 0 && prev_left !== 0) error_timeout = Date.now()
            prev_left = status?.wait_time ?? 1

            if(error_timeout < (Date.now()-1000*60*2) || start_status?.faulted) {
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
        }, 1000 * (ctx.client.config?.generate?.update_generation_status_interval_seconds || 5))

        async function getCheckAndDisplayResult(precheck?: boolean) {
            if(done) return;
            const status = await ctx.ai_horde_manager.getImageGenerationCheck(generation_start!.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
            done = !!status?.done
            const horde_data = await ctx.ai_horde_manager.getPerformance()
            if(!status || status.faulted) {
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


                if(ctx.client.config.advanced?.result_structure_v2_enabled ?? true) {
                    const image_map_r = images.generations?.map(async g => {
                        const req = await Centra(g.img!, "GET").send();
                        if(g.censored) return {attachment: null, generation: g}
                        const attachment = new AttachmentBuilder(req.body, {name: `${g.id}.webp`})
                        return {attachment, generation: g}
                    }) || []
                    if(!precheck) clearInterval(inter)

                    const image_map = await Promise.all(image_map_r)
                    const files = image_map.filter(i => i.attachment).map(i => i.attachment) as  AttachmentBuilder[]
                    if(img_data && image_map.length < 10) files.push(new AttachmentBuilder(img_data, {name: "original.webp"}))
                    let components = [{type: 1, components: [delete_btn]}]
                    const embeds = [
                        new EmbedBuilder({
                            title: "Generation Finished",
                            description: `**Prompt** ${ctx.interaction.options.getString("prompt", true)}\n**Style** \`${style?.name ?? style_raw}\`${style?.type === "category-style" ? ` from category \`${style_raw}\`` : ""}\n**Kudos Consumed** \`${images.kudos}\`${image_map.length !== amount ? "\nCensored Images are not displayed" : ""}`,
                            color: Colors.Blue,
                            footer: {text: `Generation ID ${generation_start!.id}`},
                            thumbnail: img_data && image_map.length < 10 ? {url: "attachment://original.webp"} : img_data ? {url: img!.url} : undefined
                        })
                    ]

                    if(ctx.client.config.generate?.user_restrictions?.allow_rating && (generation_data.shared ?? true) && files.length === 1) {
                        components = [...generateButtons(generation_start!.id!), ...components]
                    }
                    await message.edit({content: null, components, embeds, files});
                    if(party) await handlePartySubmit()
                    return null
                }



                const image_map_r = images.generations?.map(async (g, i) => {
                    const req = await Centra(g.img!, "get").send();
                    if(ctx.client.config.advanced?.dev) console.log(req)
                    const attachment = new AttachmentBuilder(req.body, {name: `${g.seed ?? `image${i}`}.webp`})
                    const embed = new EmbedBuilder({
                        title: `Image ${i+1}`,
                        image: {url: `attachment://${g.seed ?? `image${i}`}.webp`},
                        color: Colors.Blue,
                        description: `${!i ? `**Raw Prompt:** ${ctx.interaction.options.getString("prompt", true)}\n**Processed Prompt:** ${prompt}\n**Style:** \`${style?.name ?? style_raw}\`${style?.type === "category-style" ? ` from category \`${style_raw}\`` : ""}\n**Total Kudos Cost:** \`${images.kudos}\`` : ""}${ctx.client.config.advanced?.dev ? `\n\n**Image ID** ${g.id}` : ""}` || undefined,
                    })
                    if(img_data) embed.setThumbnail(`attachment://original.webp`)
                    return {attachment, embed}
                }) || []
                if(!precheck) clearInterval(inter)

                const image_map = await Promise.all(image_map_r)
                const embeds = image_map.map(i => i.embed)
                if(ctx.client.config.advanced?.dev) embeds.at(-1)?.setFooter({text: `Generation ID ${generation_start!.id}`})
                const files = image_map.map(i => i.attachment)
                if(img_data) files.push(new AttachmentBuilder(img_data, {name: "original.webp"}))
                let components = [{type: 1, components: [delete_btn]}]
                if(ctx.client.config.generate?.user_restrictions?.allow_rating && (generation_data.shared ?? true) && files.length === 1) {
                    components = [...generateButtons(generation_start!.id!), ...components]
                }
                await message.edit({content: `Image generation finished\n\n**A new view is available, check it out by enabling \`result_structure_v2_enabled\` in the bots config**`, components, embeds, files});
                if(party) await handlePartySubmit()
                return null
            } 
        }

        async function handlePartySubmit() {
            if(ctx.client.config.advanced?.dev) console.log(party)
            const p = await ctx.client.getParty(party?.channel_id!, ctx.database)
            if(!p?.award || !message) return;
            if(!p.recurring && p.users.includes(ctx.interaction.user.id)) return;
            if(ctx.interaction.user.id === p.creator_id) return;
            const creator_token = await ctx.client.getUserToken(p.creator_id, ctx.database)
            const target_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
            if(!target_token) return message.reply({content: "You need to be logged in to receive rewards for this party"})
            const target_suser = await ctx.ai_horde_manager.findUser({token: target_token})
            if(!target_suser?.username || target_suser.id === 0) return message.reply({content: "Your saved token is invalid, please renew it to claim rewards"})
            if(!creator_token) return message.reply({content: "The creator of the party is logged out...\nLooks like you won't get any kudos"})
            const transfer = await ctx.ai_horde_manager.postKudosTransfer({username: target_suser.username, amount: p.award}, {token: creator_token}).catch(console.error)
            if(!transfer?.transferred) return message.reply({content: "Unable to send you the reward"})

            await message.reply({allowedMentions: {parse: []}, content: `<@${ctx.interaction.user.id}>, the creator of the party <@${p.creator_id}> awarded you ${p.award} kudos for your ${p.recurring ? "" : "first "}generation.${p.recurring ? "\nIf you submit another generation you can claim the reward again" : "\nYou can not receive the reward again"}`})
            const update = await ctx.database?.query("UPDATE parties SET users=array_append(array_remove(users, $2), $2) WHERE channel_id=$1 RETURNING *", [ctx.interaction.channelId, ctx.interaction.user.id])
            if(update?.rowCount) ctx.client.cache.set(`party-${ctx.interaction.channelId}`, update.rows[0]!)
            return;
        }
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        const option = context.interaction.options.getFocused(true)
        switch(option.name) {
            case "style": {
                const party = await context.client.getParty(context.interaction.channelId, context.database)
                if(party) return context.interaction.respond([{name: party.style, value: party.style}])
                const styles = Object.keys(context.client.horde_styles)
                const categories = Object.keys(context.client.horde_style_categories)
                const available = [...styles.map(s => ({name: `Style: ${s}`, value: s})), ...categories.map(s => ({name: `Category: ${s}`, value: s}))]
                const ret = option.value ? available.filter(s => s.value.toLowerCase().includes(option.value.toLowerCase())) : available
                return await context.interaction.respond(ret.slice(0,25))
            }
        }
    }
}
