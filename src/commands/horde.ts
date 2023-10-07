import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("horde")
    .setDMPermission(false)
    .setDescription(`Shows info on ai horde`)

export default class extends Command {
    constructor() {
        super({
            name: "horde",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const news = await ctx.ai_horde_manager.getNews()
        const article = news[0]
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "AI Horde",
            //TODO: Add more info in the future
            description: `The [AI Horde](https://https://aihorde.net/) is a crowdsourced service providing Stable Diffusion and other AI services for everyone.\nIt is free, open sourced, and relies on volunteer processing power.\n\nIf you enjoy using it, please consider [onboarding your own PC as a worker](https://github.com/AI-Horde/AI-Horde-Worker#readme) or supporting its development [on patreon](https://www.patreon.com/db0)${article ? `\n\n**Latest News**\n${article.newspiece}\n<t:${Math.round(Number(new Date(article.date_published!))/1000)}>` : ""}`
        })
        return ctx.interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    }
}
