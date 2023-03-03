import { AttachmentBuilder, ButtonBuilder, Colors, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { Config } from "../types";
import {readFileSync} from "fs"
import AIHorde from "@zeldafan0225/ai_horde";

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

        if(!nsfw && !caption && !detailed) return ctx.error({error: "One of the interrogation types must be selected"})

        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)

        if(!user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use ${await ctx.client.getSlashCommandTag("interrogate")}`, codeblock: false})
        if(!attachment.contentType?.startsWith("image/")) return ctx.error({error: "Attachment input must be a image"})

        const token = user_token || ctx.client.config.default_token || "0000000000"

        const forms = []

        if(nsfw) forms.push({name: AIHorde.ModelInterrogationFormTypes.nsfw})
        if(caption) forms.push({name: AIHorde.ModelInterrogationFormTypes.caption})
        if(detailed) forms.push({name: AIHorde.ModelInterrogationFormTypes.interrogation})

        const interrogation_data: AIHorde.ModelInterrogationInputStable = {
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

        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Interrogation started",
            description: `Please wait...

Interrogation workers: \`${start_horde_data.interrogator_count}\`
Interrogations queued: \`${start_horde_data.queued_forms}\`
${nsfw ? `\n**NSFW** \`${start_status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.nsfw)?.state}\`` : ""}${caption ? `\n**Caption** \`${start_status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.caption)?.state}\`` : ""}${detailed ? `\n**Detailed Interrogation** \`${start_status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.interrogation)?.state}\`` : ""}`,
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


            if(start_status?.state === AIHorde.HordeAsyncRequestStates.faulted) {
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

            const embed = new EmbedBuilder({
                color: Colors.Blue,
                title: "Interrogation started",
                description: `Please wait...

                Interrogation workers: \`${horde_data.interrogator_count}\`
                Interrogations queued: \`${horde_data.queued_forms}\`
                ${nsfw ? `\n**NSFW** \`${status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.nsfw)?.state}\`` : ""}${caption ? `\n**Caption** \`${status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.caption)?.state}\`` : ""}${detailed ? `\n**Detailed Interrogation** \`${status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.interrogation)?.state}\`` : ""}`,
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
            done = status?.state === AIHorde.HordeAsyncRequestStates.done
            const horde_data = await ctx.ai_horde_manager.getPerformance()
            if(!status || status.state === AIHorde.HordeAsyncRequestStates.faulted) {
                if(!done) await message.edit({content: "Interrogation has been cancelled", embeds: []});
                if(!precheck) clearInterval(inter)
                return null;
            }

            if(ctx.client.config.advanced?.dev) {
                console.log(status)
            }

            if(status.state !== AIHorde.HordeAsyncRequestStates.done && status.state !== AIHorde.HordeAsyncRequestStates.partial) return {status, horde_data}
            else {
                done = true

                const nsfw_res = status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.nsfw)
                const caption_res = status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.caption)
                const detailed_res = status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.interrogation)
                
                const embed = new EmbedBuilder({
                    color: Colors.Blue,
                    title: "Interrogation finished",
                    description: `${nsfw ? `**NSFW** \`${nsfw_res?.state !== AIHorde.HordeAsyncRequestStates.done ? nsfw_res?.state : nsfw_res?.result?.nsfw}\`` : ""}${detailed ? `\n**Detailed Interrogation** \`${detailed_res?.state !== AIHorde.HordeAsyncRequestStates.done ? detailed_res?.state : "Result attached"}\`` : ""}${caption ? `\n**Caption**\n${caption_res?.state !== AIHorde.HordeAsyncRequestStates.done ? caption_res?.state : caption_res?.result?.caption}` : ""}`,
                    image: {
                        url: attachment.url
                    }
                })

                if(!precheck) clearInterval(inter)

                const files = []
                if(detailed && detailed_res?.state === AIHorde.HordeAsyncRequestStates.done) files.push(new AttachmentBuilder(Buffer.from(JSON.stringify((status?.forms?.find(f => f.form === AIHorde.ModelInterrogationFormTypes.interrogation)?.result?.interrogation || {}), null, 2)), {name: "detailed.json"}))
                await message.edit({components: [{type: 1, components: [delete_btn.toJSON()]}], embeds: [embed], files});
                return null
            } 
        }
    }
}