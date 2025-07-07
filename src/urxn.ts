import { Client } from "memjs";
const mjs = Client.create();

import readline from "readline";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function mcGet(what: string): Promise<string> {
    return new Promise((resolve, reject) => {
        mjs.get(what, function (err: Error | null, v: Buffer | null) {
            if (v) {
                return resolve(v.toString("utf8"));
            } else {
                return reject(err);
            }
        });
    });
}

async function mcSet(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        mjs.set(
            key,
            value,
            {},
            function (err: Error | null, success: boolean | null) {
                if (err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            },
        );
    });
}

async function promptUser(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        rl.question(`${prompt}`, (userInput: string) => {
            return resolve(userInput);
        });
    });
}
async function userLoop(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        while (true) {
            const response = (await promptUser(
                "memjs $ ",
            )).trim();
            if (!response) {
                console.log("resolving user loop");
                return resolve();
            }
            const words = response.split(" ");
            switch (words.length) {
                case 1: // get
                    try {
                        const value = await mcGet(words[0]);
                        console.log(`${words[0]}: ${value}`);
                    } catch (err) {
                        console.error(`Error getting ${words[0]}:`, err);
                    }
                    break;
                case 2: // set
                    try {
                        await mcSet(words[0], words[1]);
                        console.log(`Set ${words[0]} to ${words[1]}`);
                    } catch (err) {
                        console.error(`Error setting ${words[0]}:`, err);
                    }
                    break;
                default:
                    console.log("kannst mich");
            }
        }
    });
}
userLoop()
    .then(() => {
        rl.close();
        console.log("loop done");
        process.exit();
    })
    .catch((err) => console.error(err))
    .finally(() => {
        console.log("finally");
    });
