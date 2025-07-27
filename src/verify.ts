//await trackService.verifyAllTracks();
import { EventEmitter } from "events";
import { trackService, forceType } from "./service/track.service.js";
import { Streamer } from "./streamer.js"

function runtimeSecs(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / 1000);
}

export class Verify {
    emitter: EventEmitter;
    controller: AbortController | null = null;
    startedAt = new Date();

    state: {  // report for render, no class
        isRunning: boolean, cancelled: boolean, doneCount: number, completed: boolean; messages: string[]; runTime: number;
    };

    constructor(streamer: Streamer) {
        this.state = this.resetState();
        const emitter = new EventEmitter();
        emitter.on('completed', () => {
            console.log(`onCompleted`);
            this.state.completed = true;
            this.state.isRunning = false;
            this.state.runTime = runtimeSecs(this.startedAt, new Date());
        });
        emitter.on('progress', (result) => {
            this.state.runTime = runtimeSecs(this.startedAt, new Date());
            this.state.doneCount += result;
        });
        emitter.on('cancelled', () => {
            console.log('onCancelled: Task was cancelled!');
            this.state.cancelled = true;
            this.state.isRunning = false;
            this.state.runTime = runtimeSecs(this.startedAt, new Date());

        });
        emitter.on('message', (message) => {
            this.state.runTime = runtimeSecs(this.startedAt, new Date());
            this.state.messages.push(message);
        });
        this.emitter = emitter;
    }

    getState() {
        return this.state;
    }

    resetState(started = false) {
        this.startedAt = new Date();
        return this.state = { // return needed for constructor typescript
            isRunning: started,
            cancelled: false,
            doneCount: 0,
            completed: false,
            messages: [],
            runTime: 0,
        };
    }
    start(force: forceType = "basic") {
        console.log(`verify.start() called with force: ${force}`);
        if (this.controller) {
            console.log("Start called, Verification is already running.");
            return;
        }
        this.resetState(true);
        this.controller = new AbortController();
        trackService.verifyAllTracks(force, this.controller.signal, this.emitter)
            .then(() => console.log("Verification completed successfully."))
            .catch((err) => console.log(err.message))
            .finally(() => {
                this.controller = null;
            });
    }
    cancel() {
        if (!this.controller) {
            console.log("Cancel called, but no verification is running.");
            return;
        }
        this.controller.abort();
        this.controller = null;
        this.state.isRunning = false;
        this.state.cancelled = true;
        this.state.completed = false;
        this.state.runTime = runtimeSecs(this.startedAt, new Date());
    }
}
