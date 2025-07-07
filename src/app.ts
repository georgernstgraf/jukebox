import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { Session } from "./session.js";
const app = new Hono();

// Custom session middleware
app.use((c, next) => Session.middleware(c, next));

app.get("/", (c: Context) => {
    const session = c.get("session");
    const s = JSON.stringify(session);
    session.setUsername("georg");
    return c.text(`Session: ${s}`);
});

//app.get("/logout", async (c) => {
//    const sessionId = c.get("sessionId");
//    if (sessionId) {
//        await mc.delete(sessionId); // Delete session from Memcached
//        setCookie(c, SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" }); // Clear cookie
//    }
//    return c.text("Logged out successfully!");
//});

// export default app;
// now start the server:
serve({
    fetch: app.fetch, // Hono apps expose a fetch method for compatibility
    port: 3000,
});
