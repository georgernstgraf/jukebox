/*
  Warnings:

  - You are about to alter the column `inode` on the `Track` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "verifiedAt" DATETIME,
    "ext" TEXT,
    "mimeType" TEXT,
    "sha256" TEXT,
    "sizeBytes" INTEGER,
    "inode" BIGINT,
    "artist" TEXT,
    "album" TEXT,
    "title" TEXT,
    "year" INTEGER,
    "trackNo" INTEGER
);
INSERT INTO "new_Track" ("album", "artist", "ext", "id", "inode", "mimeType", "path", "sha256", "sizeBytes", "title", "trackNo", "verifiedAt", "year") SELECT "album", "artist", "ext", "id", "inode", "mimeType", "path", "sha256", "sizeBytes", "title", "trackNo", "verifiedAt", "year" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_path_key" ON "Track"("path");
CREATE INDEX "Track_artist_idx" ON "Track"("artist");
CREATE INDEX "Track_mimeType_idx" ON "Track"("mimeType");
CREATE INDEX "Track_album_idx" ON "Track"("album");
CREATE INDEX "Track_sha256_idx" ON "Track"("sha256");
CREATE INDEX "Track_verifiedAt_idx" ON "Track"("verifiedAt");
CREATE INDEX "Track_inode_idx" ON "Track"("inode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
