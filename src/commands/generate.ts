import { ActionRowData, AttachmentBuilder, ButtonBuilder, Colors, EmbedBuilder, InteractionButtonComponentData, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { readFileSync, appendFileSync } from "fs";
import { Config } from "../types";
import StableHorde from "@zeldafan0225/stable_horde";
import Centra from "centra";

const config = JSON.parse(readFileSync("./config.json").toString()) as Config

const command_data = new SlashCommandBuilder()
    .setName("generate")
    .setDMPermission(false)
    .setDescription(`Generates an image with stable horde`)
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
        //return ctx.interaction.reply({content: `Coming soon.\nUse ${await ctx.client.getSlashCommandTag("generate")} for now`, ephemeral: true})
        if(!ctx.client.config.generate?.enabled) return ctx.error({error: "Generation is disabled."})

        await ctx.interaction.deferReply({})
        let prompt = ctx.interaction.options.getString("prompt", true)
        const negative_prompt = ctx.interaction.options.getString("negative_prompt") ?? ""
        const style_raw = ctx.interaction.options.getString("style") ?? ctx.client.config.generate?.default?.style ?? "raw"
        const amount = ctx.interaction.options.getInteger("amount") ?? 1
        const tiling = !!(ctx.interaction.options.getBoolean("tiling") ?? ctx.client.config.generate?.default?.tiling)
        const share_result = ctx.interaction.options.getBoolean("share_result") ?? ctx.client.config.generate?.default?.share

        const style = ctx.client.horde_styles[style_raw.toLowerCase()]

        if(ctx.client.config.advanced?.dev) {
            console.log(style)
        }

        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)

        if(!style?.prompt?.length) return ctx.error({error: "Unable to find style for input"})
        if(ctx.client.config.generate?.require_login && !user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use ${await ctx.client.getSlashCommandTag("generate")}`, codeblock: false})
        if(ctx.client.config.generate?.blacklisted_words?.some(w => prompt.toLowerCase().includes(w.toLowerCase()))) return ctx.error({error: "Your prompt included one or more blacklisted words"})
        if(ctx.client.config.generate?.blacklisted_styles?.includes(style_raw.toLowerCase())) return ctx.error({error: "The chosen style is blacklisted"})

        if(ctx.client.config.generate.convert_a1111_weight_to_horde_weight) {
            prompt = prompt.replace(/(\(+|\[+)|(\)+|\]+)/g, (w) => {
                if(w.startsWith("(") || w.startsWith("[")) return "("
                const weight = 1 + (0.1 * (w.startsWith(")") ? 1 : -1) * w.length)
                return `:${weight.toFixed(1)})`
            })
        }
        
        prompt = style.prompt.slice().replace("{p}", prompt)
        prompt = prompt.replace("{np}", !negative_prompt || prompt.includes("###") ? negative_prompt : `###${negative_prompt}`)

        const token = user_token || ctx.client.config.default_token || "0000000000"

        const generation_data: StableHorde.GenerationInput = {
            prompt,
            params: {
                sampler_name: style.sampler_name as typeof StableHorde.ModelGenerationInputStableSamplers[keyof typeof StableHorde.ModelGenerationInputStableSamplers],
                height: style.height,
                width: style.width,
                n: amount,
                tiling
            },
            nsfw: ctx.client.config.generate?.user_restrictions?.allow_nsfw,
            censor_nsfw: ctx.client.config.generate?.censor_nsfw,
            trusted_workers: ctx.client.config.generate?.trusted_workers,
            models: style.model ? [style.model] : undefined,
            r2: true,
            shared: share_result
        }
        
        if(token === "0000000000" && ((generation_data.params?.width ?? 512) > 1024 || (generation_data.params?.height ?? 512) > 1024 || (generation_data.params?.steps ?? 512) > 100)) return ctx.error({error: "You need to be logged in to generate images with a size over 1024*1024 or more than 100 steps"})

        if(ctx.client.config.advanced?.dev) {
            console.log(token)
            console.log(generation_data)
        }

        const generation_start = await ctx.stable_horde_manager.postAsyncGenerate(generation_data, {token})
        .catch((e) => {
            if(ctx.client.config.advanced?.dev) console.error(e)
            return e;
        })
        if(!generation_start || !generation_start.id) return ctx.error({error: `Unable to start generation: ${generation_start.message}`});


        if (ctx.client.config.logs?.enabled) {
            if(ctx.client.config.logs.log_actions?.without_source_image) {
                if (ctx.client.config.logs.plain) logGeneration("txt");
                if (ctx.client.config.logs.csv) logGeneration("csv");
            }
            function logGeneration(type: "txt" | "csv") {
                ctx.client.initLogDir();
                const log_dir = ctx.client.config.logs?.directory ?? "/logs";
                const content = type === "csv" ? `\n${new Date().toISOString()},${ctx.interaction.user.id},${generation_start?.id},${false},"${prompt}"` : `\n${new Date().toISOString()} | ${ctx.interaction.user.id}${" ".repeat(20 - ctx.interaction.user.id.length)} | ${generation_start?.id} | ${false}${" ".repeat(9)} | ${prompt}`;
                appendFileSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth() + 1}-${new Date().getFullYear()}.${type}`, content);
            }
        }

        if(ctx.client.config.advanced?.dev) console.log(`${ctx.interaction.user.id} generated with prompt "${prompt}" (${generation_start?.id})`)

        const start_status = await ctx.stable_horde_manager.getGenerationCheck(generation_start.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
        const start_horde_data = await ctx.stable_horde_manager.getPerformance()

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
            description: `This will make your requests appear anonymous.\nThis can result in low generation speed due to low priority.\nLog in now with ${await ctx.client.getSlashCommandTag("login")}\n\nDon't know what the token is?\nCreate a stable horde account here: https://stablehorde.net/register`
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
                    await ctx.stable_horde_manager.deleteGenerationRequest(generation_start.id!)
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
                    title: "Stable Horde currently is under high load",
                    description: "You can contribute your GPUs processing power to the project.\nRead more: https://stablehorde.net/"
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
            const status = await ctx.stable_horde_manager.getGenerationCheck(generation_start!.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
            done = !!status?.done
            const horde_data = await ctx.stable_horde_manager.getPerformance()
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
                const images = await ctx.stable_horde_manager.getGenerationStatus(generation_start!.id!)

                const image_map_r = images.generations?.map(async (g, i) => {
                    const req = await Centra(g.img!, "get").send();
                    if(ctx.client.config.advanced?.dev) console.log(req)
                    const attachment = new AttachmentBuilder(req.body, {name: `${g.seed ?? `image${i}`}.webp`})
                    const embed = new EmbedBuilder({
                        title: `Image ${i+1}`,
                        image: {url: `attachment://${g.seed ?? `image${i}`}.webp`},
                        color: Colors.Blue,
                        description: `${!i ? `**Raw Prompt:** ${ctx.interaction.options.getString("prompt", true)}\n**Processed Prompt:** ${prompt}\n**Style:** ${style_raw}\n**Total Kudos Cost:** \`${images.kudos}\`` : ""}${ctx.client.config.advanced?.dev ? `\n\n**Image ID** ${g.id}` : ""}` || undefined,
                    })
                    return {attachment, embed}
                }) || []
                if(!precheck) clearInterval(inter)

                const image_map = await Promise.all(image_map_r)
                const embeds = image_map.map(i => i.embed)
                if(ctx.client.config.advanced?.dev) embeds.at(-1)?.setFooter({text: `Generation ID ${generation_start!.id}`})
                const files = image_map.map(i => i.attachment)
                let components = [{type: 1, components: [delete_btn]}]
                if(ctx.client.config.generate?.user_restrictions?.allow_rating && (generation_data.shared ?? true) && files.length === 1) {
                    components = [...generateButtons(generation_start!.id!), ...components]
                }
                await message.edit({content: `Image generation finished`, components, embeds, files});
                return null
            } 
        }
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        const option = context.interaction.options.getFocused(true)
        switch(option.name) {
            case "style": {
                const styles = Object.keys(context.client.horde_styles)
                const available = styles.map(s => ({name: s, value: s}))
                const ret = option.value ? available.filter(s => s.name.toLowerCase().includes(option.value.toLowerCase())) : available
                return await context.interaction.respond(ret.slice(0,25))
            }
        }
    }
}