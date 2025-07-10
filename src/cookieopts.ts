import { SESSION_EXPIRATION_SECONDS, APP_MOUNTPOINT } from "./env.js";
export const cookieOpts = {
    maxAge: SESSION_EXPIRATION_SECONDS,
    httpOnly: true,
    ...(APP_MOUNTPOINT && { path: APP_MOUNTPOINT })
};
