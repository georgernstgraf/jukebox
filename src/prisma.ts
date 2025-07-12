import { PrismaClient } from "@prisma/client";
import { config } from "./env.js";
export const prisma = new PrismaClient();
try {
    const result = await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = ${config.dbTimeout};`);
    console.log(`SQLite busy_timeout set to ${config.dbTimeout}ms. (${result})`);
} catch (error) {
    console.error("Error setting busy_timeout:", error);
}
