import { trackRepo } from "../repo/track.repo.js";
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
                console.log("No unverified tracks in the database.");
                break;
            }
            for (const id of unverifiedIds) {
                await this.verifyTrack(id);
            }
        }
    }
    async verifyTrack(id) {
        const track = await this.repo.findById(id);
        if (!track) {
            throw new Error(`Track with id ${id} not found`);
        }
    }
    async deleteTrack(id) {
        await this.repo.delete(id);
    }
}
export const trackService = new TrackService(trackRepo);
