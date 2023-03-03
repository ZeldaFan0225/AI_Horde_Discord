import { ButtonBuilder, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
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
        const performance = await ctx.ai_horde_manager.getPerformance()
        const btn = new ButtonBuilder({
            label: "Refresh",
            style: 2,
            custom_id: "update_performance"
        })
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "AI Horde Performance",
            description: `Queued Requests \`${performance.queued_requests}\`
Queued Interrogation Requests \`${performance.queued_forms}\`
Queued Megapixelsteps \`${performance.queued_megapixelsteps}\`
Queued Megapixelsteps (past minute) \`${performance.past_minute_megapixelsteps}\`
Generation Workers \`${performance.worker_count}\`
Interrogation Workers \`${performance.interrogator_count}\`
Generation Thread Count \`${performance.thread_count}\`
Interrogation Thread Count \`${performance.interrogator_thread_count}\``
        })
        const delete_btn = new ButtonBuilder({
            label: "Delete this message",
            custom_id: `delete_${ctx.interaction.user.id}`,
            style: 4
        })
        ctx.interaction.reply({
            embeds: [embed],
            components: [{
                type: 1,
                components: [btn.toJSON(), delete_btn.toJSON()]
            }]
        })
    }
}