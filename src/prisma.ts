import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
let timeout = Number.parseInt(
    process.env.DB_TIMEOUT ? process.env.DB_TIMEOUT : "21000",
);
try {
    await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = ${timeout};`);
    console.log(`SQLite busy_timeout set to ${timeout}ms`);
} catch (error) {
    console.error("Error setting busy_timeout:", error);
}
