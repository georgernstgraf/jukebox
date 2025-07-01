import type { ITrackRepository } from "../repo/track.repo";
import { trackRepo } from "../repo/track.repo.js";
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
    async verifyTrack(id: string) {
        const track = await this.repo.findById(id);
        if (!track) {
            throw new Error(`Track with id ${id} not found`);
        }
    }
    async deleteTrack(id: string) {
        await this.repo.delete(id);
    }
}
export const trackService = new TrackService(trackRepo);
