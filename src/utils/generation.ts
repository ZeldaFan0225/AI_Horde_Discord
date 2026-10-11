import { ChannelType, TextBasedChannel } from "discord.js";
import { ModelGenerationInputPostProcessingTypes } from "@zeldafan0225/ai_horde";
import { ForcedNegativePrompt } from "../types";

type PostProcessor = typeof ModelGenerationInputPostProcessingTypes[keyof typeof ModelGenerationInputPostProcessingTypes]

export const FACE_FIXERS = ["GFPGAN", "GFPGANv1.3", "CodeFormers", "RestoreFormer"] as const satisfies readonly PostProcessor[]
export const UPSCALERS = [
    "RealESRGAN_x4plus",
    "RealESRGAN_x2plus",
    "RealESRGAN_x4plus_anime_6B",
    "NMKD_Siax",
    "4x_AnimeSharp",
    "4xNomos8kSC",
    "4xLSDIRplus",
    "4xNomosWebPhoto_RealPLKSR",
    "4xNomos2_realplksr_dysample",
    "4xNomos2_hq_dat2",
    "2xModernSpanimationV1"
] as const satisfies readonly PostProcessor[]

/** Value of the face_fixer/upscaler choice that explicitly disables it */
export const NO_POST_PROCESSOR = "none"

/**
 * Builds the post processing list from a face fixer and an upscaler selection.
 * Face fixing runs before upscaling, so the upscaler works on the fixed face.
 */
export function buildPostProcessing(face_fixer?: string | null, upscaler?: string | null): PostProcessor[] {
    const post_processing: PostProcessor[] = []
    if(face_fixer && (FACE_FIXERS as readonly string[]).includes(face_fixer)) post_processing.push(face_fixer as PostProcessor)
    if(upscaler && (UPSCALERS as readonly string[]).includes(upscaler)) post_processing.push(upscaler as PostProcessor)
    return post_processing
}

/**
 * Discord shows the autocomplete label in the input box, so users copy e.g. `Style: anime` or
 * `stable_diffusion | Workers: 3 | ...` into new commands. This turns such a label back into its value.
 */
export function parseAutocompleteValue(value: string | null | undefined): string | null {
    if(!value) return null
    return value.replace(/^\s*(style|category):\s*/i, "").split(" | ")[0]!.trim() || null
}

/** Whether the channel (or the parent of the thread) is marked as age restricted */
export function isNSFWChannel(channel: TextBasedChannel | null): boolean {
    if(!channel) return false
    if(channel.isThread()) return !!channel.parent && "nsfw" in channel.parent && !!channel.parent.nsfw
    if(channel.type === ChannelType.DM) return false
    return "nsfw" in channel && !!channel.nsfw
}

/**
 * Decides the nsfw and censor_nsfw flags of a request.
 * With channel_based_nsfw, NSFW is only possible in age restricted channels and censoring is enabled everywhere else.
 */
export function resolveNSFW(options: {
    channel: TextBasedChannel | null,
    allow_nsfw?: boolean,
    censor_nsfw?: boolean,
    channel_based_nsfw?: boolean,
    requested?: boolean | null
}): {nsfw: boolean, censor_nsfw: boolean} {
    if(!options.channel_based_nsfw) {
        return {
            nsfw: !!options.allow_nsfw && (options.requested ?? true),
            censor_nsfw: !!options.censor_nsfw
        }
    }
    const nsfw_channel = isNSFWChannel(options.channel)
    return {
        nsfw: !!options.allow_nsfw && nsfw_channel && (options.requested ?? true),
        censor_nsfw: !nsfw_channel
    }
}

/**
 * Applies the configured negative prompt.
 * 'force' always prepends it to the users negative prompt, 'replaceable' is only used when the user gave none.
 */
export function applyForcedNegativePrompt(negative_prompt: string, forced?: ForcedNegativePrompt): string {
    if(!forced?.prompt) return negative_prompt
    if(forced.mode === "replaceable") return negative_prompt || forced.prompt
    return negative_prompt ? `${forced.prompt}, ${negative_prompt}` : forced.prompt
}

/**
 * Downloads a generated image. Cloudflare R2 links fail intermittently, so this retries with a backoff.
 * @returns The image or null if all attempts failed
 */
export async function downloadImage(url: string, attempts = 4): Promise<Buffer | null> {
    for(let attempt = 0; attempt < attempts; attempt++) {
        if(attempt) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempt - 1)))
        try {
            const res = await fetch(url, {signal: AbortSignal.timeout(30_000)})
            if(!res.ok) continue
            const body = Buffer.from(await res.arrayBuffer())
            if(body.length) return body
        } catch {
            // network error or timeout, try again
        }
    }
    return null
}

const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024

/**
 * Fetches a user supplied image URL.
 * Only http(s) is allowed, the size is capped and the response has to be an image.
 */
export async function fetchSourceImageURL(raw_url: string): Promise<{data: Buffer, content_type: string} | {error: string}> {
    let url: URL
    try {
        url = new URL(raw_url)
    } catch {
        return {error: "The source URL is not a valid URL"}
    }
    if(url.protocol !== "https:" && url.protocol !== "http:") return {error: "The source URL has to be a http(s) URL"}

    let res: Response
    try {
        res = await fetch(url, {signal: AbortSignal.timeout(15_000)})
    } catch {
        return {error: "Unable to download the image from the source URL"}
    }
    if(!res.ok) return {error: `Unable to download the image from the source URL (HTTP ${res.status})`}
    const content_type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? ""
    if(!content_type.startsWith("image/")) return {error: "The source URL does not point to an image"}
    if(Number(res.headers.get("content-length") ?? 0) > MAX_SOURCE_IMAGE_BYTES) return {error: "The image at the source URL is too large (max. 20MB)"}

    const data = Buffer.from(await res.arrayBuffer())
    if(data.length > MAX_SOURCE_IMAGE_BYTES) return {error: "The image at the source URL is too large (max. 20MB)"}
    return {data, content_type}
}

/** Reads the dimensions from a WebP file header (lossy, lossless and extended format) */
export function getWebPSize(data: Buffer): {width: number, height: number} | null {
    if(data.length < 30 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WEBP") return null
    const chunk = data.toString("ascii", 12, 16)
    if(chunk === "VP8X") {
        return {width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1}
    }
    if(chunk === "VP8L") {
        const bits = data.readUInt32LE(21)
        return {width: (bits & 0x3FFF) + 1, height: ((bits >> 14) & 0x3FFF) + 1}
    }
    if(chunk === "VP8 ") {
        return {width: data.readUInt16LE(26) & 0x3FFF, height: data.readUInt16LE(28) & 0x3FFF}
    }
    return null
}
