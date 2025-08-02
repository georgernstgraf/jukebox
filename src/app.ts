import { Readable } from 'node:stream';
import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { stream, streamText, streamSSE, SSEStreamingApi } from 'hono/streaming';
import { serveStatic } from '@hono/node-server/serve-static';
import { Session } from "./session.js";
import { render } from "./hbs.js";
import { testsaslauthd } from "./testsaslauthd.js";
import { compress } from 'hono/compress';
import { config } from "./config.js";
import { trackService, forceType, TrackService } from "./service/track.service.js";
import { enforceAdmin, enforceUser, sleep } from "./helpers.js";
import { Verify } from "./verify.js";
import * as fs from 'fs';
import { Streamer } from "./streamer.js";
import { spgpasswd } from "./spgpasswd.js";

const streamer = new Streamer();
const verify = new Verify(streamer);
let app = new Hono();
// Custom session middleware

app.use((c, next) => Session.middleware(c, next));
app.use("*", compress());

app.onError((err, c) => {
    console.error(`app.onError: ${err}`);
    let errJson: string | undefined = JSON.stringify(err, null, 2);
    errJson = errJson == '{}' ? undefined : errJson;
    return c.html(render("error", {
        message: err.message,
        //error: JSON.stringify(process.env.NODE_ENV === "production" ? undefined : err),
        error: errJson,
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

    let spguser = null;
    try {
        spguser = await spgpasswd({ user: username, passwd: password });
        session.login(spguser);
        let stats = null;
        if (session.isAdmin()) {
            stats = await trackService.trackStats();
        }
        return c.html(render("body", {
            session: session.renderJSON(), config,
            ...(stats && { stats }),
            verify: verify.getState()
        }));
    } catch (e) {
        let error = e;
        if (e instanceof Error) {
            error = e.message;
        }
        console.error(`Error authenticating with spgpasswd:`, error);
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

app.post("/search/results", enforceUser, async (c: Context) => {  // search
    const session: Session = c.get("session");
    const { artist, album, path } = await c.req.parseBody();
    const searchResults = await trackService.searchTracks(artist as string, album as string, path as string);
    const renderResult = searchResults.map((track) => {
        const renderResult: typeof track & { audio?: boolean; image?: boolean; } = { ...track };
        if (track.mimeType?.startsWith("audio/")) {
            renderResult.audio = true; // Mark as audio track
        }
        if (track.mimeType?.startsWith("image/")) {
            renderResult.image = true; // Mark as image track
        }
        return renderResult;
    });
    const maximumReached = searchResults.length >= config.search_max_results;
    return c.html(render("search/results", {
        config,
        search: {
            artist: artist as string,
            album: album as string,
            path: path as string
        },
        ...(searchResults.length > 0 && { searchResults: renderResult }),
        ...(maximumReached && { maximumReached }),
    }));
});


app.get('/play/:id', enforceUser, async (c) => {
    const audioId = c.req.param('id');
    const track = await trackService.getTrackById(audioId);
    if (!track) {
        return c.html(render("error", {
            message: `Not Found: ${audioId}`,
        }), 404);
    }
    const filePath = `${config.musicDir}/${track.path}`;
    try {
        const fileSize = track.sizeBytes!;
        const contentType = track.mimeType || 'application/octet-stream';

        c.header('Accept-Ranges', 'bytes');
        c.header('Content-Type', contentType);

        const rangeHeader = c.req.header('Range');

        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            // Validate range
            if (isNaN(start) || start < 0 || start >= fileSize || (end && end < start)) {
                // Bad request or invalid range
                c.header('Content-Range', `bytes */${fileSize}`);
                return c.text('Range Not Satisfiable', 416); // HTTP 416 Range Not Satisfiable
            }

            const contentLength = (end - start) + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            // Set headers for partial content
            c.status(206); // HTTP 206 Partial Content
            c.header('Content-Length', contentLength.toString());
            c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);

            // Return the stream directly. Hono can handle Node.js ReadableStreams.
            return c.body(Readable.toWeb(fileStream) as unknown as ReadableStream);

        } else {
            // No Range header, serve the entire file
            const dlName = TrackService.getDownloadName(track);
            c.header('Content-Length', fileSize.toString());
            c.header('Content-Disposition', `attachment; filename="${dlName}"; filename*=UTF-8''${dlName}`);
            const fileStream = fs.createReadStream(filePath);
            return c.body(Readable.toWeb(fileStream) as unknown as ReadableStream);
        }
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return c.text('Audio file not found.', 404);
        }
        console.error(`Error serving audio file ${filePath}:`, error);
        return c.text('An error occurred while serving the file.', 500);
    }
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
app.get("/p/admin-oben", enforceAdmin, async (c: Context) => { // admin page
    const session: Session = c.get("session");
    const stats = await trackService.trackStats();
    return c.html(render("admin/oben", {
        session: session.renderJSON(),
        config,
        stats,
        verify: verify.getState()
    }));
});
app.get("/p/admin/startverify", enforceAdmin, async (c: Context) => { // start verify
    const force = c.req.query("force");
    verify.start(force as forceType);
    const session: Session = c.get("session");
    const stats = await trackService.trackStats();
    return c.html(render("admin/oben", {
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
    return c.html(render("admin/oben", {
        session: session.renderJSON(),
        config,
        stats,
        verify: verify.getState()
    }));
});

// SSE Endpoint
app.get('/sse', async (c) => {
    return streamSSE(c, async (stream) => {
        streamer.register(stream);
        return new Promise<void>((resolve) => {
            stream.onAbort(() => {
                console.log('SSE stream aborted');
                streamer.unregister(stream);
                stream.close();
                resolve();
            });
        });
    });
});

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
}, (info) => {
    console.log(`Server (${JSON.stringify(info)}) running at http://${config.host}:${config.port}${config.mountpoint}`);
});
