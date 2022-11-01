import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("models")
    .setDMPermission(false)
    .setDescription(`Shows information on available models`)

export default class extends Command {
    constructor() {
        super({
            name: "models",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const models = await ctx.stable_horde_manager.getModels({force: true})

        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Currently available models",
            description: models.map(w => `**${w.name}**
Workers: \`${w.count}\`
Performance: \`${w.performance}\``).join("\n\n")
        })

        if(models.length <= 25) {
            embed.setDescription(null)
            embed.setFields(models.map(w => ({
                name: w.name!,
                value: `Workers: \`${w.count}\`\nPerformance: \`${w.performance}\``,
                inline: true
            })))
        }

        return ctx.interaction.reply({
            embeds: [embed]
        })
    }
}