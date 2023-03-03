import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("news")
    .setDMPermission(false)
    .setDescription(`Shows ours news of ai horde`)

export default class extends Command {
    constructor() {
        super({
            name: "news",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const news = await ctx.ai_horde_manager.getNews()
        const embeds = news.slice(0, 3).map(n => new EmbedBuilder({
            title: n.importance,
            description: n.newspiece,
            timestamp: new Date(n.date_published!),
            color: Colors.Red
        }).toJSON())
        ctx.interaction.reply({
            content: `AI Horde News (3/${news.length})`,
            embeds,
            ephemeral: true
        })
    }
}