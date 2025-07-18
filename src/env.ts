export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ||
    "hono_session_id";
export const SESSION_EXPIRATION_SECONDS =
    Number(process.env.SESSION_EXPIRATION_SECONDS) || 60 * 60 * 24 * 120; // 120 days
export const COOKIE_SECRET = process.env.COOKIE_SECRET || "c00k13_s3eCrEt";
export const APP_MOUNTPOINT = process.env.APP_MOUNTPOINT || "";
export const config = {
    mountpoint: process.env.APP_MOUNTPOINT || "",
    host: process.env.APP_HOST || "localhost",
    port: Number(process.env.APP_PORT) || 3000,
    production: process.env.MODE?.toLowerCase() === "production",
    SESSION_COOKIE_NAME,
    SESSION_EXPIRATION_SECONDS,
    COOKIE_SECRET,
    saslauthdMux: process.env.SASLAUTHD_MUX || "/var/run/saslauthd/mux",
    saslauthdLieTrue: process.env.SASLAUTHD_LIETRUE === "yes" || false,
    dbTimeout: process.env.DB_TIMEOUT ? process.env.DB_TIMEOUT : "21000",
    musicDir: process.env.MUSIC_DIR || "/home/www/Music",
    DONT_SYNC_ON_STARTUP: process.env.DONT_SYNC_ON_STARTUP === "true" || false,
    search_max_results: Number(process.env.SEARCH_MAX_RESULTS) || 108,
};
