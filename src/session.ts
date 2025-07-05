import { Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { v4 as uuidv4 } from "uuid";
import { Client as MemcachedClient } from "memjs"; // Import Memcached client
const mc = MemcachedClient.create("127.0.0.1:11211");

export class Session {
    static SESSION_COOKIE_NAME = "hono_session_id";
    static SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 120; // 120 days
    sessionid: string;

    constructor(sessionid: string | undefined) {
        this.sessionid = sessionid ? sessionid : uuidv4();
    }

    static async middleware(
        c: Context,
        next: () => Promise<void>,
    ): Promise<void> {
        let sessionId = getCookie(c, Session.SESSION_COOKIE_NAME);
        let session = new Session(sessionId);
        // ------- BEFORE REQ --------
        if (sessionId) { // from cookie
            const result = await mc.get(sessionId);
            if (result.value) {
                session = JSON.parse(result.value.toString());
            } else {
                console.log(
                    `Session ID ${sessionId} (from cookie) not in Memcached, creating new.`,
                );
                sessionId = uuidv4(); // Generate new session ID
                await mc.set(
                    sessionId,
                    JSON.stringify(session),
                    { expires: Session.SESSION_EXPIRATION_SECONDS },
                );
            }
        } else {
            console.log("No session ID or no cookie in cookie, creating new.");
            sessionId = uuidv4();
            await mc.set(
                sessionId,
                JSON.stringify(session),
                { expires: Session.SESSION_EXPIRATION_SECONDS },
            );
        }

        c.set("sessionId", sessionId);
        c.set("session", session);

        await next();

        const currentSession = c.get("session");
        const currentSessionId = c.get("sessionId");

        if (currentSessionId && currentSession) {
            await mc.set(
                currentSessionId,
                JSON.stringify(currentSession),
                { expires: Session.SESSION_EXPIRATION_SECONDS },
            );
        }
    }
}
