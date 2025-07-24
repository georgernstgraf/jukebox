import { EventEmitter } from "events";
import * as assert from "assert";
import { trackRepo, PrismaTrackRepository } from "../repo/track.repo.js";
import { Track } from "@prisma/client";
import * as mmd from "music-metadata";
import {
    bufferMimeType,
    fileSha256,
    fileStat,
    fileTags,
    sleep
} from "../helpers.js";
import { config } from "../env.js";
import * as fs from 'fs/promises';
import * as  path from 'path';


export type trackStats = {
    total: number;
    audio: number;
    unverified: number;
};

export type jukeTags = {
    artist?: string;
    album?: string;
    title?: string;
    year?: number;
    trackNo?: number;
};

export type forceType = "basic" | "stats" | "all";

export class TrackService {
    constructor(private readonly repo: PrismaTrackRepository) {
    }

    async trackStats(): Promise<trackStats> {
        const [total, audio, unverified] = await Promise.all([
            this.repo.count(),
            this.repo.countAudio(),
            this.repo.countUnverified(),
        ]);
        return { total, audio, unverified };
    }

    async getUnverified() {
        return await this.repo.findUnverifiedIds();
    }

    async safeAddMultiplePaths(paths: Set<string>): Promise<number> {
        const existing = new Set(
            (await this.repo.pathsFromSet(paths)).map((track) => track.path),
        );
        const pendingTracks = paths.difference(existing);
        if (pendingTracks.size === 0) {
            return 0;
        }
        return await this.repo.createPaths(pendingTracks);
    }

    async setAllInodesNull() {
        return await this.repo.setAllInodesNull();
    }

    async SyncFromMusicDir(
        signal: AbortSignal,
        emitter: EventEmitter,
    ): Promise<boolean> {
        const musicDir = config.musicDir;
        const onDisk = await TrackService.getDiskFiles(musicDir);
        console.log(`On Disk first few of ${onDisk.size} files: ${Array.from(onDisk).toSorted().slice(0, 7)}`);
        if (signal.aborted) {
            emitter.emit('message', 'Sync cancelled after reading disk files');
            emitter.emit('cancelled');
            return false;
        }
        const inDB = await this.getDBFiles();
        console.log(`In DB first few of ${inDB.size} files: ${Array.from(inDB).toSorted().slice(0, 7)}`);
        if (signal.aborted) {
            emitter.emit('message', 'Sync cancelled after reading DB files');
            emitter.emit('cancelled');
            return false;
        }
        const toAdd = onDisk.difference(inDB);
        console.log(`To Add first few of ${toAdd.size} files: ${Array.from(toAdd).toSorted().slice(0, 7)}`);
        await this.safeAddMultiplePaths(toAdd);
        emitter.emit('message', `Found ${toAdd.size} new files to add`);
        if (signal.aborted) {
            emitter.emit('message', 'Sync cancelled after adding new files');
            emitter.emit('cancelled');
            return false;
        }
        const toDelete = inDB.difference(onDisk);
        console.log(`To Delete first few of ${toDelete.size} files: ${Array.from(toDelete).toSorted().slice(0, 7)}`);
        const reallyDeleted = await this.repo.deletePaths(toDelete);
        emitter.emit('message', `and ${toDelete.size} to delete from database`);
        return true;
    }

    async verifyAllTracks(force: forceType, signal: AbortSignal, emitter: EventEmitter) {
        if (!await this.SyncFromMusicDir(signal, emitter)) {
            emitter.emit('cancelled');
            return;
        }
        const verifyIds = (force === "basic") ? await this.repo.findUnverifiedIds() : await this.repo.findAllIds();
        for (const id of verifyIds) {
            if (signal.aborted) {
                emitter.emit('cancelled');
                return;
            }
            try {
                await this.verifyTrack(id, force === "all");
                emitter.emit('progress', 1);
            } catch (e) {
                emitter.emit('message', (e as Error).message);
            }
        }
        emitter.emit('message', `checked ${verifyIds.length} tracks, forced: ${force}`);
        emitter.emit('completed');
    }

