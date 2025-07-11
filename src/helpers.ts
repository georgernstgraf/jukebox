import { access, readFile, stat } from "fs/promises";
import { constants, Stats } from "fs";
import { createHash } from "crypto";
import { Context, Next } from "hono";
import * as ft from "file-type";
import * as mmt from "music-metadata";

export async function getBuffer(path: string): Promise<Buffer | undefined> {
    try {
        await access(path, constants.F_OK | constants.O_RDONLY);
        return await readFile(path);
    } catch {
        return;
    }
}

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

export async function bufferMimeType(
    buffer: Buffer,
    path: string,
): Promise<{ ext: string; mimeType: string; } | null> {
    let mime = null;
    try {
        mime = await ft.fileTypeFromBuffer(buffer);
    } catch (error) {
        console.error(`Error while getting mimetype for: ${path}:`);
        console.error(error);
    }
    return mime ? { ext: mime.ext, mimeType: mime.mime } : null;
}
export async function fileTags(
    path: string,
): Promise<mmt.IAudioMetadata | null> {
    try {
        return await mmt.parseFile(path, { duration: true });
    } catch (error) {
        return null;
    }
}

export async function enforceAdmin(c: Context, next: Next) {
    if (!c.get("session").isAdmin()) {
        return c.text('Forbidden', 403);
    }
    await next();
}
