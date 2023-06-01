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
        .setRequired(false)
        .setDescription("The user to send the kudos to")
    )
    .addStringOption(
        new SlashCommandStringOption()
        .setName("discord user")
        .setRequired(false)
        .setDescription("If you aren't using horde usernames, pick a discord user to send to.")
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

        let username;
       
        if (ctx.interaction.options.getUser("discord user") != undefined) {
            const user = ctx.interaction.options.getUser("discord user")?.id
            let token = await ctx.client.getUserToken(user!, ctx.database)
            if(!token && ctx.interaction.options.getUser("discord user")?.id) {
                return ctx.error({error: "The user has not added their token"})
            }
            const user_data = await ctx.ai_horde_manager.findUser({token}).catch(() => null)
            if(!user_data) return ctx.error({
                error: `Unable to find user for saved token.\nUpdate your token with ${await ctx.client.getSlashCommandTag("updatetoken")}`,
                codeblock: false
            })
            username = user_data.username
        } else if (ctx.interaction.options.getString("user")) {
            username = ctx.interaction.options.getString("user",true)
        } else {
            return ctx.error({error: "You did not specify a discord user or a horde user."})
        }
        

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
        const amount = ctx.interaction.options.getInteger("amount") ?? 1
        if(!username?.includes("#")) return ctx.error({
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