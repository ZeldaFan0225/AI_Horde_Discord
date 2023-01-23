import SuperMap from "@thunder04/supermap";
import { Command } from "../classes/command";
import { existsSync, readdirSync } from "fs"
import {
    AnySelectMenuInteraction,
    ApplicationCommandData,
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";
import {join} from "path"
import {StoreInitOptions, StoreTypes} from "../types";
import {Modal} from "../classes/modal";
import { Component } from "../classes/component";
import { Context } from "../classes/context";

export class Store <T extends StoreTypes> {
    files_folder: string
    loaded_classes: SuperMap<string, T extends StoreTypes.COMMANDS ? Command : T extends StoreTypes.COMPONENTS ? Component : T extends StoreTypes.CONTEXTS ? Context : Modal>
    storetype: StoreTypes
    constructor(options: StoreInitOptions) {
        this.files_folder = options.files_folder
        this.storetype = options.storetype
        this.loaded_classes = new SuperMap<string, T extends StoreTypes.COMMANDS ? Command : T extends StoreTypes.COMPONENTS ? Component : T extends StoreTypes.CONTEXTS ? Context : Modal>()
        if(options.load_classes_on_init && this.checkDirectory()) this.loadClasses().then(res => this.loaded_classes = res).catch(console.error)
    }

    checkDirectory() {
        return existsSync(join(__dirname, "../", this.files_folder))
    }

    async loadClasses(): Promise<SuperMap<string, T extends StoreTypes.COMMANDS ? Command : T extends StoreTypes.COMPONENTS ? Component : T extends StoreTypes.CONTEXTS ? Context : Modal>> {
        if(!this.files_folder) throw new Error("No location for commands given")
        if(!this.checkDirectory()) throw new Error("Unable to find location")
        const files = readdirSync(join(__dirname, "../", this.files_folder))
        const map = new SuperMap<string, T extends StoreTypes.COMMANDS ? Command : T extends StoreTypes.COMPONENTS ? Component : T extends StoreTypes.CONTEXTS ? Context : Modal>()
        for (let command_file of files) {
            const command = new (require(join(__dirname, "../", this.files_folder, command_file)).default)() as (T extends StoreTypes.COMMANDS ? Command : T extends StoreTypes.COMPONENTS ? Component : T extends StoreTypes.CONTEXTS ? Context : Modal)
            map.set(command.name.toLowerCase(), command)
        }
        this.loaded_classes = map
        console.log(`Loaded ${map.size} classes`)
        return map
    }

    createPostBody() {
        if(this.storetype !== StoreTypes.COMMANDS && this.storetype !== StoreTypes.CONTEXTS) return []
        const commands = (this.loaded_classes as SuperMap<string, Command>).map(c => c.commandData).filter(c => c)
        return commands as ApplicationCommandData[]
    }

    async getCommand(interaction: ChatInputCommandInteraction | AutocompleteInteraction): Promise<Command> {
        if(!this.loaded_classes.size) throw new Error("No commands loaded")
        if(this.storetype !== StoreTypes.COMMANDS) throw new Error("Wrong class type loaded")
        let command_name = interaction.commandName
        if(interaction.options.getSubcommandGroup(false)) command_name += `_${interaction.options.getSubcommandGroup()}`
        if(interaction.options.getSubcommand(false)) command_name += `_${interaction.options.getSubcommand()}`

        const command = this.loaded_classes.get(command_name)

        if(!command) throw new Error("Unable to find command")
        return command as Command
    }

    async getContext(interaction: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction): Promise<Context> {
        if(!this.loaded_classes.size) throw new Error("No commands loaded")
        if(this.storetype !== StoreTypes.CONTEXTS) throw new Error("Wrong class type loaded")
        let command_name = interaction.commandName.toLowerCase()
        const command = this.loaded_classes.get(command_name.toLowerCase())

        if(!command) throw new Error("Unable to find context")
        return command as Context
    }

    async getComponent(interaction: ButtonInteraction | AnySelectMenuInteraction): Promise<Component> {
        if(!this.loaded_classes.size) throw new Error("No commands loaded")
        if(this.storetype !== StoreTypes.COMPONENTS) throw new Error("Wrong class type loaded")

        const command = (this.loaded_classes as SuperMap<string, Component>).find(c => c.regex.test(interaction.customId))

        if(!command) throw new Error("Unable to find component")
        return command as Component
    }

    async getModal(interaction: ModalSubmitInteraction): Promise<Modal> {
        if(!this.loaded_classes.size) throw new Error("No commands loaded")
        if(this.storetype !== StoreTypes.MODALS) throw new Error("Wrong class type loaded")

        const command = (this.loaded_classes as SuperMap<string, Modal>).find(c => c.regex.test(interaction.customId))

        if(!command) throw new Error("Unable to find component")
        return command as Modal
    }
}