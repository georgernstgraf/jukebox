import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from '@hono/node-server/serve-static';
import { Session } from "./session.js";
import { render } from "./hbs.js";
import { testsaslauthd } from "./testsaslauthd.js";
import { compress } from 'hono/compress';

const app = new Hono();

// Custom session middleware

app.use((c, next) => Session.middleware(c, next));
app.use("*", compress());
app.get("/", (c: Context) => {  // index
    const session: Session = c.get("session");
    return c.html(render("index", {
        session: session.renderJSON(),
    }));
});

// Authentication
app.post("/login", async (c: Context) => {  // login
    const session: Session = c.get("session");
    const { username, password } = await c.req.parseBody();
    let error = "";
    if (typeof username !== "string" || typeof password !== "string") {
        return c.status(400);
    }
    if (await testsaslauthd(username, password)) {
        session.username = username; // Set the username in the session
        return c.html(render("body", {
            session: session.renderJSON(),
        }));
    }
    return c.html(render("body", {
        error: "Invalid username or password."
    }));
});
app.post("/logout", async (c: Context) => { // logout TODO rm cookie
    const session: Session = c.get("session");
    await session.destroy(); // Destroy the session
    return c.html(render("body", {
        session: {}
    }));
});

app.use('/*', serveStatic({ root: './static' })); // Static files

app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({
        message: err.message,
        error: process.env.NODE_ENV === "production" ? {} : err,
    }, 500);
});
// now start the server:
serve({
    fetch: app.fetch, // Hono apps expose a fetch method for compatibility
    port: 3000,
});
