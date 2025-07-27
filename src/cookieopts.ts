import { config } from "./config.js";
export const cookieOpts = {
    maxAge: config.SESSION_EXPIRATION_SECONDS,
    httpOnly: true,
    ...(config.mountpoint && { path: config.mountpoint }),
    secure: config.production,
};
