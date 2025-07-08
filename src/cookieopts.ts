import { SESSION_EXPIRATION_SECONDS } from "./env.js";
export const cookieOpts = {
    maxAge: SESSION_EXPIRATION_SECONDS,
    httpOnly: true,
};
