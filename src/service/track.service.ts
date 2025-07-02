import type { ITrackRepository } from "../repo/track.repo";
import { trackRepo } from "../repo/track.repo.js";
import { fileExists, fileMimeType, fileSha256, fileSize } from "../helpers.js";
const MEDIA = ["audio", "video", "image"];
export class TrackService {
    constructor(private readonly repo: ITrackRepository) {
    }

    async getUnverified(take: number = 108) {
        return await this.repo.findUnverifiedIds(take);
    }

    async safeAddMultiplePaths(paths: Set<string>): Promise<number> {
        const existing = new Set(
            (await trackRepo.findByPaths(paths)).map((track) => track.path),
        );
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
                console.log("No unverified tracks in the database.");
                break;
            }
            for (const id of unverifiedIds) {
                await this.verifyTrack(id);
            }
        }
    }
    // make the db record as complete as possible
    async verifyTrack(id: string) {
        const track = await this.repo.findById(id);
        if (!track) {
            throw new Error(`Track with id ${id} not found`);
        }
        /* --- id and path are always set ---
          ☑ verifiedAt DateTime?
          isMedia    Boolean?
          ext        String?
          mimetype   String?
          ☑ sizeBytes  Int?
          ☑ sha256     String?
          artist  String?
          album   String?
          title   String?
          year    String?
          trackNo String?
        */
        if (!fileExists(track.path)) {
            await this.deleteTrack(track.id);
            return;
        }
        // we can access it ..
        track.sizeBytes = await fileSize(track.path);
        track.sha256 = await fileSha256(track.path);
        track.verifiedAt = new Date();
        Object.assign(track, await fileMimeType(track.path));
        track.isMedia = MEDIA.includes(track.mimeType?.split("/")[0] ?? "");
        // Pass track to the repository for saving
        await this.repo.update(track);
    }
    async deleteTrack(id: string) {
        await this.repo.delete(id);
    }
}
export const trackService = new TrackService(trackRepo);
