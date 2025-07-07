import { Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { v4 as uuidv4 } from "uuid";
//import { Client as MemcachedClient } from "memjs";
import memjsModule from "memjs";
// const memjs = require("memjs").Client;
const mc = memjsModule.Client.create();
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ||
    "hono_session_id";
const SESSION_EXPIRATION_SECONDS =
    Number(process.env.SESSION_EXPIRATION_SECONDS) || 60 * 60 * 24 * 120; // 120 days

async function mcGet(
    key: string,
): Promise<Session | null> {
    return new Promise((resolve, reject) => {
        mc.get(key, (err, value) => {
            if (err) {
                console.error(`Error retrieving ${key} from Memcached:`, err);
                reject(err);
            } else {
                resolve(
                    value
                        ? Session.fromJSON(JSON.parse(value.toString()))
                        : null,
                );
            }
        });
    });
}

async function mcSet(
    key: string,
    value: string,
): Promise<void> {
    return new Promise((resolve, reject) => {
        mc.set(
            key,
            value,
            { expires: SESSION_EXPIRATION_SECONDS },
            (err, val) => {
                if (err) {
                    console.error(`Error saving ${key} to Memcached:`, err);
                    reject(err);
                } else {
                    resolve();
                }
            },
        );
    });
}
export interface ISession {
    sessionId: string;
    username?: string;
}
export class Session {
    static SESSION_COOKIE_NAME = SESSION_COOKIE_NAME;
    static SESSION_EXPIRATION_SECONDS = SESSION_EXPIRATION_SECONDS;

    sessionId: string;
    username: string | undefined;

    cookieNeedsSend = false;
    sessionNeedsSave = false;

    constructor(sessionId?: string) {
        this.sessionId = sessionId ? sessionId : uuidv4();
    }

    // job is putting a session object on the context
    static async middleware(
        c: Context,
        next: () => Promise<void>,
    ): Promise<void> {
        console.log(
            `Session middleware started: ${c.req.method} ${c.req.path}`,
        );
        let sessionId = getCookie(c, Session.SESSION_COOKIE_NAME);
        let session: Session | null;
        // ------- BEFORE REQ --------
        // We have sessionId OR NOT
        console.log(`Handling sessionId from cookie: ${sessionId}`);
        if (sessionId) { // from cookie
            session = await mcGet(
                sessionId,
            );
            if (!session) {
                session = new Session(sessionId);
                session.sessionNeedsSave = true;
            } else {
                session = new Session();
                session.sessionNeedsSave = true;
                session.cookieNeedsSend = true;
            }

            c.set("session", session);

            await next();

            // ------- AFTER REQ --------
            if (session.sessionNeedsSave) {
                await mcSet(
                    session.sessionId,
                    JSON.stringify(session),
                );
                console.log(
                    `Session saved: ${session.sessionId} with payload: ${
                        JSON.stringify(session)
                    }`,
                );
            }
            if (session.cookieNeedsSend) {
                setCookie(c, Session.SESSION_COOKIE_NAME, session.sessionId, {
                    maxAge: Session.SESSION_EXPIRATION_SECONDS,
                });
            }
        }
    }
    setUsername(username: string): void {
        this.username = username;
        this.sessionNeedsSave = true;
    }
    static fromJSON(json: ISession): Session {
        const session = new Session(json.sessionId);
        return Object.assign(session, json);
    }
    toJSON(): ISession {
        return {
            sessionId: this.sessionId,
            username: this.username,
        };
    }
}
