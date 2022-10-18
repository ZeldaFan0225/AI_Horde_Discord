import { /*ButtonBuilder, */Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("performance")
    .setDMPermission(false)
    .setDescription(`Shows the hordes performance`)

export default class extends Command {
    constructor() {
        super({
            name: "performance",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const performance = await ctx.api_manager.getStatusPerformance()
        /*const btn = new ButtonBuilder({
            label: "Refresh",
            style: 2,
            custom_id: "update_performance"
        })*/
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Stable Horde Performance",
            description: `Queued Requests \`${performance.queued_requests}\`
Queued Megapixelsteps \`${performance.queued_megapixelsteps}\`
Queued Megapixelsteps (past minute) \`${performance.past_minute_megapixelsteps}\`
Total Workers \`${performance.worker_count}\``
        })
        ctx.interaction.reply({
            embeds: [embed],
            /*components: [{
                type: 1,
                components: [btn.toJSON()]
            }]*/
        })
    }
}