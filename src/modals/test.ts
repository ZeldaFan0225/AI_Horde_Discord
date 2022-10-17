import { Modal } from "../classes/modal";
import { ModalContext } from "../classes/modalContext";


export default class extends Modal {
    constructor() {
        super({
            name: "test",
            staff_only: false,
            regex: /.+/
        })
    }

    override async run(ctx: ModalContext): Promise<any> {
        await ctx.interaction.reply({
            content: `Did something`,
            components: [],
            embeds: []
        })
    }
}