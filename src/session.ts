import { Context, Hono } from "hono";
import { setSignedCookie, getSignedCookie, deleteCookie } from "hono/cookie";
import { v4 as uuidv4 } from "uuid";
import { Client } from "memjs";

import { cookieOpts } from "./cookieopts.js";
import { SESSION_COOKIE_NAME, SESSION_EXPIRATION_SECONDS, COOKIE_SECRET } from "./env.js";

const memjs = Client.create("localhost:11211");

export interface ISession {
    username?: string;
}

export class Session {

    sessionId: string;
    #username: string = "";

    cookieNeedsSend = false;
    needsSave = false;

    constructor(sessionId?: string) {
        if (!sessionId) {
            sessionId = uuidv4();
            this.cookieNeedsSend = true;
            this.needsSave = true;
        }
        this.sessionId = sessionId;
    }

    // 1. put a session object on the context to use
    // 2. call next()  (here the session gets used)
    // 3. a) resend cookie if required
    // 3. b) save the session if modified to store
    static async middleware(
        c: Context,
        next: () => Promise<void>,
    ): Promise<void> {
        let session: Session;
        console.log(
            `Session middleware started: ${c.req.method} ${c.req.path}`,
        );
        let sessionId = await getSignedCookie(c, COOKIE_SECRET, SESSION_COOKIE_NAME);
        // ------- BEFORE REQ --------
        // We have sessionId OR NOT
        console.log(`Handling sessionId from cookie: ${sessionId}`);
        if (sessionId) { // from cookie
            try {
                session = await Session.load(
                    sessionId,
                );
            } catch (e) {
                console.warn(
                    `ALERT: have sid (${sessionId}) but load
            Session err (${e})`,
                );
                session = new Session(sessionId);
                session.needsSave = true;
                session.cookieNeedsSend = true;
            }
        } else {
            session = new Session();
            session.cookieNeedsSend = true;
            session.needsSave = true;
        }
        c.set("session", session);
        await next();
        // ------- AFTER REQ --------
        if (session.needsSave) {
            await session.save(
                session.sessionId,
                JSON.stringify(session),
            );
            console.log(
                `Session saved: ${session.sessionId} with payload: ${JSON.stringify(session)
                }`,
            );
        }
        if (session.cookieNeedsSend) {
            await setSignedCookie(c, SESSION_COOKIE_NAME, session.sessionId, COOKIE_SECRET, cookieOpts);
        }
    }

    get username(): string {
        return this.#username;
    }

    set username(username: string) {
        this.#username = username;
        this.needsSave = true;
    }

    static async load(
        id: string,
    ): Promise<Session> {
        return new Promise((resolve, reject) => {
            console.log(`loadSession ${id}`);
            memjs.get(id, (err, value) => {
                if (value) {
                    console.log(`loadSession got '${value.toString("utf8")}'.`);
                    try {
                        return resolve(
                            Session.fromJSON(
                                JSON.parse(value.toString("utf8")), id
                            ),
                        );
                    } catch (e) {
                        return reject(e);
                    }
                } else {
                    console.log(`loadSession ERR ${err}`);
                    return reject(err);
                }
            });
        });
    }

    async save(
        key: string,
        value: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            memjs.set(
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

    async destroy(  // TODO check and use this .. "Log out"
        sessionId: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            memjs.delete(sessionId, (err, val) => {
                if (err) {
                    console.error(`Error deleting session ${sessionId}:`, err);
                    return reject(err);
                } else {
                    console.log(`SUCCESS deleting session ${sessionId}:`, val);
                    return resolve();
                }
            });
        });
    }

    static fromJSON(json: ISession, id: string): Session {
        const session = new Session(id);
        Object.assign(session, json);
        session.needsSave = false;
        return session;
    }

    toJSON(): ISession {
        return {
            username: this.#username,
        };
    }
}
