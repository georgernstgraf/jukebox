import { config } from "./config.js";

export async function spgpasswd(o: { user: string; passwd: string; }) {
    o.user = o.user.split("@")[0]; // maybe they enter email
    const response = await fetch(config.spgpassurl, {
        method: 'POST',
        body: JSON.stringify(o),
        headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    if (!result.auth) {
        throw new Error(`Authentication failed: ${result.error}`);
    }
    return result.result.displayName;
};
