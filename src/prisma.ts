import { PrismaClient } from "@prisma/client";
import { config } from "./env.js";
const prisma = new PrismaClient().$extends({
    name: 'hasId3-extension',
    result: {
        track: {
            hasId3: {
                needs: { artist: true, album: true, title: true },
                compute(track) {
                    return !!(track.artist && track.album && track.title);
                },
            },
        },
    },
});
try {
    const result = await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = ${config.dbTimeout};`);
    console.log(`SQLite busy_timeout set to ${config.dbTimeout}ms. (${result})`);
} catch (error) {
    console.error("Error setting busy_timeout:", error);
}
export { prisma };
