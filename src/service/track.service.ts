import type { ITrackRepository } from "../repo/track.repo";
import { trackRepo } from "../repo/track.repo.js";
import {
    bufferMimeType,
    fileSha256,
    fileStat,
    fileTags,
    getBuffer,
} from "../helpers.js";
import { stat } from "fs";
export class TrackService {
    constructor(private readonly repo: ITrackRepository) {
    }

    async getUnverified(take: number = 108) {
        return await this.repo.findUnverifiedIds(take);
    }

    async safeAddMultiplePaths(paths: Set<string>): Promise<number> {
        const existing = new Set(
            (await this.repo.findByPaths(paths)).map((track) => track.path),
        );
        const pendingTracks = paths.difference(existing);
        if (pendingTracks.size === 0) {
            return 0;
        }
        return await this.repo.createPaths(pendingTracks);
    }

    async setAllInodesNull() {
        return await this.repo.setAllInodesNull();
    }
    async verifyAllTracks() {
        while (true) {
            const unverifiedIds = await this.repo.findUnverifiedIds();
            if (unverifiedIds.length === 0) {
                console.log(
                    "verifyAllTracks(): No unverified tracks left in the database.",
                );
                break;
            }
            for (const id of unverifiedIds) {
                await this.verifyTrack(id);
            }
        }
    }
    // make the db record as complete as possible
    async verifyTrack(id: string) {
        // verifiedAt OR inode can be null
        const track = await this.repo.getById(id);

        // will not really happen. Throw here because it will be an alert
        // for something very corrupt
        if (!track) {
            throw new Error(`Track with id ${id} not found`);
        }

        // stats cannot be done: bail out and delete
        const trackStat = await fileStat(track.path); //  mtime, size, ino, ...
        if (!trackStat?.isFile()) {
            console.warn(
                `Found a non-file (${track.path}). deleting it. REBUILD YOUR INFILE!!!`,
            );
            return await this.repo.delete(track.id);
        }

        const verificationIsNewerThanFile = track.verifiedAt &&
            (track.verifiedAt.getTime() > trackStat.mtimeMs);

        let needSave = false;
        // see if all the stat.* members are already there
        if (track.inode !== trackStat.ino) {
            track.inode = trackStat.ino;
            needSave = true;
        }
        if (track.sizeBytes !== trackStat.size) {
            track.sizeBytes = trackStat.size;
            needSave = true;
        }
        if (verificationIsNewerThanFile) {  // we only get here if inode was unset
            if (needSave) {
                console.log(`Saving (${track.path.substring(track.path.length - 54)}): only inode and size`);
                return await this.repo.update(track);
            }
            return undefined;
        }
        // STATE of affairs here: the verification is NULL OR file changed on disk
        // File cannot be read: delete from db it and return
        // VERY EXPENSIVE
        console.log(`Starting hard work for (${track.path.substring(track.path.length - 54)})`);
        const buffer = await getBuffer(track.path);
        if (!buffer) {
            await this.repo.delete(track.id);
            console.info(
                `${track.path} cannot get buffer, deleted from database.`,
            );
            return;
        }

        track.sizeBytes = trackStat.size;
        track.inode = trackStat.ino;
        track.sha256 = await fileSha256(buffer);
        track.verifiedAt = new Date();
        Object.assign(track, await bufferMimeType(buffer, track.path)); // ext/mimeType
        let _logtags = "not audio";
        // care for tags only if audio file
        if (track.mimeType?.startsWith("audio/")) {
            _logtags = "audio: ";
            const tags = await fileTags(track.path);
            if (tags) {
                track.artist = tags.common?.artist ?? null;
                track.album = tags.common?.album ?? null;
                track.title = tags.common?.title ?? null;
                track.year = tags.common?.year ?? null;
                track.trackNo = tags.common?.track?.no ?? null;
                _logtags += "tagged";
            } else {
                _logtags += "untagged";
                console.warn(`tagtool --fix "${track.path}"`);
            }
        }
        // Pass track to the repository for saving
        await this.repo.update(track);
        const shortName = track.path.split("/").slice(-3).join("/");
        console.info(
            `File ${shortName} (${_logtags}) verified and updated in the database.`,
        );
    }
    async deleteTrack(id: string) {
        await this.repo.delete(id);
    }
    async getAllPaths() {
        return await this.repo.getAllPaths();
    }
}
export const trackService = new TrackService(trackRepo);
