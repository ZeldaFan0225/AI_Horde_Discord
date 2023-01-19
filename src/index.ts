import {readFileSync} from "fs"
import {ActivityType, ApplicationCommandType, InteractionType, PartialMessageReaction, Partials, PartialUser, PresenceUpdateStatus} from "discord.js";
import { StableHordeClient } from "./classes/client";
import { handleCommands } from "./handlers/commandHandler";
import { handleComponents } from "./handlers/componentHandler";
import { handleModals } from "./handlers/modalHandler";
import { Pool } from "pg"
import { handleAutocomplete } from "./handlers/autocompleteHandler";
import StableHorde from "@zeldafan0225/stable_horde";
import { handleContexts } from "./handlers/contextHandler";
import {existsSync, mkdirSync} from "fs"
import { handleMessageReact } from "./handlers/messageReact";

const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/
for (const line of readFileSync(`${process.cwd()}/.env`, 'utf8').split(/[\r\n]/)) {
    const [, key, value] = line.match(RE_INI_KEY_VAL) || []
    if (!key) continue

    process.env[key] = value?.trim() || ""
}

let connection: Pool | undefined


const client = new StableHordeClient({
    intents: ["Guilds", "GuildMessageReactions"],
    partials: [Partials.Reaction, Partials.Message]
})

if(client.config.advanced?.encrypt_token && !process.env["ENCRYPTION_KEY"]?.length)
    throw new Error("Either give a valid encryption key (you can generate one with 'npm run generate-key') or disable token encryption in your config.json file.")

if(client.config.use_database !== false) {
    connection = new Pool({
        user: process.env["DB_USERNAME"],
        host: process.env["DB_IP"],
        database: process.env["DB_NAME"],
        password: process.env["DB_PASSWORD"],
        port: Number(process.env["DB_PORT"]),
    })
    
    connection.connect().then(async () => {
        await connection!.query("CREATE TABLE IF NOT EXISTS user_tokens (index SERIAL, id VARCHAR(100) PRIMARY KEY, token VARCHAR(100) NOT NULL)")
        await connection!.query("CREATE TABLE IF NOT EXISTS pending_kudos (index SERIAL, unique_id VARCHAR(200) PRIMARY KEY, target_id VARCHAR(100) NOT NULL, from_id VARCHAR(100) NOT NULL, amount int NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)")
    }).catch(() => null);

    setInterval(async () => {
        await connection?.query("DELETE FROM pending_kudos WHERE updated_at <= CURRENT_TIMESTAMP - interval '1 week'").catch(console.error)
    }, 1000 * 60 * 60 * 24)
}

const bot_version = JSON.parse(readFileSync("./package.json", "utf-8")).version
const stable_horde_manager = new StableHorde({
    default_token: client.config.default_token,
    cache_interval: 1000,
    cache: {
        models: 1000 * 10,
        performance: 1000 * 10,
        teams: 1000 * 10
    },
    client_agent: `ZeldaFan-Discord-Bot:${bot_version}:https://github.com/ZeldaFan0225/Stable_Horde_Discord`
})

client.login(process.env["DISCORD_TOKEN"])

if(client.config.logs?.enabled) {
    client.initLogDir()
}

if(!existsSync(`${process.cwd()}/node_modules/webp-converter/temp`)) {
    mkdirSync("./node_modules/webp-converter/temp")
}


client.on("ready", async () => {
    client.commands.loadClasses().catch(console.error)
    client.components.loadClasses().catch(console.error)
    client.contexts.loadClasses().catch(console.error)
    client.modals.loadClasses().catch(console.error)
    client.user?.setPresence({activities: [{type: ActivityType.Listening, name: "to your generation requests | https://stablehorde.net"}], status: PresenceUpdateStatus.DoNotDisturb, })
    console.log(`Ready`)
    await client.application?.commands.set([...client.commands.createPostBody(), ...client.contexts.createPostBody()]).catch(console.error)
    if((client.config.advanced_generate?.user_restrictions?.amount?.max ?? 4) > 10) throw new Error("More than 10 images are not supported in the bot")
    if(client.config.filter_actions?.guilds?.length && (client.config.filter_actions?.mode !== "whitelist" && client.config.filter_actions?.mode !== "blacklist")) throw new Error("The actions filter mode must be set to either whitelist, blacklist.")
    if(client.config.advanced?.pre_check_prompts_for_suspicion?.enabled && !process.env["OPERATOR_API_KEY"]) throw new Error("The OPERATOR_API_KEY in the .env is required when pre checking prompts for being suspicious")
})

client.on("messageReactionAdd", async (r, u) => await handleMessageReact(r as PartialMessageReaction, u as PartialUser, client, connection, stable_horde_manager))

client.on("interactionCreate", async (interaction) => {
    switch(interaction.type) {
        case InteractionType.ApplicationCommand: {
            switch(interaction.commandType) {
                case ApplicationCommandType.ChatInput: {
                    return await handleCommands(interaction, client, connection, stable_horde_manager);
                }
                case ApplicationCommandType.User:
                case ApplicationCommandType.Message: {
                    return await handleContexts(interaction, client, connection, stable_horde_manager);
                }
            }
        };
        case InteractionType.MessageComponent: {
			return await handleComponents(interaction, client, connection, stable_horde_manager);
        };
        case InteractionType.ApplicationCommandAutocomplete: {
			return await handleAutocomplete(interaction, client, connection, stable_horde_manager);
        };
        case InteractionType.ModalSubmit: {
			return await handleModals(interaction, client, connection, stable_horde_manager);
        };
    }
})