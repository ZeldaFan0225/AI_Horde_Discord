import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("about")
    .setDMPermission(false)
    .setDescription(`Shows information about this bot`)

export default class extends Command {
    constructor() {
        super({
            name: "about",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const embed = new EmbedBuilder({
            color: Colors.Blue,
            title: "Unofficial Stable Horde Discord Bot",
            description: `This Discord Bot was made by Zelda_Fan#0225 with ♥️\nYou can [view the code on GitHub](https://github.com/ZeldaFan0225/Stable_Horde_Discord) **but there is not guarantee that this instance is unmodified**.\nIf you find any bugs you can [report them on GitHub](https://github.com/ZeldaFan0225/Stable_Horde_Discord/issues).`
        })
        return ctx.interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    }
}