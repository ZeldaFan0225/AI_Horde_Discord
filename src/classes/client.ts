import SuperMap from "@thunder04/supermap";
import { ChannelType, Client, ClientOptions, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { readFileSync } from "fs";
import { Store } from "../stores/store";
import { Config, HordeStyleData, LORAData, LORAFetchResponse, Party, StoreTypes } from "../types";
import {existsSync, mkdirSync, writeFileSync} from "fs"
import { Pool } from "pg";
import crypto from "crypto"
import { AIHorde, SharedKeyDetails } from "@zeldafan0225/ai_horde";

export class AIHordeClient extends Client {
	commands: Store<StoreTypes.COMMANDS>;
	components: Store<StoreTypes.COMPONENTS>;
	contexts: Store<StoreTypes.CONTEXTS>;
	modals: Store<StoreTypes.MODALS>;
    config: Config
	cache: SuperMap<string, any>
	timeout_users: SuperMap<string, any>
	security_key?: Buffer
	bot_version: string
	horde_styles: Record<string, HordeStyleData>
	horde_style_categories: Record<string, string[]>
	horde_curated_loras: Array<number>

	constructor(options: ClientOptions) {
		super(options);
		this.commands = new Store<StoreTypes.COMMANDS>({files_folder: "/commands", load_classes_on_init: false, storetype: StoreTypes.COMMANDS});
		this.components = new Store<StoreTypes.COMPONENTS>({files_folder: "/components", load_classes_on_init: false, storetype: StoreTypes.COMPONENTS});
		this.contexts = new Store<StoreTypes.CONTEXTS>({files_folder: "/contexts", load_classes_on_init: false, storetype: StoreTypes.CONTEXTS});
		this.modals = new Store<StoreTypes.MODALS>({files_folder: "/modals", load_classes_on_init: false, storetype: StoreTypes.MODALS});
        this.config = {}
		this.cache = new SuperMap({
			intervalTime: 1000
		})
		this.timeout_users = new SuperMap({
			intervalTime: 1000
		})
        this.loadConfig()
		this.security_key = this.config.advanced?.encrypt_token ? Buffer.from(process.env["ENCRYPTION_KEY"] || "", "hex") : undefined

		this.bot_version = JSON.parse(readFileSync("./package.json", "utf-8")).version

		this.horde_styles = {}
		this.horde_style_categories = {}
		this.horde_curated_loras = []
	}

	getNeededPermissions(guild_id: string) {
		const permission = this.checkGuildPermissions(guild_id, "apply_roles_to_trusted_users") || this.checkGuildPermissions(guild_id, "apply_roles_to_worker_owners")
		const bitfield = new PermissionsBitField(
			PermissionFlagsBits.ViewChannel |
			PermissionFlagsBits.SendMessages |
			PermissionFlagsBits.AttachFiles |
			PermissionFlagsBits.EmbedLinks |
			PermissionFlagsBits.UseExternalEmojis
		)
		if(this.config.party?.enabled) bitfield.add(PermissionFlagsBits.CreatePublicThreads | PermissionFlagsBits.ManageMessages)
		if(permission) bitfield.add(PermissionFlagsBits.ManageRoles)
		return bitfield
	}

    loadConfig() {
        const config = JSON.parse(readFileSync("./config.json").toString())
        this.config = config as Config
    }

	initLogDir() {
		const log_dir = this.config.logs?.directory ?? "/logs"
		if(!existsSync(`${process.cwd()}${log_dir}`)) {
			mkdirSync("./logs")
		}
		if(this.config.logs?.plain && !existsSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth()+1}-${new Date().getFullYear()}.txt`)) {
			writeFileSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth()+1}-${new Date().getFullYear()}.txt`, `Date                     | User ID              | Prompt ID                            | Image to Image | Prompt`, {flag: "a"})
		}
		if(this.config.logs?.csv && !existsSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth()+1}-${new Date().getFullYear()}.csv`)) {
			writeFileSync(`${process.cwd()}${log_dir}/logs_${new Date().getMonth()+1}-${new Date().getFullYear()}.csv`, `Date,User ID,Prompt ID,Image to Image,Prompt`, {flag: "a"})
		}
	}

	async loadHordeStyles() {
		const source = this.config.data_sources?.styles_source || `https://raw.githubusercontent.com/Haidra-Org/AI-Horde-Styles/main/styles.json`
		const req = await fetch(source)
		if(!req.status?.toString().startsWith("2")) throw new Error("Unable to fetch styles");
		const res = await req.json()
		this.horde_styles = res
	}

	async loadHordeStyleCategories() {
		const source = this.config.data_sources?.style_categories_source || `https://raw.githubusercontent.com/Haidra-Org/AI-Horde-Styles/main/categories.json`
		const req = await fetch(source)
		if(!req.status?.toString().startsWith("2")) throw new Error("Unable to fetch style categories");
		const res = await req.json()
		this.horde_style_categories = res
	}

	async loadHordeCuratedLORAs() {
		const source = this.config.data_sources?.curated_loras_source || `https://raw.githubusercontent.com/Haidra-Org/AI-Horde-image-model-reference/main/lora.json`
		const req = await fetch(source)
		if(!req.status?.toString().startsWith("2")) throw new Error("Unable to fetch curated LORAs");
		const res = await req.json()
		this.horde_curated_loras = res
	}

	getHordeStyle(input: string, search_order: ("style" | "category")[] = ["style", "category"]): HordeStyleData & {name: string, type: "style" | "category-style"} | null {
		let result: HordeStyleData & {name: string, type: "style" | "category-style"} | null = null;
		for(let search of search_order) {
			if(search === "style") {
				const temp = this.horde_styles[input.toLowerCase()]
				if(temp) {
					result = {...temp, name: input.toLowerCase(), type: "style"}
				}
			} else if(search === "category") {
				const category_styles = this.horde_style_categories[input.toLowerCase()] || []
				const randomstyle = randomizeArray(category_styles)[0]
				if(!randomstyle) return null;
				const temp = this.horde_styles[randomstyle.toLowerCase()]
				if(temp) {
					result = {...temp, name: randomstyle.toLowerCase(), type: "category-style"}
				}
			}
			if(result) break;
		}

		return result || null
	}

	async getSlashCommandTag(name: string) {
		const commands = await this.application?.commands.fetch()
		if(!commands?.size) return `/${name}`
		else if(commands?.find(c => c.name === name)?.id) return `</${name}:${commands?.find(c => c.name === name)!.id}>`
		else return `/${name}`
	}
	
    async getUserToken(user_id: string, database: Pool | undefined): Promise<string|undefined> {
		if(!database) return undefined;
        const rows = await database.query("SELECT * FROM user_tokens WHERE id=$1", [user_id])
        if(!rows.rowCount || !rows.rows[0]) return undefined
		const token = this.config.advanced?.encrypt_token ? this.decryptString(rows.rows[0].token) : rows.rows[0].token
        return token
    }

	decryptString(hash: string){
		if(!hash.includes(":")) return hash
		if(!this.security_key) return undefined;
		const iv = Buffer.from(hash.split(':')[1]!, 'hex');
		const encryptedText =  Buffer.from(hash.split(':')[0]!, "hex");
		const decipher = crypto.createDecipheriv('aes-256-ctr', this.security_key, iv);
		const decrpyted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
		return decrpyted.toString("utf-8");
	};

	encryptString(text: string){
		if(!this.security_key) return undefined;
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv('aes-256-ctr', this.security_key, iv);
		const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
		return encrypted.toString('hex') + ":" + iv.toString('hex');
	};

	checkGuildPermissions(id: string | null | undefined, action: "apply_roles_to_trusted_users" | "apply_roles_to_worker_owners" | "react_to_transfer" | "apply_roles_to_logged_in_users"): boolean {
		if(!id) return false;
		if(!this.config.filter_actions?.mode) return false
		if(this.config.filter_actions.mode === "blacklist") {
			if(!!this.config.filter_actions.apply_filter_to?.[action]) return !this.config.filter_actions.guilds?.includes(id)
			else return true
		}
		if(this.config.filter_actions.mode === "whitelist") {
			if(!!this.config.filter_actions.apply_filter_to?.[action]) return !!this.config.filter_actions.guilds?.includes(id)
			else return false
		}
		return false
	}

	async getParty(id: string, database?: Pool): Promise<Party | undefined> {
		if(this.cache.has(`party-${id}`)) return this.cache.get(`party-${id}`)
		const p = await database?.query("SELECT * FROM parties WHERE channel_id=$1", [id])
		if(!p?.rowCount) return undefined
		this.cache.set(`party-${id}`, 1000 * 60 * 20)
		return p.rows[0]!
	}

	async cleanUpParties(ai_horde_manager: AIHorde, database?: Pool) {
		const expired_parties = await database?.query("DELETE FROM parties WHERE ends_at <= CURRENT_TIMESTAMP RETURNING *").catch(console.error)
		if(!expired_parties?.rowCount) return;
		for(let party of expired_parties.rows) {
			const channel = await this.channels.fetch(party.channel_id).catch(console.error)
			if(!channel?.id || channel?.type !== ChannelType.PublicThread) continue;
			let usagestats: SharedKeyDetails = {}
			if(party.shared_key) {
				const usertoken = await this.getUserToken(party.creator_id, database)
				usagestats = await ai_horde_manager.getSharedKey(party.shared_key, {token: usertoken}).catch(console.error) || {}
	
				await ai_horde_manager.deleteSharedKey(party.shared_key, {token: usertoken}).catch(console.error)
			}
			await channel?.send({content: `This party ended.\n${party.users?.length} users participated.${usagestats?.utilized ? `\n${usagestats.utilized} kudos have been spent by <@${party.creator_id}> only for generations in this party` : ""}\nThanks to <@${party.creator_id}> for hosting this party`})
			
		}
	}

	async fetchLORAs(query: string, amount: number, nsfw: boolean = false) {
		const res: LORAFetchResponse = await fetch(`https://civitai.com/api/v1/models?types=LORA&limit=${amount}&nsfw=${nsfw}&query=${encodeURIComponent(query)}`, {
			method: "GET",
			headers: {
				"User-Agent": `ZeldaFan-Discord-Bot:${this.bot_version}:https://github.com/ZeldaFan0225/AI_Horde_Discord`
			}
		}).then(res => res.json())

		if(this.config.advanced?.dev) console.log(res)

		return res
	}

	async fetchLORAByID(id: string, nsfw: boolean = false) {
		const res = await fetch(`https://civitai.com/api/v1/models/${id}`, {
			method: "GET",
			headers: {
				"User-Agent": `ZeldaFan-Discord-Bot:${this.bot_version}:https://github.com/ZeldaFan0225/AI_Horde_Discord`
			}
		})
		
		if(res.status === 404) return null
		const data: LORAData = await res.json()

		if(!nsfw && data.nsfw) return null

		if(this.config.advanced?.dev) console.log(data)

		return data
	}
}

function randomizeArray<T>(array: T[]): T[] {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex]!, array[currentIndex]!];
    }
    return array;
}
