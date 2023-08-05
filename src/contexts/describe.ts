import {ModelInterrogationInputStable, ModelInterrogationFormTypes, HordeAsyncRequestStates} from "@zeldafan0225/ai_horde";
import { ApplicationCommandType, ButtonBuilder, Colors, ComponentType, ContextMenuCommandBuilder, EmbedBuilder } from "discord.js";
import { Context } from "../classes/context";
import { ContextContext } from "../classes/contextContext";

const command_data = new ContextMenuCommandBuilder()
    .setType(ApplicationCommandType.Message)
    .setName("Describe Image")
    .setDMPermission(false)

export default class extends Context {
    constructor() {
        super({
            name: "Describe Image",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: ContextContext<ApplicationCommandType.Message>): Promise<any> {
        if(!ctx.client.config.interrogate?.enable_image_description_context) return ctx.error({error: "This feature has been disabled"})

        const images = ctx.interaction.targetMessage.attachments.filter(a => a.contentType?.includes("image"))

        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        
        if(!user_token) return ctx.error({error: `You are required to ${await ctx.client.getSlashCommandTag("login")} to use this action`, codeblock: false})
        if(!images.size) return ctx.error({error: "There are no images on this message"})

        const token = user_token || ctx.client.config.default_token || "0000000000"

        let image

        if(images.size > 1) {
            const reply = await ctx.interaction.reply({
                content: "Please select the image to describe below",
                components: [{
                    type: 1,
                    components: [{
                        type: 3,
                        custom_id: "image_select",
                        options: images.map(i => ({label: i.name, value: i.id}))
                    }]
                }],
                fetchReply: true
            })

            const select_interaction = await reply.awaitMessageComponent({
                time: 1000 * 60,
                componentType: ComponentType.StringSelect
            }).catch(console.error)

            if(!select_interaction?.values?.[0]) return ctx.error({error: "Unable to find image to describe"})

            image = images.get(select_interaction.values[0])

            await reply.edit({content: "Please wait...", components: []})
        } else {
            await ctx.interaction.deferReply()
            image = images.first()
        }

        if(!image) return ctx.error({error: "Unable to find image"})

        

        const interrogation_data: ModelInterrogationInputStable = {
            source_image: image.url,
            forms: [
                {
                    name: ModelInterrogationFormTypes.caption
                }
            ]
        }
        
        const interrogation_start = await ctx.ai_horde_manager.postAsyncInterrogate(interrogation_data, {token})
        .catch((e) => {
            if(ctx.client.config.advanced?.dev) console.error(e)
            ctx.error({error: `Unable to start interrogation: ${e.message}`})
            return null;
        })
        if(!interrogation_start || !interrogation_start.id) return ctx.error({error: "Something went wrong"});
        
        if(ctx.client.config.advanced?.dev) console.log(`${ctx.interaction.user.id} interrogated ${image.url} (${interrogation_start?.id})`)
        
        const start_status = await ctx.ai_horde_manager.getInterrogationStatus(interrogation_start.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);

        if(ctx.client.config.advanced?.dev) {
            console.log(start_status)
        }

        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Describing Image",
            description: `**Caption**\n\`${start_status?.forms?.find(f => f.form === ModelInterrogationFormTypes.caption)?.state}\``,
            image: {
                url: image.url
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

        await ctx.interaction.editReply({
            content: "",
            embeds: [embed.toJSON()],
            components
        })

        const message = await ctx.interaction.fetchReply()
        let done = false

        const inter = setInterval(async () => {
            const d = await getCheckAndDisplayResult()
            if(!d) return;
            const status = d.status


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

            const embed = new EmbedBuilder({
                color: Colors.Blue,
                title: "Describing Image",
                description: `**Caption**\n\`${status?.forms?.find(f => f.form === ModelInterrogationFormTypes.caption)?.state}\``,
                image: {
                    url: image!.url
                }
            })

            if(ctx.client.config.advanced?.dev) embed.setFooter({text: interrogation_start?.id ?? "Unknown ID"})

            return message.edit({
                content: "",
                embeds: [embed.toJSON()],
                components
            })
        }, 1000 * (ctx.client.config?.interrogate?.update_interrogation_status_interval_seconds || 5))


        async function getCheckAndDisplayResult() {
            if(done) return;
            const status = await ctx.ai_horde_manager.getInterrogationStatus(interrogation_start!.id!).catch((e) => ctx.client.config.advanced?.dev ? console.error(e) : null);
            done = status?.state === HordeAsyncRequestStates.done
            if(!status || status.state === HordeAsyncRequestStates.faulted) {
                if(!done) await message.edit({content: "Interrogation has been cancelled", embeds: []});
                clearInterval(inter)
                return null;
            }

            if(ctx.client.config.advanced?.dev) {
                console.log(status)
            }

            if(status.state !== HordeAsyncRequestStates.done && status.state !== HordeAsyncRequestStates.partial) return {status}
            else {
                done = true

                const caption_res = status?.forms?.find(f => f.form === ModelInterrogationFormTypes.caption)
                
                const embed = new EmbedBuilder({
                    color: Colors.Blue,
                    title: "Image description",
                    description: `\n**Caption**\n${caption_res?.state !== HordeAsyncRequestStates.done ? caption_res?.state : caption_res?.result?.caption}`,
                    image: {
                        url: image!.url
                    }
                })

                clearInterval(inter)

                await message.edit({components: [{type: 1, components: [delete_btn.toJSON()]}], embeds: [embed]});
                return null
            } 
        }
    }
}