import { prisma } from "./prisma.js";
export class Batch {
    batchSize: number;
    currentBatch: Set<string>;
    pendingTracks: Set<string>;
    constructor(batchSize: number = 1000) {
        this.batchSize = batchSize;
        this.currentBatch = new Set<string>();
        this.pendingTracks = new Set<string>();
    }

    async insert(track: string): Promise<void> {
        this.pendingTracks.add(track);
        if (this.pendingTracks.size >= this.batchSize) {
            console.log(
                `Inserting batch of ${this.pendingTracks.size} tracks...`,
            );
            await this.createTracksBatch();
            this.pendingTracks.clear();
        }
    }
    async createTracksBatch(): Promise<void> {
        const existing = new Set((await prisma.track.findMany({
            where: {
                path: {
                    in: Array.from(this.pendingTracks),
                },
            },
        })).map((track) => track.path));
        const insertTracks = this.pendingTracks.difference(existing);
        if (insertTracks.size === 0) {
            return;
        }
        console.log(`Inserting ${insertTracks.size} new tracks...`);
        await prisma.track.createMany({
            data: Array.from(insertTracks).map((path) => ({ path })),
        });
    }
}
