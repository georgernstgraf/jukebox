import { stream, streamText, streamSSE, SSEStreamingApi } from 'hono/streaming';
import { v4 as uuidv4 } from "uuid";

export class Streamer {
    private appStreams = new Set<SSEStreamingApi>();
    constructor(heartbeatsecs = 54) {
        setInterval(this.sendHeartbeats.bind(this), heartbeatsecs * 1000);
    }
    register(stream: SSEStreamingApi) {
        this.appStreams.add(stream);
        console.log(`register stream, size now: ${this.appStreams.size}`);
    }
    unregister(stream: SSEStreamingApi) {
        this.appStreams.delete(stream);
        console.log(`unregister stream, size now: ${this.appStreams.size}`);
    }
    sendHeartbeats() {
        console.log(`Sending Heartbeats for ${this.appStreams.size} stream(s)`);
        this.appStreams.forEach(s => {
            s.writeSSE({ event: 'heartbeat', data: '' });
        });
    }

    async messageAll(message: string, event: string = 'taskprogress'): Promise<void[]> {
        const queue: Promise<void>[] = [];
        console.log(`Sending to all ${this.appStreams.size}: ${message}`);
        const id = `${uuidv4()}`;
        this.appStreams.forEach(stream => {
            if (stream.closed || stream.aborted) {
                console.log("WARN!! cannot send message stream closed or aborted");
                return;
            }
            queue.push(stream.writeSSE({
                data: `<li>${message}</li>`,
                id,
                event,
                retry: 1000
            }));
        }
        );
        return await Promise.all(queue);
    }

}
