import { createReadStream, writeFileSync } from "fs";
import { createInterface, Interface } from "readline";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BATCHSIZE = 1000;
/**
 * @param {string} filePath The path to the file to read.
 * @returns {Promise<void>} A promise that resolves when the file has been fully read.
 */
async function readLinesFromFile(filePath: string): Promise<void> {
    let lineCount: number = 0;
    const fileStream = createReadStream(filePath, { encoding: "utf8" });
    const rl: Interface = createInterface({
        input: fileStream,
        crlfDelay: Infinity, // Treat CRLF as a single line break
    });

    rl.on("line", (line: string) => {
        lineCount++;
        console.log(`Line ${lineCount}: ${line}`);
    });

    rl.on("error", (err: Error) => {
        console.error(`Error reading file '${filePath}': ${err.message}`);
    });

    rl.on("close", () => {
        console.log(
            `\nFinished reading ${lineCount} lines from '${filePath}'`,
        );
    });

    await new Promise<void>((resolve) => {
        rl.on("close", resolve);
    });
}

async function* insert(track: string): AsyncGenerator<void> {
    const newTracks = new Set<string>();
    while (track) {
        newTracks.add(track);
        if (newTracks.size >= BATCHSIZE) {
            console.log(`Inserting batch of ${newTracks.size} tracks...`);
            await createTracksBatch(newTracks);
            newTracks.clear();
        }
        yield;
    }
    if (newTracks.size > 0) {
        console.log(`Inserting final batch of ${newTracks.size} tracks...`);
        await createTracksBatch(newTracks);
    }
    return;
}
async function createTracksBatch(tracks: Set<string>): Promise<void> {
    const existing = await prisma.track.findMany({
        where: {
            path: {
                in: Array.from(tracks),
            },
        },
    });
    console.log(`Simulating insertion of ${tracks.size} tracks...`);
}
const myFilePath: string = process.argv[2];
console.log(`Starting to read file: ${myFilePath}\n`);
readLinesFromFile(myFilePath)
    .then(() => console.log("File reading process completed successfully."))
    .catch((err) => {
        console.warn("An unhandled error occurred during file reading:");
        console.error(err);
    });
