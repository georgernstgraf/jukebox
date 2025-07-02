import { access, readFile, stat } from "fs/promises";
import { constants, Stats } from "fs";
import { createHash } from "crypto";
import * as ft from "file-type";
import * as mmt from "music-metadata";

export async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export async function fileStat(path: string): Promise<Stats> {
    const stats = await stat(path);
    return stats;
}

export async function fileSha256(path: string): Promise<string> {
    const hash = createHash("sha256");
    const fileBuffer = await readFile(path);
    hash.update(fileBuffer);
    return hash.digest("hex");
}

export async function fileMimeType(
    path: string,
): Promise<{ ext: string; mimeType: string } | null> {
    const mime = await ft.fileTypeFromFile(path);
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
