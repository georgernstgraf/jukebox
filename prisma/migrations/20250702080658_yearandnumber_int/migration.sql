/*
  Warnings:

  - You are about to alter the column `trackNo` on the `Track` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `year` on the `Track` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "verifiedAt" DATETIME,
    "isMedia" BOOLEAN,
    "ext" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "artist" TEXT,
    "album" TEXT,
    "title" TEXT,
    "year" INTEGER,
    "trackNo" INTEGER
);
INSERT INTO "new_Track" ("album", "artist", "ext", "id", "isMedia", "mimeType", "path", "sha256", "sizeBytes", "title", "trackNo", "verifiedAt", "year") SELECT "album", "artist", "ext", "id", "isMedia", "mimeType", "path", "sha256", "sizeBytes", "title", "trackNo", "verifiedAt", "year" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_path_key" ON "Track"("path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
