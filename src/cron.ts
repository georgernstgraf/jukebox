import { createReadStream } from "fs";
import readline from "readline";
import { TrackBatch } from "./service/track.batch.js";
import { trackService } from "./service/track.service.js";

// holy crap typescript following:
let _batchsize: string | number | undefined = process.env.BATCHSIZE;
if (!_batchsize) _batchsize = "";
_batchsize = Number.parseInt(_batchsize);
if (isNaN(_batchsize)) _batchsize = 1024;
// but now
const BATCHSIZE = _batchsize;

async function main(filePath: string): Promise<void> {
    await processListingFile(filePath);
    //await trackService.setAllInodesNull();
    //await trackService.verifyAllTracks();
}

async function processListingFile(filePath: string): Promise<void> {
    const fileStream = createReadStream(filePath, { encoding: "utf8" });
    const rl: readline.Interface = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity, // Treat CRLF as a single line break
    });
    const batch = new TrackBatch(BATCHSIZE);
    for await (const line of rl) {
        await batch.insert(line.trim());
    }
    await batch.commitPending();
}

const myFilePath: string = process.argv[2];
console.log(`Starting to read file: ${myFilePath}\n`);
main(myFilePath)
    .then(() => console.log("File reading process completed successfully."))
    .catch((err) => {
        console.warn("An unhandled error occurred during file reading:");
        console.error(err);
    });
