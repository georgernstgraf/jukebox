-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "ext" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "artist" TEXT,
    "album" TEXT,
    "title" TEXT,
    "year" TEXT,
    "trackNo" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_path_key" ON "Track"("path");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
