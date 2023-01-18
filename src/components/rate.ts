import { ActionRowData, Colors, ComponentType, EmbedBuilder, InteractionButtonComponentData } from "discord.js";
import { Component } from "../classes/component";
import { ComponentContext } from "../classes/componentContext";

function generateButtons(id: string) {
    let i = 0
    const getId = () => `rate_${i+1}_${id}`
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

export default class extends Component {
    constructor() {
        super({
            name: "rate",
            staff_only: false,
            regex: /rate_\d+_[0-9a-z-]+/
        })
    }

    override async run(ctx: ComponentContext<ComponentType.SelectMenu>): Promise<any> {
        await ctx.interaction.deferUpdate()
        const [rate, id] = ctx.interaction.customId.split("_").slice(1)
        const token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)

        const res = await ctx.stable_horde_manager.ratings.postRating(id!, {rating: Number(rate)}, {token}).catch(console.error)
        if(!res?.message) ctx.error({
            error: "Unable to rate image"
        })

        if(ctx.client.config.advanced?.dev) console.log(res)

        const img = await ctx.stable_horde_manager.ratings.getNewRating(undefined, {token}).catch(console.error)
        if(!img?.url) return ctx.error({error: "Unable to request Image"})

        if(ctx.client.config.advanced?.dev) console.log(img)

        const embed = new EmbedBuilder({
            title: "Rate the Image below",
            image: {
                url: img.url
            },
            description: `How good does this image look to you?\nPrevious Rating: ${"⭐".repeat(Number(rate))}${"⬛".repeat(10-Number(rate))}\nKudos earned for previous rating: \`${res?.reward}\``,
            color: Colors.Blurple,
            footer: {
                text: `ImgID ${img.id}`
            }
        })


        ctx.interaction.editReply({
            embeds: [embed.toJSON()],
            components: generateButtons(img.id!)
        })
    }
}