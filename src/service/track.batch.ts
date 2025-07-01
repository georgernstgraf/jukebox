import { TrackService, trackService } from "../service/track.service.js";

export class TrackBatch {
    maxBatchSize: number;
    insertedSofar: number = 0;
    receivedSofar: number = 0;
    pendingTracks: Set<string>;
    service: TrackService;

    constructor(batchSize: number = 1000) {
        this.maxBatchSize = batchSize;
        this.pendingTracks = new Set<string>();
        this.insertedSofar = 0;
        this.receivedSofar = 0;
        this.service = trackService;
    }

    async insert(track: string): Promise<void> {
        this.receivedSofar++;
        this.pendingTracks.add(track);
        if (this.pendingTracks.size >= this.maxBatchSize) {
            await this.commitPending();
        }
    }
    async commitPending(): Promise<void> {
        process.stdout.write(".");
        this.insertedSofar += await trackService.safeAddMultiplePaths(
            this.pendingTracks,
        );
        console.log(
            `Inserted a Batch of ${this.pendingTracks.size}. Total RECV/INS: ${this.receivedSofar}/${this.insertedSofar}.`,
        );
        this.pendingTracks.clear();
    }
}
