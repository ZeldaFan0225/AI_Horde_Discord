import {CustomIDInitOptions} from "../types";
import {ModalContext} from "./modalContext";


export class Modal {
    name: string
    regex: RegExp
    constructor(options: CustomIDInitOptions) {
        this.name = options.name
        this.regex = options.regex ?? / /
    }

    async run(_context: ModalContext): Promise<any> {
        throw new Error("You need to override the base run method")
    }
}