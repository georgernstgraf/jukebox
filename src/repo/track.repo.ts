import { Track } from "@prisma/client";
import { prisma } from "../prisma.js";

export interface ITrackRepository {
    // CRUD is done here
    findById(id: string): Promise<Track | null>;
    findUnverifiedIds(take?: number): Promise<string[]>;
    create(
        path: string,
    ): Promise<Track>;
    update(track: Track): Promise<Track>;
    delete(id: string): Promise<void>;
}

export class PrismaTrackRepository implements ITrackRepository {
    async findById(id: string): Promise<Track | null> {
        return prisma.track.findUnique({ where: { id } });
    }
    async findUnverifiedIds(take: number = 108): Promise<string[]> {
        return (await prisma.track.findMany({
            select: { id: true },
            where: { verifiedAt: null },
            take,
        })).map((rec) => rec.id);
    }
    async findByPaths(paths: Set<string>): Promise<Track[]> {
        return await prisma.track.findMany({
            where: {
                path: {
                    in: Array.from(paths),
                },
            },
        });
    }
    async createPaths(paths: Set<string>): Promise<number> {
        const tracks = Array.from(paths).map((path) => ({ path }));
        const result = await prisma.track.createMany({
            data: tracks,
        });
        return result.count; // Return the number of inserted records
    }

    async create(path: string) {
        return prisma.track.create({
            data: { path },
        });
    }
    async update(track: Track) {
        return await prisma.track.update({
            where: { id: track.id },
            data: track,
        });
    }
    async delete(id: string) {
        await prisma.track.delete({ where: { id } });
    }
}
export const trackRepo = new PrismaTrackRepository();
