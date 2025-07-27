import assert from "node:assert";
import { config } from "../config.js";
import { TrackService, trackService } from "../service/track.service.js";

export class TrackBatch {
    maxBatchSize: number;
    insertedSofar: number = 0;
    receivedSofar: number = 0;
    pendingTracks: Set<string>;
    service: TrackService;

    constructor(batchSize: number = 1024) {
        this.maxBatchSize = batchSize;
        this.pendingTracks = new Set<string>();
        this.insertedSofar = 0;
        this.receivedSofar = 0;
        this.service = trackService;
    }

    async insert(track: string): Promise<void> {
        this.receivedSofar++;
        assert(!track.startsWith(config.musicDir));
        this.pendingTracks.add(track);
        if (this.pendingTracks.size >= this.maxBatchSize) {
            await this.commitPending();
        }
    }
    async commitPending(): Promise<void> {
        const addedNow = await trackService.safeAddMultiplePaths(
            this.pendingTracks,
        );
        this.insertedSofar += addedNow;
        console.log(
            `Commited a Batch (added ${addedNow} of ${this.pendingTracks.size} pcs). Total RECV/INS: ${this.receivedSofar}/${this.insertedSofar}.`,
        );
        this.pendingTracks.clear();
    }
}
