import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { Session } from "./session.js";
const app = new Hono();

// Custom session middleware
app.use((c, next) => Session.middleware(c, next));

app.get("/", (c: Context) => {
    const session: Session = c.get("session");
    const s = JSON.stringify(session);
    if (!session.username) {
        session.setUsername("georg");
    }
    return c.text(`Session as got from store: ${s}`);
});

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
