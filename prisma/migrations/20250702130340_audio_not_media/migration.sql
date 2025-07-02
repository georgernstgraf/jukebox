/*
  Warnings:

  - You are about to drop the column `isMedia` on the `Track` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "verifiedAt" DATETIME,
    "isAudio" BOOLEAN,
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
INSERT INTO "new_Track" ("album", "artist", "ext", "id", "mimeType", "path", "sha256", "sizeBytes", "title", "trackNo", "verifiedAt", "year") SELECT "album", "artist", "ext", "id", "mimeType", "path", "sha256", "sizeBytes", "title", "trackNo", "verifiedAt", "year" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_path_key" ON "Track"("path");
CREATE INDEX "Track_artist_idx" ON "Track"("artist");
CREATE INDEX "Track_mimeType_idx" ON "Track"("mimeType");
CREATE INDEX "Track_album_idx" ON "Track"("album");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
