import { prisma } from "../prisma.js";
export class PrismaTrackRepository {
    async findById(id) {
        return prisma.track.findUnique({ where: { id } });
    }
    async findUnverifiedIds(take = 108) {
        return (await prisma.track.findMany({
            select: { id: true },
            where: { verifiedAt: null },
            take,
        })).map((rec) => rec.id);
    }
    async findByPaths(paths) {
        return await prisma.track.findMany({
            where: {
                path: {
                    in: Array.from(paths),
                },
            },
        });
    }
    async createPaths(paths) {
        const tracks = Array.from(paths).map((path) => ({ path }));
        const result = await prisma.track.createMany({
            data: tracks,
        });
        return result.count; // Return the number of inserted records
    }
    async create(path) {
        return prisma.track.create({
            data: { path },
        });
    }
    async update(track) {
        return await prisma.track.update({
            where: { id: track.id },
            data: track,
        });
    }
    async delete(id) {
        await prisma.track.delete({ where: { id } });
    }
}
export const trackRepo = new PrismaTrackRepository();
