import { AttachmentBuilder, ButtonBuilder, Colors, EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandUserOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const command_data = new SlashCommandBuilder()
    .setName("workers")
    .setDMPermission(false)
    .setDescription(`Shows information on your stable horde workers`)
    .addUserOption(
        new SlashCommandUserOption()
        .setName("user")
        .setDescription("The user to view")
        .setRequired(false)
    )
    .addBooleanOption(
        new SlashCommandBooleanOption()
        .setName("show_all")
        .setDescription("Set to true to show all currently available workers")
        .setRequired(false)
    )

export default class extends Command {
    constructor() {
        super({
            name: "workers",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        let token = await ctx.client.getUserToken(ctx.interaction.options.getUser("user")?.id ?? ctx.interaction.user.id, ctx.database)
        const show_all = ctx.interaction.options.getBoolean("show_all") ?? false
        if(!token && ctx.interaction.options.getUser("user")?.id) return ctx.error({error: "The user has not added their token"})
        const add_token_button = new ButtonBuilder({
            custom_id: "save_token",
            label: "Save Token",
            style: 1
        })
        const delete_btn = new ButtonBuilder({
            label: "Delete this message",
            custom_id: `delete_${ctx.interaction.user.id}`,
            style: 4
        })
        if(!token) return ctx.interaction.reply({
            content: `Please add your token before your workers can be shown.\nThis is needed to perform actions on your behalf\n\nBy entering your token you agree to the ${await ctx.client.getSlashCommandTag("terms")}\n\n\nDon't know what the token is?\nCreate a stable horde account here: https://stablehorde.net/register`,
            components: [{type: 1, components: [add_token_button.toJSON()]}],
            ephemeral: true
        }) 

        const user_data = await ctx.stable_horde_manager.findUser({token}).catch(() => null)
        const workers = await ctx.stable_horde_manager.getWorkers().catch(() => null)
        
        if(!workers?.length) return ctx.interaction.reply({
            content: "Unable to find workers",
            ephemeral: true
        })

        
        const users_workers = workers.filter(w => user_data?.worker_ids?.includes(w.id!))
        if(ctx.interaction.options.getUser("user")?.id && !users_workers.length) return ctx.error({error: "This user does not have any workers online"})
        if(show_all || !user_data || !users_workers.length) {
            const max_name = workers.sort((a,b) => (b.name?.length ?? 0)-(a.name?.length ?? 0))[0]?.name?.length ?? 9
            const max_models = workers.sort((a,b) => (b.models?.join(", ")?.length ?? 0)-(a.models?.join(", ")?.length ?? 0))[0]?.models?.join(", ")?.length ?? 0
            const file_header = `Worker ID                            | name${" ".repeat(max_name-4)} | img2img | nsfw  | maintenance | models${" ".repeat(max_models-5)} |`
            const file_data = `${file_header}\n${"-".repeat(file_header.length)}\n${workers.map(w => `${w.id} | ${w.name}${" ".repeat((max_name)-(w.name?.length??9))} |  ${w.img2img ? `true ` : `false`}  | ${w.nsfw ? `true ` : `false`} | ${w.maintenance_mode ? `true ` : `false`}        | ${w.models?.join(", ")}${" ".repeat((max_models)-(w.models?.join(", ")?.length??0))} |`).join("\n")}`
        
            ctx.interaction.reply({
                content: "Data attached below",
                files: [new AttachmentBuilder(Buffer.from(file_data), {name: `workers.txt`})],
                ephemeral: true
            })
        } else {

            if(users_workers.length > 25) {
                const max_name = users_workers.sort((a,b) => (b.name?.length ?? 0)-(a.name?.length ?? 0))[0]?.name?.length ?? 9
                const max_models = users_workers.sort((a,b) => (b.models?.join(", ")?.length ?? 0)-(a.models?.join(", ")?.length ?? 0))[0]?.models?.join(", ")?.length ?? 0
                const file_header = `Worker ID                            | name${" ".repeat(max_name-4)} | models${" ".repeat(max_models-6)} | img2img | nsfw  | maintenance |`
                const file_data = `${file_header}\n${"-".repeat(file_header.length)}\n${users_workers.map(w => `${w.id} | ${w.name}${" ".repeat((max_name)-(w.name?.length??9))} | ${w.models?.join(", ")}${" ".repeat((max_models)-(w.models?.join(", ")?.length??0))} | ${w.img2img ? `true ` : `false`}   | ${w.nsfw ? `true ` : `false`} | ${w.maintenance_mode ? `true ` : `false`}       |`).join("\n")}`
            
                ctx.interaction.reply({
                    content: "Data attached below",
                    files: [new AttachmentBuilder(Buffer.from(file_data), {name: `workers.txt`})],
                    ephemeral: true
                })
            } else {
                const embed = new EmbedBuilder()
                .setColor(Colors.Blue)
                .setTitle(`Currently running Workers - ${user_data.username}`)
                .setDescription(`${users_workers.length}/25`)
                .addFields(...users_workers.map(w => ({name: w.id ?? "Unknown", value: `**Name**: ${w.name}\n**Img2Img**: ${w.img2img}\n**NSFW**: ${w.nsfw}\n**Maintenance**: ${w.maintenance_mode}\n**Models**: ${w.models?.join(", ")}`, inline: true})))
                
                ctx.interaction.reply({
                    embeds: [embed.toJSON()],
                    components: [{
                        type: 1,
                        components: [delete_btn.toJSON()]
                    }]
                })
            }
        }
    }
}