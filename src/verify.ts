//await trackService.verifyAllTracks();
import { EventEmitter } from "events";
import { trackService } from "./service/track.service.js";
class Verify {

    emitter: EventEmitter;
    controller: AbortController | null = null;

    state: { isRunning: boolean, cancelled: boolean, doneCount: number, completed: boolean; };

    constructor() {
        this.state = this.resetState();
        const emitter = new EventEmitter();
        emitter.on('completed', () => {
            console.log(`onCompleted`);
            this.state.completed = true;
            this.state.isRunning = false;
        });
        emitter.on('progress', (result) => {
            console.log(`onProgress: ${result}`);
            this.state.doneCount += result;
        });
        emitter.on('cancelled', () => {
            console.log('onCancelled: Task was cancelled!');
            this.state.cancelled = true;
        });
        this.emitter = emitter;
    }

    getState() {
        return this.state;
    }

    resetState(started = false) {
        return this.state = { // return needed for constructor typescript
            isRunning: started,
            cancelled: false,
            doneCount: 0,
            completed: false,
        };
    }
    start() {
        if (this.controller) {
            console.log("Start called, Verification is already running.");
            return;
        }
        this.resetState(true);
        this.controller = new AbortController();
        trackService.verifyAllTracks(this.controller.signal, this.emitter)
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
    }
}
export const verify = new Verify();
