import { ButtonBuilder, Colors, EmbedBuilder, SlashCommandBuilder, SlashCommandIntegerOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("whois")
    .setDMPermission(false)
    .setDescription(`Shows information on an ai horde user`)
    .addIntegerOption(
        new SlashCommandIntegerOption()
        .setName("user_id")
        .setDescription("The user to view")
        .setRequired(true)
    )

export default class extends Command {
    constructor() {
        super({
            name: "whois",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const user_id = ctx.interaction.options.getInteger("user_id", true)
        
        const user_data = await ctx.ai_horde_manager.getUserDetails(user_id).catch(console.error)

        if(!user_data) return ctx.error({error: "Unable to find horde user"})
        await ctx.interaction.deferReply()

        const props = []
        if(user_data.moderator) props.push("⚔️ Moderator")
        if(user_data.trusted) props.push("🤝 Trusted")
        if(user_data.suspicious) props.push(`Suspicious ${user_data.suspicious}`)
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            footer: {text: `${props.join(" | ")}`},
            title: `${user_data.username}`,
            description: `Images Requested \`${user_data.records?.request?.image}\` (\`${user_data.records?.usage?.megapixelsteps}\` Megapixelsteps)
Images Generated \`${user_data.records?.fulfillment?.image}\` (\`${user_data.records?.contribution?.megapixelsteps}\` Megapixelsteps)
Interrogation Requested \`${user_data.records?.request?.interrogation}\`
Interrogation Generated \`${user_data.records?.fulfillment?.interrogation}\`
Text Requested \`${user_data.records?.request?.text}\`
Text Generated \`${user_data.records?.fulfillment?.text}\`

**Kudos**
Total \`${user_data.kudos}\`
Accumulated \`${user_data.kudos_details?.accumulated}\`
Gifted \`${user_data.kudos_details?.gifted}\`
Admin \`${user_data.kudos_details?.admin}\`
Received \`${user_data.kudos_details?.received}\`
Awarded \`${user_data.kudos_details?.awarded}\`
Recurring \`${user_data.kudos_details?.recurring}\`

**Workers**
Invited \`${user_data.worker_invited}\`
Contributing \`${user_data.worker_count}\``,
        })
        
        const delete_btn = new ButtonBuilder({
            label: "Delete this message",
            custom_id: `delete_${ctx.interaction.user.id}`,
            style: 4
        })

        ctx.interaction.editReply({
            embeds: [embed.toJSON()],
            components: [{
                type: 1,
                components: [delete_btn.toJSON()]
            }]
        })
    }
}