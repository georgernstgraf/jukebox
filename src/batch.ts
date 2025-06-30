import { prisma } from "./prismaClient";
export class Batch {
    batchSize: number;
    currentBatch: Set<string>;
    constructor(batchSize: number = 1000) {
        this.batchSize = batchSize;
        this.currentBatch = new Set<string>();
    }

    async *insert(track: string): AsyncGenerator<void> {
        const newTracks = new Set<string>();
        while (track) {
            newTracks.add(track);
            if (newTracks.size >= this.batchSize) {
                console.log(`Inserting batch of ${newTracks.size} tracks...`);
                await this.createTracksBatch(newTracks);
                newTracks.clear();
            }
            yield;
        }
        if (newTracks.size > 0) {
            console.log(`Inserting final batch of ${newTracks.size} tracks...`);
            await this.createTracksBatch(newTracks);
        }
        return;
    }
    async createTracksBatch(newTracks: Set<string>): Promise<void> {
        const existing = new Set((await prisma.track.findMany({
            where: {
                path: {
                    in: Array.from(newTracks),
                },
            },
        })).map((track) => track.path));
        const insertTracks = newTracks.difference(existing);
        if (insertTracks.size === 0) {
            return;
        }
        console.log(`Inserting ${insertTracks.size} new tracks...`);
        await prisma.track.createMany({
            data: Array.from(insertTracks).map((path) => ({ path })),
        });
    }
}
