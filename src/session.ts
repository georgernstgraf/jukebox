import { Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { v4 as uuidv4 } from "uuid";
import { Client } from "memjs";
const mc = Client.create("localhost:11211");
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ||
    "hono_session_id";
const SESSION_EXPIRATION_SECONDS =
    Number(process.env.SESSION_EXPIRATION_SECONDS) || 60 * 60 * 24 * 120; // 120 days

async function mcGet(
    what: string,
): Promise<Session> {
    return new Promise((resolve, reject) => {
        console.log(`mcGet ${what}`);
        mc.get(what, (err, value) => {
            if (value) {
                console.log(`mcGet ${value.toString("utf8")}`);
                try {
                    return resolve(
                        Session.fromJSON(JSON.parse(value.toString("utf8"))),
                    );
                } catch (e) {
                    return reject(e);
                }
            } else {
                console.log(`mcGet ERR ${err}`);
                return reject(err);
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
            Buffer.from(value),
            {},
            function (err, val) {
                if (err) {
                    console.error(`Error saving ${key} to Memcached:`, err);
                    return reject(err);
                } else {
                    console.log(`SUCCESS saving ${key} to Memcached:`, val);
                    return resolve();
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
        let session: Session;
        // ------- BEFORE REQ --------
        // We have sessionId OR NOT
        console.log(`Handling sessionId from cookie: ${sessionId}`);
        if (sessionId) { // from cookie
            try {
                session = await mcGet(
                    sessionId,
                );
            } catch {
                console.warn("ALERT: had to create new session, know sess id");
                session = new Session(sessionId);
                session.sessionNeedsSave = true;
            }
        } else {
            session = new Session();
            session.sessionNeedsSave = true;
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
    setUsername(username: string): void {
        this.username = username;
        this.sessionNeedsSave = true;
    }
    static fromJSON(json: ISession): Session {
        let session: Session;
        if (!json.sessionId) {
            session = new Session();
            session.sessionNeedsSave = true;
            session.cookieNeedsSend = true;
        } else {
            session = new Session(json.sessionId);
            Object.assign(session, json);
        }
        return session;
    }
    toJSON(): ISession {
        return {
            sessionId: this.sessionId,
            username: this.username,
        };
    }
}
