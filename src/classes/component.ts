import { ComponentType } from "discord.js"
import {CustomIDInitOptions} from "../types";
import {ComponentContext} from "./componentContext";

export class Component {
    name: string
    regex: RegExp
    constructor(options: CustomIDInitOptions) {
        this.name = options.name
        this.regex = options.regex
    }

    async run(_context: ComponentContext<ComponentType.Button | ComponentType.ChannelSelect | ComponentType.RoleSelect | ComponentType.MentionableSelect | ComponentType.StringSelect | ComponentType.UserSelect>): Promise<any> {
        throw new Error("You need to override the base run method")
    }
}