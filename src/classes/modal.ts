import {CustomIDInitOptions} from "../types";
import {ModalContext} from "./modalContext";


export class Modal {
    name: string
    staff_only: boolean
    regex: RegExp
    constructor(options: CustomIDInitOptions) {
        this.name = options.name
        this.regex = options.regex ?? / /
        this.staff_only = options.staff_only ?? false
    }

    async run(_context: ModalContext): Promise<any> {
        throw new Error("You need to override the base run method")
    }
}