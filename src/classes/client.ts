import SuperMap from "@thunder04/supermap";
import { ChannelType, Client, ClientOptions, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { readFileSync } from "fs";
import { Store } from "../stores/store";
import { Config, Party, StoreTypes } from "../types";
import {existsSync, mkdirSync, writeFileSync} from "fs"
import { Pool } from "pg";
import crypto from "crypto"
import Centra from "centra";

export class StableHordeClient extends Client {
	commands: Store<StoreTypes.COMMANDS>;
	components: Store<StoreTypes.COMPONENTS>;
	contexts: Store<StoreTypes.CONTEXTS>;
	modals: Store<StoreTypes.MODALS>;
    config: Config
	cache: SuperMap<string, any>
	timeout_users: SuperMap<string, any>
	security_key?: Buffer
	bot_version: string
	horde_styles: Record<string, {
		prompt: string,
		model?: string,
		sampler_name?: string,
		width?: number,
		height?: number
	}>

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
		const source = this.config.generate?.styles_source ?? `https://raw.githubusercontent.com/db0/Stable-Horde-Styles/main/styles.json`
		const req = Centra(source, "GET")
		const raw = await req.send()
		if(!raw.statusCode?.toString().startsWith("2")) throw new Error("Unable to fetch styles");
		const res = await raw.json()
		this.horde_styles = res
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

	checkGuildPermissions(id: string | null | undefined, action: "apply_roles_to_trusted_users" | "apply_roles_to_worker_owners" | "react_to_transfer"): boolean {
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

	async cleanUpParties(database?: Pool) {
		const expired_parties = await database?.query("DELETE FROM parties WHERE ends_at <= CURRENT_TIMESTAMP RETURNING *").catch(console.error)
		if(!expired_parties?.rowCount) return;
		for(let party of expired_parties.rows) {
			const channel = await this.channels.fetch(party.channel_id).catch(console.error)
			if(!channel?.id || channel?.type !== ChannelType.PublicThread) continue;
			await channel?.send({content: `This party ended.\n${party.users?.length} users participated.\nThanks to <@${party.creator_id}> for hosting this party`})
		}
	}
}
