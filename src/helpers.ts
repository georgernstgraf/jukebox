import { access, readFile, stat } from "fs/promises";
import { constants } from "fs";
import { createHash } from "crypto";
import * as ft from "file-type";

export async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export async function fileSize(path: string): Promise<number> {
    const stats = await stat(path);
    return stats.size;
}

export async function fileSha256(path: string): Promise<string> {
    const hash = createHash("sha256");
    const fileBuffer = await readFile(path);
    hash.update(fileBuffer);
    return hash.digest("hex");
}

export async function fileMimeType(
    path: string,
): Promise<{ ext: string; mime: string } | null> {
    const mime = await ft.fileTypeFromFile(path);
    return mime ? { ext: mime.ext, mime: mime.mime } : null;
}
