import { trackService } from "../service/track.service.js";
export class TrackBatch {
    maxBatchSize;
    insertedSofar = 0;
    receivedSofar = 0;
    pendingTracks;
    service;
    constructor(batchSize = 1000) {
        this.maxBatchSize = batchSize;
        this.pendingTracks = new Set();
        this.insertedSofar = 0;
        this.receivedSofar = 0;
        this.service = trackService;
    }
    async insert(track) {
        this.receivedSofar++;
        this.pendingTracks.add(track);
        if (this.pendingTracks.size >= this.maxBatchSize) {
            await this.commitPending();
        }
    }
    async commitPending() {
        process.stdout.write(".");
        this.insertedSofar += await trackService.safeAddMultiplePaths(this.pendingTracks);
        console.log(`Inserted a Batch of ${this.pendingTracks.size}. Total RECV/INS: ${this.receivedSofar}/${this.insertedSofar}.`);
        this.pendingTracks.clear();
    }
}
