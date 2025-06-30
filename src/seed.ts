import { createReadStream, writeFileSync } from "fs";
import { createInterface, Interface } from "readline";
import { prisma } from "./prismaClient";
import { Batch } from "./batch";

const BATCHSIZE = 1000;

const batch = new Batch(BATCHSIZE);

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

    rl.on("line", async (line: string) => {
        await batch.insert(line.trim());
        lineCount++;
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

const myFilePath: string = process.argv[2];
console.log(`Starting to read file: ${myFilePath}\n`);
readLinesFromFile(myFilePath)
    .then(() => console.log("File reading process completed successfully."))
    .catch((err) => {
        console.warn("An unhandled error occurred during file reading:");
        console.error(err);
    });
