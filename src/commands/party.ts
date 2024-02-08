import { ChannelType, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption, ThreadAutoArchiveDuration } from "discord.js";
import { AutocompleteContext } from "../classes/autocompleteContext";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { Config } from "../types";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./config.json").toString()) as Config

const command_data = new SlashCommandBuilder()
    .setName("party")
    .setDMPermission(false)
    .setDescription(`Starts a generation party`)
    if(config.party?.enabled) {
        command_data
        .addStringOption(
            new SlashCommandStringOption()
            .setName("name")
            .setDescription("The name of the party")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("award")
            .setDescription("The amount of kudos to award to every generation")
            .setRequired(true)
            .setMinValue(config.party.user_restrictions?.award?.min ?? 1)
            .setMaxValue(config.party.user_restrictions?.award?.max ?? 100000)
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("duration")
            .setDescription("The duration of how long the party should last in days")
            .setRequired(true)
            .setMinValue(config.party.user_restrictions?.duration?.min ?? 1)
            .setMaxValue(config.party.user_restrictions?.duration?.max ?? 30)
        )
        .addStringOption(
            new SlashCommandStringOption()
            .setName("style")
            .setDescription("The style to use for generations")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("recurring")
            .setDescription("If users get rewarded for each generation or only their first")
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("pay_for_generations")
            .setDescription("Whether to pay for the generations users make")
        )
        .addStringOption(
            new SlashCommandStringOption()
            .setName("wordlist")
            .setDescription("Set a comma separated list of words the users prompt has to include")
        )
    }


export default class extends Command {
    constructor() {
        super({
            name: "party",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.client.config.party?.enabled) return ctx.error({error: "Party is disabled."})
        if(!ctx.database) return ctx.error({error: "The database is disabled. This action requires a database."})
        if(ctx.interaction.channel?.type !== ChannelType.GuildText) return ctx.error({error: "This command can only be used in text channels"})

        const name = ctx.interaction.options.getString("name", true)
        const award = ctx.interaction.options.getInteger("award", true)
        const duration = ctx.interaction.options.getInteger("duration", true)
        const recurring = !!(ctx.interaction.options.getBoolean("recurring") ?? ctx.client.config.party?.default?.recurring)
        const pay = !!(ctx.interaction.options.getBoolean("pay_for_generations") ?? ctx.client.config.party?.default?.pay_for_generations)
        const wordlist = (ctx.interaction.options.getString("wordlist") ?? "").split(",").map(w => w.trim().toLowerCase()).filter(w => w)
        const style_raw = (ctx.interaction.options.getString("style") ?? ctx.client.config.generate?.default?.style ?? "raw").replace("Style: ","").replace("Category: ","")
        const style = ctx.client.horde_styles[style_raw.toLowerCase()] || ctx.client.horde_style_categories[style_raw.toLowerCase()]

        const user_token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)

        if(ctx.client.config.advanced?.dev) {
            console.log(style)
        }

        if(!user_token) return ctx.error({error: "You need to be logged in to start a party"})
        if(!style) return ctx.error({error: "A valid style is required"})
        if(ctx.client.config.generate?.blacklisted_styles?.includes(style_raw.toLowerCase())) return ctx.error({error: "The chosen style or category is blacklisted"})

        if(ctx.client.config.party.user_restrictions?.wordlist) {
            if(
                ctx.client.config.party.user_restrictions?.wordlist.min || 0 > wordlist.length ||
                ctx.client.config.party.user_restrictions?.wordlist.max && ctx.client.config.party.user_restrictions?.wordlist.max < wordlist.length
            ) return ctx.error({error: `Your wordlist must be between ${ctx.client.config.party.user_restrictions?.wordlist.min || "no"} and ${ctx.client.config.party.user_restrictions?.wordlist.max || "unlimited"} words`})
        }

        await ctx.interaction.deferReply({ephemeral: true})

        const thread = await ctx.interaction.channel.threads.create({
            name,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
        }).catch(console.error)
        if(!thread?.id) return ctx.error({error: "Unable to start party"})

        let shared_key_id: string | null = null

        if(pay) {
            const token = await ctx.client.getUserToken(ctx.interaction.user.id, ctx.database)

            const shared_key = await ctx.ai_horde_manager.putSharedKey({
                kudos: 100000,
                expiry: duration,
                name: `Party ${name}`
            }, {token}).catch(console.error)

            if(shared_key?.id) shared_key_id = shared_key.id
            if(ctx.client.config.advanced?.dev) console.log(shared_key_id)
        }

        const party = await ctx.database.query(`INSERT INTO parties (channel_id, guild_id, creator_id, ends_at, style, award, recurring, shared_key, wordlist) VALUES ($1, $2, $3, CURRENT_TIMESTAMP + interval '${duration} day', $4, $5, $6, $7, $8) RETURNING *`, [
            thread.id,
            thread.guildId,
            ctx.interaction.user.id,
            style_raw.toLowerCase(),
            award,
            recurring,
            shared_key_id,
            wordlist
        ]).catch(console.error)

        if(!party?.rowCount) {
            await thread.delete()
            return ctx.error({error: "Unable to start party"})
        }

        const start = await thread.send({
            content: `<@${ctx.interaction.user.id}> started the party "${name}" with the ${Array.isArray(style) ? "category" : "style"} "${style_raw}".\nYou will get ${award} kudos for ${recurring ? `every generation` : `your first generation`}.\nThe party ends <t:${Math.round((Date.now() + 1000 * 60 * 60 * 24 * duration)/1000)}:R>${wordlist.length ? `\nThe prompt has to include the words: ${wordlist.join(",")}` : ""}${pay && shared_key_id ? "\nThe party creator will pay for all generations 🥳" : ""}\n\n${ctx.client.config.party.mention_roles?.length ? ctx.client.config.party.mention_roles.map(r => `<@&${r}>`).join(" ") : ""}`,
            allowedMentions: {
                users: [ctx.interaction.user.id],
                roles: ctx.client.config.party.mention_roles
            }
        }).catch(console.error)

        await start?.pin().catch(console.error)
        await ctx.interaction.editReply({content: start?.id ? "Party started" : "Failed to announce party"})
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        const option = context.interaction.options.getFocused(true)
        switch(option.name) {
            case "style": {
                const styles = Object.keys(context.client.horde_styles)
                const categories = Object.keys(context.client.horde_style_categories)
                const available = [...styles.map(s => ({name: `Style: ${s}`, value: s})), ...categories.map(s => ({name: `Category: ${s}`, value: s}))]
                const ret = option.value ? available.filter(s => s.name.toLowerCase().includes(option.value.toLowerCase().replace("style: ","").replace("category: ","").trim())) : available
                return await context.interaction.respond(ret.slice(0,25))
            }
        }
    }
}
