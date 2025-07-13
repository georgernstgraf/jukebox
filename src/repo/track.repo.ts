import { Track } from "@prisma/client";
import { prisma } from "../prisma.js";

export class PrismaTrackRepository /* implements ITrackRepository */ {
    async create(path: string) {
        return prisma.track.create({
            data: { path },
        });
    }
    async getById(id: string): Promise<Track | null> {
        return prisma.track.findUnique({ where: { id } });
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
    async deletePaths(paths: Set<string>): Promise<number> {
        const result = await prisma.track.deleteMany({
            where: {
                path: {
                    in: Array.from(paths),
                },
            },
        });
        return result.count;
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
    async searchTracks(artist: string, album: string, path: string): Promise<Track[]> {
        let where: any = {};
        if (artist) {
            where.artist = { contains: artist };
        }
        if (album) {
            where.album = { contains: album };
        }
        if (path) {  // ugly
            where = { path: { contains: path } };
        }
        console.log("trackrepo searchTracks() where:", where);
        return await prisma.track.findMany({
            where,
            orderBy: { path: "asc" },
        });
    }
}
export const trackRepo = new PrismaTrackRepository();
