import { Track } from "@prisma/client";
import { prisma } from "../prisma.js";

export interface ITrackRepository {
    // CRUD is done here
    getById(id: string): Promise<Track | null>;
    findUnverifiedIds(take?: number): Promise<string[]>;
    create(
        path: string,
    ): Promise<Track>;
    update(track: Track): Promise<Track>;
    delete(id: string): Promise<void>;
    pathsFromSet(paths: Set<string>): Promise<Track[]>;
    createPaths(paths: Set<string>): Promise<number>;
    setAllInodesNull(): Promise<void>;
    getAllPaths(): Promise<string[]>;
    count(): Promise<number>;
    countAudio(): Promise<number>;
    countUnverified(): Promise<number>;
}

export class PrismaTrackRepository implements ITrackRepository {
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
    async getById(id: string): Promise<Track | null> {
        return prisma.track.findUnique({ where: { id } });
    }
    async findUnverifiedIds(take = 108) {
        return (await prisma.track.findMany({
            select: { id: true },
            where: { OR: [{ verifiedAt: null }, { inode: null }] },
            take,
        })).map((rec) => rec.id);
    }
    async pathsFromSet(paths: Set<string>) {
        return await prisma.track.findMany({
            where: {
                path: {
                    in: Array.from(paths),
                },
            },
        });
    }
    async setAllInodesNull(): Promise<void> {
        await prisma.track.updateMany({ data: { inode: null } });
    }

    async getAllPaths(): Promise<string[]> {
        return (await prisma.track.findMany({
            select: { path: true },
        })).map((track) => track.path);
    }

    async createPaths(paths: Set<string>): Promise<number> {
        const tracks = Array.from(paths).map((path) => ({ path }));
        const result = await prisma.track.createMany({
            data: tracks,
        });
        return result.count; // Return the number of inserted records
    }
    async count(): Promise<number> {
        return await prisma.track.count();
    }
    async countAudio(): Promise<number> {
        return await prisma.track.count({
            where: {
                mimeType: { startsWith: "audio/" },
            },
        });
    }
    async countUnverified(): Promise<number> {
        return await prisma.track.count({
            where: {
                OR: [{ verifiedAt: null }, { inode: null }],
            },
        });
    }
}
export const trackRepo = new PrismaTrackRepository();
