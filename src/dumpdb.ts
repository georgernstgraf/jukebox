import { trackService } from "./service/track.service.js";

(await trackService.getAllPaths()).forEach((path) => {
    console.log(path);
});
