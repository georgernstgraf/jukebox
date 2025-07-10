export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ||
    "hono_session_id";
export const SESSION_EXPIRATION_SECONDS =
    Number(process.env.SESSION_EXPIRATION_SECONDS) || 60 * 60 * 24 * 120; // 120 days
export const COOKIE_SECRET = process.env.COOKIE_SECRET || "c00k13_s3eCrEt";
export const config = {
    mountpoint: process.env.APP_MOUNTPOINT || "",
};
