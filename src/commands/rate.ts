import { ActionRowData, ButtonBuilder, Colors, EmbedBuilder, InteractionButtonComponentData, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("rate")
    .setDMPermission(false)
    .setDescription(`Earn kudos by rating images`)

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

export default class extends Command {
    constructor() {
        super({
            name: "rate",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        await ctx.interaction.deferReply({ephemeral: true})
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        let token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        const add_token_button = new ButtonBuilder({
            custom_id: "save_token",
            label: "Save Token",
            style: 1
        })
        if(!token) return ctx.interaction.editReply({
            content: `Please add your token before your user details can be shown.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${await ctx.client.getSlashCommandTag("terms")}\n\n\nDon't know what the token is?\nCreate an ai horde account here: https://aihorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}]
        })

        const user_data = await ctx.ai_horde_manager.findUser({token}).catch(() => null)

        if(!user_data) return ctx.interaction.editReply({
            content: "Unable to find user for saved token.",
            components: [{type: 1, components: [add_token_button.toJSON()]}]
        })

        const img = await ctx.ai_horde_manager.ratings.getNewRating(undefined, {token}).catch(console.error)
        if(!img?.url) return ctx.error({error: "Unable to request Image"})

        if(ctx.client.config.advanced?.dev) console.log(img)

        const embed = new EmbedBuilder({
            title: "Rate the Image below",
            image: {
                url: img.url
            },
            description: `How good does this image look to you?`,
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