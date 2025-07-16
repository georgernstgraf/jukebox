import { access, readFile, stat } from "fs/promises";
import { constants, Stats } from "fs";
import { createHash } from "crypto";
import { Context, Next } from "hono";
import { render } from "./hbs.js";
import * as ft from "file-type";
import * as mmd from "music-metadata";


export async function fileStat(path: string): Promise<Stats | undefined> {
    try {
        return await stat(path);
    } catch {
        return;
    }
}

export async function fileSha256(fileBuffer: Buffer): Promise<string> {
    const hash = createHash("sha256");
    hash.update(fileBuffer);
    return hash.digest("hex");
}

export async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function bufferMimeType(
    buffer: Buffer,
): Promise<{ ext?: string; mimeType?: string; }> {
    let mime = await ft.fileTypeFromBuffer(buffer);
    if (!mime) {
        return {};
    }
    return { ext: mime.ext, mimeType: mime.mime };
}
export async function fileTags(
    buffer: Buffer,
    mimeType: mmd.IFileInfo
): Promise<mmd.IAudioMetadata> {
    return await mmd.parseBuffer(buffer, mimeType);
}

export async function enforceAdmin(c: Context, next: Next) {
    if (!c.get("session").isAdmin()) {
        return c.html(render("error", {
            message: `Login first`,
        }), 401);
    }
    await next();
}
export async function enforceUser(c: Context, next: Next) {
    if (!c.get("session").username) {
        return c.html(render("error", {
            message: `Login first`,
        }), 401);
    }
    await next();
}