    // make the db record as complete as possible
    async verifyTrack(id: string, force = false) {
        // no force will do the disk stats, and only if changed continue to
        // force the sha256, mimeType, ext and tags
        const track = await this.repo.getById(id);
        if (!track) {
            // I may throw here, it will go to emitter.message
            throw new Error(`Track with id ${id} not found`);
        }
        let changedOnDisk;
        try {
            changedOnDisk = await TrackService.hasChangedOnDisk_thenUpdateInoAndSize(track);
        } catch (e) {
            throw new Error(`Error checking if track ${track.path} changed on disk: ${(e as Error).message}`);
        }
        if (!changedOnDisk && !force) {
            return;
        }
        // correct inode and size are in track

        const shortName = track.path.split("/").slice(-3).join("/");
        console.log(`force (${force}) changed on disk (${changedOnDisk}): ${shortName}`);

        const buffer = await fs.readFile(track.path);

        assert.equal(track.sizeBytes, buffer.length,
            `Size mismatch (${track.path})
                : stats: ${track.sizeBytes}, but buffer ${buffer.length}`);

        track.sha256 = await fileSha256(buffer);

        Object.assign(track, await bufferMimeType(buffer, track.path)); // ext/mimeType

        // care for tags only if audio file
        if (track.mimeType?.startsWith("audio/")) {
            const tags = await TrackService.tagTrack(track, buffer);
            Object.assign(track, await TrackService.tagTrack(track, buffer));
        }

        // Pass track to the repository for saving
        track.verifiedAt = new Date();
        await this.repo.update(track);
        await sleep(21);  // give sqlite time to breathe
    }

    async deleteTrack(id: string) {
        await this.repo.delete(id);
    }
    async getAllPaths() {
        return await this.repo.getAllPaths();
    }

    async getTrackById(id: string) {
        return await this.repo.getById(id);
    }

    async searchTracks(artist: string, album: string, path: string) {
        if (!artist && !album && !path) {
            return [];
        }
        const results = await this.repo.searchTracks(artist, album, path);
        results.forEach((track) => {
            track.path = track.path.substring(config.musicDir.length + 1);
        });
        return results;
    }

    async getDBFiles(): Promise<Set<string>> {
        return new Set(await this.repo.getAllPaths());
    }

    static async getDiskFiles(musicDir: string): Promise<Set<string>> {
        const fileSet = new Set<string>();
        async function addFiles(dir: string) {
            const files = await fs.readdir(dir, { withFileTypes: true });
            for (const file of files) {
                const res = path.join(dir, file.name);
                if (file.isDirectory()) {
                    await addFiles(res);
                } else if (file.isFile()) {
                    fileSet.add(res.substring(musicDir.length + 1)); // remove musicDir prefix
                }
            }
        }
        await addFiles(musicDir);
        return fileSet;
    }

    static async hasChangedOnDisk_thenUpdateInoAndSize(track: Track): Promise<boolean> {         // stats cannot be done: bail out and delete
        const trackStat = await fileStat(track.path); //  mtime, size, ino, ...
        if (!trackStat) {  // rare cases undefined here
            console.warn(
                `no stats possible for '${track.path}' .. reporting ok`,
            );
            return false;
        }
        if (!trackStat.isFile()) {
            throw new Error(
                `Found a non-file (${track.path}). deleting it`,
            );
        }

        if (track.verifiedAt &&
            (track.verifiedAt.getTime() > trackStat.mtimeMs)) {  // we only get here if inode was unset
            return false;
        }

        track.sizeBytes = trackStat.size;
        track.inode = BigInt(trackStat.ino);

        return true;
    }

    static async tagTrack(track: Track, buffer: Buffer): Promise<jukeTags> {
        // result will be Object.assign'ed to track
        const tags = (await fileTags(buffer, {
            ...(track.mimeType && { mimeType: track.mimeType }),
            ...(track.sizeBytes && { size: track.sizeBytes })
        })).common;

        return {
            ...(tags.artist && { artist: tags.artist }),
            ...(tags.album && { album: tags.album }),
            ...(tags.title && { title: tags.title }),
            ...(tags.year && { year: Number(tags.year) }),
            ...(tags.track && { trackNo: Number(tags.track) }),
        };

    }
}
export const trackService = new TrackService(trackRepo);
