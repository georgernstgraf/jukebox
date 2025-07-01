import { createReadStream } from "fs";
import readline from "readline";
import { prisma } from "./prisma";
import { Batch } from "./Batch.js";

const BATCHSIZE = 1000;

async function processFile(filePath: string): Promise<void> {
    const batch = new Batch(BATCHSIZE);
    const fileStream = createReadStream(filePath, { encoding: "utf8" });
    const rl: readline.Interface = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity, // Treat CRLF as a single line break
    });
    for await (const line of rl) {
        await batch.insert(line.trim());
    }
    await batch.commitPending();
}

const myFilePath: string = process.argv[2];
console.log(`Starting to read file: ${myFilePath}\n`);
processFile(myFilePath)
    .then(() => console.log("File reading process completed successfully."))
    .catch((err) => {
        console.warn("An unhandled error occurred during file reading:");
        console.error(err);
    });
