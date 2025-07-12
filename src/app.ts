import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from '@hono/node-server/serve-static';
import { Session } from "./session.js";
import { render } from "./hbs.js";
import { testsaslauthd } from "./testsaslauthd.js";
import { compress } from 'hono/compress';
import { config } from "./env.js";
import { trackService } from "./service/track.service.js";
import { enforceAdmin } from "./helpers.js";
import { verify } from "./verify.js";

let app = new Hono();

// Custom session middleware

app.use((c, next) => Session.middleware(c, next));
app.use("*", compress());

app.onError((err, c) => {
    console.error(`app.onError: ${err}`);
    return c.html(render("error", {
        message: err.message,
        //error: JSON.stringify(process.env.NODE_ENV === "production" ? undefined : err),
        error: JSON.stringify(err, null, 2),
    }), 500);
});

app.get("/", async (c: Context) => {  // index
    const session: Session = c.get("session");
    let stats = null;
    if (session.isAdmin()) {
        stats = await trackService.trackStats();
    }
    return c.html(render("index", {
        session: session.renderJSON(),
        config,
        ...(stats && { stats }),
        verify: verify.getState()
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
        session.login(username);
        let stats = null;
        if (session.isAdmin()) {
            stats = await trackService.trackStats();
        }
        return c.html(render("body", {
            session: session.renderJSON(), config,
            ...(stats && { stats }),
            verify: verify.getState()
        }));
    }
    return c.html(render("body", {
        error: "Invalid username or password.",
        config
    }));
});
app.post("/logout", async (c: Context) => { // logout TODO rm cookie
    const session: Session = c.get("session");
    session.logout(); // Destroy the session
    return c.html(render("body", {
        session: {},
        config
    }));
});

app.get("/p/admin", enforceAdmin, async (c: Context) => { // admin page
    const session: Session = c.get("session");
    const stats = await trackService.trackStats();
    return c.html(render("admin", {
        session: session.renderJSON(),
        config,
        stats,
        verify: verify.getState()
    }));
});
app.get("/p/admin/startverify", enforceAdmin, async (c: Context) => { // start verify
    verify.start();
    const session: Session = c.get("session");
    const stats = await trackService.trackStats();
    return c.html(render("admin", {
        session: session.renderJSON(),
        config,
        stats,
        verify: verify.getState()
    }));
});
app.get("/p/admin/cancelverify", enforceAdmin, async (c: Context) => { // cancel verify
    verify.cancel();
    const session: Session = c.get("session");
    const stats = await trackService.trackStats();
    return c.html(render("admin", {
        session: session.renderJSON(),
        config,
        stats,
        verify: verify.getState()
    }));
});

app.get("/notexistend", async (c: Context) => {
    throw new Error("This is a test error for the notFound handler.");
});

// Serve static files relative to the mountpoint
app.use("*", serveStatic({
    root: './static', rewriteRequestPath: (path) => {
        return path.substring(config.mountpoint.length);
    }
}));

function notFoundHandler(c: Context) {
    console.error(`Error: app.notFound: ${c.req.path}`);
    return c.html(render("error", {
        message: `Not Found: ${c.req.path}`,
    }), 404);
}
app.notFound(notFoundHandler);

// define parent startapp if mountpoint is set
let startApp;
if (config.mountpoint) {
    const rootApp = new Hono();
    startApp = rootApp;
    startApp.route(config.mountpoint, app);
    startApp.notFound(notFoundHandler);
} else {
    startApp = app;
}
serve({
    fetch: startApp.fetch, // Hono apps expose a fetch method for compatibility
    port: config.port,
    hostname: config.host,
});
console.log(`Server running at http://${config.host}:${config.port}${config.mountpoint}`);
