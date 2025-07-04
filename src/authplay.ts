import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pam = require("authenticate-pam");
const pass = process.argv[2];
pam.authenticate(
    "georg",
    pass,
    (err: any) => {
        if (err) {
            console.error("login failed", err);
        } else {
            console.log("OK – system accepted the password");
        }
    },
    { serviceName: "other", remoteHost: "127.0.0.1" }, // pam.d/myapi
);
