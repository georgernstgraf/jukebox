import { trackService } from "./service/track.service.js";

async function main(): Promise<void> {
    await trackService.verifyAllTracks();
}

main()
    .then(() => console.log("File reading process completed successfully."))
    .catch((err) => {
        console.warn("An unhandled error occurred during file reading:");
        console.error(err);
    });
