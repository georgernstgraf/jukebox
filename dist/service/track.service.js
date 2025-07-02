import { trackRepo } from "../repo/track.repo.js";
import { fileExists, fileMimeType, fileSha256, fileStat, fileTags, } from "../helpers.js";
const MEDIA = ["audio", "video", "image"];
const VERIFY_MS = 1000 * 60 * 60 * 24 * 365; // 1 year
export class TrackService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async getUnverified(take = 108) {
        return await this.repo.findUnverifiedIds(take);
    }
    async safeAddMultiplePaths(paths) {
        const existing = new Set((await trackRepo.findByPaths(paths)).map((track) => track.path));
        const pendingTracks = paths.difference(existing);
        if (pendingTracks.size === 0) {
            return 0;
        }
        return await trackRepo.createPaths(pendingTracks);
    }
    async verifyAllTracks() {
        while (true) {
            const unverifiedIds = await trackRepo.findUnverifiedIds();
            if (unverifiedIds.length === 0) {
                console.log("verifyAllTracks(): No unverified tracks left in the database.");
                break;
            }
            for (const id of unverifiedIds) {
                await this.verifyTrack(id);
            }
        }
    }
    // make the db record as complete as possible
    async verifyTrack(id) {
        const track = await this.repo.findById(id);
        if (!track) {
            throw new Error(`Track with id ${id} not found`);
        }
        // id and path are set
        const artistAlbumTrack = track.path.split("/").slice(-3).join("/");
        // File is gone: delete it and return
        if (!await fileExists(track.path)) {
            await this.deleteTrack(track.id);
            console.info(`File ${track.path} does not exist, deleted from database.`);
            return;
        }
        // check file mod time and size
        const trackStat = await fileStat(track.path);
        // if our verification came after the file was modified, skip it
        if (track.verifiedAt && (track.verifiedAt.getTime() > trackStat.mtimeMs)) {
            return;
        }
        track.sizeBytes = trackStat.size;
        track.sha256 = await fileSha256(track.path);
        track.verifiedAt = new Date();
        Object.assign(track, await fileMimeType(track.path)); // ext and mimeType
        let _logtags = "not audio";
        // if audio file, care for tags
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
            }
            else {
                _logtags += "untagged";
                console.warn(`tagtool --fix "${track.path}"`);
            }
        }
        // Pass track to the repository for saving
        await this.repo.update(track);
        console.info(`File ${artistAlbumTrack} (${_logtags}) verified and updated in the database.`);
    }
    async deleteTrack(id) {
        await this.repo.delete(id);
    }
}
export const trackService = new TrackService(trackRepo);
