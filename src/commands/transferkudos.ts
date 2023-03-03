import { ButtonBuilder, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("transferkudos")
    .setDMPermission(false)
    .setDescription(`Sends somebody Kudos`)
    .addStringOption(
        new SlashCommandStringOption()
        .setName("user")
        .setRequired(true)
        .setDescription("The use to send the kudos to")
    )
    .addIntegerOption(
        new SlashCommandIntegerOption()
        .setName("amount")
        .setRequired(false)
        .setDescription("The amount of kudos to send")
        .setMinValue(1)
    )

export default class extends Command {
    constructor() {
        super({
            name: "transferkudos",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        let token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)
        const add_token_button = new ButtonBuilder({
            custom_id: "save_token",
            label: "Save Token",
            style: 1
        })
        if(!token) return ctx.interaction.reply({
            content: `Please add your token before your user details can be shown.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${await ctx.client.getSlashCommandTag("terms")}\n\n\nDon't know what the token is?\nCreate an ai horde account here: https://aihorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        })

        await ctx.interaction.deferReply()

        const username = ctx.interaction.options.getString("user",true)
        const amount = ctx.interaction.options.getInteger("amount") ?? 1
        if(!username.includes("#")) return ctx.error({
            error: "The username must follow the scheme: Name#1234"
        })
        if(amount <= 0) return ctx.error({
            error: "You can only send one or mode kudos"
        })

        const transfer = await ctx.ai_horde_manager.postKudosTransfer({
            username,
            amount
        }, {token}).catch(e => e)

        if(typeof transfer.name === "string") return ctx.error({error: transfer.name})
        ctx.interaction.editReply({
            content: `Transferred ${amount} kudos to ${username}`
        })
    }
}