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
app.get("/", (c: Context) => {
    const session: Session = c.get("session");
    return c.html(render("index", {
        session: session.toJSON(),
    }));
});

app.use('/*', serveStatic({ root: './static' }));

app.post("/login", async (c: Context) => {
    const session: Session = c.get("session");
    const { username, password } = await c.req.parseBody();
    let error = "";
    if (typeof username !== "string" || typeof password !== "string") {
        return c.status(400);
    }
    if (await testsaslauthd(username, password)) {
        session.username = username; // Set the username in the session
        return c.html(render("body", {
            session: session.toJSON(),
        }));
    }
    return c.html(render("body", {
        error: "Invalid username or password."
    }));
});
app.post("/logout", async (c: Context) => {
    const session: Session = c.get("session");
    await session.destroy(); // Destroy the session
    return c.html(render("body", {
        session: {}
    }));
});
export default app;
//app.get("/logout", async (c) => {
//    const sessionId = c.get("sessionId");
//    if (sessionId) {
//        await mc.delete(sessionId); // Delete session from Memcached
//        setCookie(c, SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" }); // Clear cookie
//    }
//    return c.text("Logged out successfully!");
//});
// Error handling
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
