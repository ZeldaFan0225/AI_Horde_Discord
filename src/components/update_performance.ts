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
        const performance = await ctx.api_manager.getStatusPerformance()
        const btn = new ButtonBuilder({
            label: "Refresh",
            style: 2,
            custom_id: "update_performance"
        })
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Stable Horde Performance",
            description: `Queued Requests \`${performance.queued_requests}\`
Queued Megapixelsteps \`${performance.queued_megapixelsteps}\`
Queued Megapixelsteps (past minute) \`${performance.past_minute_megapixelsteps}\`
Total Workers \`${performance.worker_count}\``
        })
        ctx.interaction.update({
            embeds: [embed],
            components: [{
                type: 1,
                components: [btn.toJSON()]
            }]
        })
    }
}