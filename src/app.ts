import { Hono } from "hono";
import { Session } from "./session.js";
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
app.use(Session.middleware);

// Example Usage (same as before):
//app.get("/", (c) => {
//    const session = c.get("session");
//    const sessionId = c.get("sessionId");
//
//    if (session.userId) {
//        return c.text(
//            `Welcome back, User ${session.userId}! Your session ID is ${sessionId}`,
//        );
//    } else {
//        // Simulate logging in and setting user ID in session
//        session.userId = "456"; // Changed userId to distinguish from Redis example
//        session.lastVisit = Date.now();
//        session.cart = ["productX", "productY"];
//        return c.text(`New session created! Your session ID is ${sessionId}`);
//    }
//});
//
//app.get("/logout", async (c) => {
//    const sessionId = c.get("sessionId");
//    if (sessionId) {
//        await mc.delete(sessionId); // Delete session from Memcached
//        setCookie(c, SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" }); // Clear cookie
//    }
//    return c.text("Logged out successfully!");
//});

export default app;
