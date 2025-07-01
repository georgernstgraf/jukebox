import * as ft from "file-type";
const path = process.argv[2];
// print out the file type of the file at path including the mime-type and extension
ft.fileTypeFromFile(path)
    .then((result) => {
        if (result) {
            console.log(`File type: ${result.mime}, Extension: ${result.ext}`);
        } else {
            console.log("Could not determine file type.");
        }
    })
    .catch((err) => {
        console.error("Error determining file type:", err);
    });
// Note: This script requires the 'file-type' package to be installed.
