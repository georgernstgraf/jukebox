import { prisma } from "./prisma.js";
export class Batch {
    maxBatchSize: number;
    insertedSofar: number = 0;
    receivedSofar: number = 0;
    pendingTracks: Set<string>;

    constructor(batchSize: number = 1000) {
        this.maxBatchSize = batchSize;
        this.pendingTracks = new Set<string>();
        this.insertedSofar = 0;
        this.receivedSofar = 0;
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
        const existing = new Set((await prisma.track.findMany({
            where: {
                path: {
                    in: Array.from(this.pendingTracks),
                },
            },
        })).map((track) => track.path));
        this.pendingTracks = this.pendingTracks.difference(existing);
        if (this.pendingTracks.size === 0) {
            return;
        }
        await prisma.track.createMany({
            data: Array.from(this.pendingTracks).map((path) => ({ path })),
        });
        this.insertedSofar += this.pendingTracks.size;
        console.log(
            `Inserted a Batch of ${this.pendingTracks.size}. Total RECV/INS: ${this.receivedSofar}/${this.insertedSofar}.`,
        );
        this.pendingTracks.clear();
    }
}
