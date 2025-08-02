import net from "node:net";
import { config } from "./config.js";

export async function testsaslauthd(username: string, password: string) {
    return new Promise<boolean>((res, rej) => {
        if (config.saslauthdLieTrue) res(true);

        const service = "imap";

        function lenPrefixedBuffer(str: string) {
            if (str.length > 65535) {
                throw new Error("Field too long for two-byte length: " + str);
            }
            const lenPrefix = Buffer.alloc(2);
            const payload = Buffer.from(str, "utf-8");
            lenPrefix.writeUInt16BE(payload.length);
            return Buffer.concat([lenPrefix, payload]);
        }

        const request = Buffer.concat([
            lenPrefixedBuffer(username),
            lenPrefixedBuffer(password),
            lenPrefixedBuffer(service),
            lenPrefixedBuffer(""),
        ]);

        let rv = false;

        const socket = net.createConnection(
            { path: config.saslauthdMux },
            () => socket.write(request),
        );

        let response = Buffer.alloc(0);

        socket.on("data", (chunk) => {
            response = Buffer.concat([response, chunk]);
            // We expect at least 4 bytes: 2-byte length + payload
            if (response.length >= 4) {
                const len = response.readUInt16BE(0); // 0x0002 ⇒ 2
                const text = response.subarray(2, 2 + len).toString("utf8"); // "OK"
                //console.log("Server replied:", text, response.toString("hex"));
                rv = text.startsWith("OK");
                socket.end();
            }
        });

        socket.on("error", (err) => {
            console.error("Socket error - reject:", err);
            res(false);
        });
        socket.on("end", () => {
            //console.log("Connection closed");
            res(rv);
        });
    });
}
