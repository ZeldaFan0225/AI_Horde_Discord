import { ButtonBuilder, Colors, ComponentType, EmbedBuilder } from "discord.js";
import { Component } from "../classes/component";
import { ComponentContext } from "../classes/componentContext";


export default class extends Component {
    constructor() {
        super({
            name: "update_performance",
            staff_only: false,
            regex: /update_performance/
        })
    }

    override async run(ctx: ComponentContext<ComponentType.SelectMenu>): Promise<any> {
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
        ctx.interaction.update({
            embeds: [embed],
            components: [{
                type: 1,
                components: [btn.toJSON(), delete_btn.toJSON()]
            }]
        })
    }
}
