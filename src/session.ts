import { Context } from "hono";
import { setSignedCookie, getSignedCookie, deleteCookie } from "hono/cookie";
import { v4 as uuidv4 } from "uuid";
import { Client } from "memjs";

import { cookieOpts } from "./cookieopts.js";
import { SESSION_COOKIE_NAME, COOKIE_SECRET } from "./env.js";

const memjs = Client.create("localhost:11211");

export interface ISession {
    username?: string;
    isAdmin?: boolean;
}

export class Session {

    c: Context;
    sessionId: string;
    #username: string = "";
    #isAdmin: boolean = false; // TODO: get from DB
    // need those guys in the after step
    gotLogin = false;
    gotLogout = false;
    needsSave = false;
    idIsFromCookie = false;
    loadedFromStore = false;

    constructor(c: Context, sessionId?: string) {
        if (!sessionId) {
            sessionId = uuidv4();
        } else {
            this.idIsFromCookie = true;
        }
        this.sessionId = sessionId;
        this.c = c;
    }
    get username(): string {
        return this.#username;
    }
    set username(username: string) {
        if (username === "georg") {    // TODO: get from DB
            this.#isAdmin = true;
        }
        this.#username = username;
    }
    isAdmin(): boolean {
        return this.#isAdmin;
    }
    login(username: string): void {
        this.username = username;
        this.gotLogin = true;
    }
    logout(): void {
        this.gotLogout = true;
    }
    toJSON(): ISession {
        return {
            username: this.#username,
        };
    }
    renderJSON(): ISession {
        return {
            username: this.#username,
            isAdmin: this.#isAdmin,
        };
    }

    async save(): Promise<void> {
        const id = this.sessionId;
        const value = JSON.stringify(this);
        return new Promise((resolve, reject) => {
            memjs.set(
                id,
                Buffer.from(value),
                {},
                function (err, val) {
                    if (err) {
                        console.error(`Error saving ${id} to Memcached:`, err);
                        return reject(err);
                    } else {
                        console.log(`SUCCESS saving ${id} to Memcached:`, val);
                        return resolve();
                    }
                },
            );
        });
    }
    async sendCookie() {
        await setSignedCookie(this.c, SESSION_COOKIE_NAME, this.sessionId, COOKIE_SECRET, cookieOpts);
    }
    async delete(): Promise<void> {
        return new Promise((resolve, reject) => {
            memjs.delete(this.sessionId, (err, val) => {
                if (err) {
                    console.error(`Error deleting session ${this.sessionId}:`, err);
                    return reject(err);
                } else {
                    console.log(`SUCCESS deleting session ${this.sessionId}:`, val);
                    return resolve();
                }
            });
        });
    }
    static async load(
        id: string, c: Context
    ): Promise<Session> {
        return new Promise((resolve, reject) => {
            console.log(`loadSession ${id}`);  // id comes from cookie
            memjs.get(id, (err, value) => {
                if (value) {
                    console.log(`loadSession got '${value.toString("utf8")}'.`);
                    try {
                        const session = new Session(c, id);
                        Object.assign(session, JSON.parse(value.toString("utf8")));
                        session.loadedFromStore = true;
                        return resolve(session);
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

    static async middleware(
        c: Context,
        next: () => Promise<void>,
    ): Promise<void> {
        let session = undefined;
        console.log(
            `Session middleware started: ${c.req.method} ${c.req.path}`,
        );
        let sessionIdFromCookie = await getSignedCookie(c, COOKIE_SECRET, SESSION_COOKIE_NAME);
        // ------- BEFORE REQ --------
        // We have sessionId OR NOT
        console.log(`Handling sessionId from cookie: ${sessionIdFromCookie}`);
        if (sessionIdFromCookie) { // from cookie
            try {
                session = await Session.load(
                    sessionIdFromCookie, c
                );
            } catch (e) {
                console.warn(`WEIRD: sid (${sessionIdFromCookie}) from cookie gone from store (${e})`);
                session = new Session(c, sessionIdFromCookie);
            }
        } else {
            session = new Session(c);
        };
        c.set("session", session);
        await next();
        // ------- AFTER REQ --------
        if (session.gotLogin) {
            await session.save();
            await session.sendCookie();
            console.log(
                `Session saved & cookie sent: ${session.sessionId} with payload: ${JSON.stringify(session)
                }`,
            );
            return;
        }
        if (session.gotLogout) {
            await session.delete();
            await deleteCookie(c, SESSION_COOKIE_NAME, cookieOpts);
            console.log(
                `Session and cookie deleted: ${session.sessionId}`,
            );
            return;
        }
        if (!session.username) {
            if (session.idIsFromCookie) {
                await deleteCookie(c, SESSION_COOKIE_NAME, cookieOpts);
            }
            if (session.loadedFromStore) {
                await session.delete();
            }
            return;
        }
        if (session.needsSave) {
            await session.save();
        }
    }
}
