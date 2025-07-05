import { Hono } from "hono";

const app = new Hono();

// Define a type for your session data
interface SessionData {
    userId?: string;
    cart?: string[];
    lastVisit?: number;
    // Add any other data you want to store in the session
}

const SESSION_COOKIE_NAME = "hono_session_id";
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 120; // 120 days

// Custom session middleware
app.use(async (c, next) => {
    let sessionId = getCookie(c, SESSION_COOKIE_NAME);
    let session: SessionData = {};

    if (sessionId) { // from cookie
        const result = await mc.get(sessionId);
        if (result.value) {
            session = JSON.parse(result.value.toString());
        } else {
            // Session ID found in cookie but not in Memcached (expired or invalid)
            console.log(
                `Session ID ${sessionId} not found in Memcached, creating new.`,
            );
            sessionId = uuidv4(); // Generate new session ID
            await mc.set(
                sessionId,
                JSON.stringify(session),
                { expires: SESSION_EXPIRATION_SECONDS }, // Expiration in seconds
            );
        }
    } else {
        // No session ID in cookie, create a new one
        console.log("No session ID or no cookie in cookie, creating new.");
        sessionId = uuidv4();
        await mc.set(
            sessionId,
            JSON.stringify(session),
            { expires: SESSION_EXPIRATION_SECONDS },
        );
    }

    // Attach session data and ID to the Hono context
    c.set("sessionId", sessionId);
    c.set("session", session);

    // Continue to the next middleware/route handler
    await next();

    // After the route handler, save the (potentially modified) session data back to Memcached
    // And update the cookie's expiration
    const currentSession = c.get("session");
    const currentSessionId = c.get("sessionId");

    if (currentSessionId && currentSession) {
        await mc.set(
            currentSessionId,
            JSON.stringify(currentSession),
            { expires: SESSION_EXPIRATION_SECONDS },
        );
        setCookie(c, SESSION_COOKIE_NAME, currentSessionId, {
            path: "/",
            maxAge: SESSION_EXPIRATION_SECONDS, // Cookie maxAge in seconds
            httpOnly: true, // Important for security
            secure: process.env.NODE_ENV === "production", // Use secure cookies in production (HTTPS)
            sameSite: "lax", // Or 'strict' for more security
        });
    }
});

// Example Usage (same as before):
app.get("/", (c) => {
    const session = c.get("session");
    const sessionId = c.get("sessionId");

    if (session.userId) {
        return c.text(
            `Welcome back, User ${session.userId}! Your session ID is ${sessionId}`,
        );
    } else {
        // Simulate logging in and setting user ID in session
        session.userId = "456"; // Changed userId to distinguish from Redis example
        session.lastVisit = Date.now();
        session.cart = ["productX", "productY"];
        return c.text(`New session created! Your session ID is ${sessionId}`);
    }
});

app.get("/logout", async (c) => {
    const sessionId = c.get("sessionId");
    if (sessionId) {
        await mc.delete(sessionId); // Delete session from Memcached
        setCookie(c, SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" }); // Clear cookie
    }
    return c.text("Logged out successfully!");
});

export default app;
