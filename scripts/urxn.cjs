const memjs = require("memjs").Client;
const mjs = memjs.create();

const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function mcGet(what) {
    return new Promise((resolve, reject) => {
        mjs.get(what, function (err, v) {
            if (v) {
                return resolve(v);
            } else {
                return reject(err);
            }
        });
    });
}

async function mcSet(key, value) {
    return new Promise((resolve, reject) => {
        mjs.set(key, value, function (err) {
            if (err) {
                return reject(err);
            } else {
                return resolve();
            }
        });
    });
}

async function promptUser(prompt) {
    return new Promise((resolve, reject) => {
        readline.question(`${prompt}`, (userInput) => {
            return resolve(userInput);
        });
    });
}
async function userLoop() {
    return new Promise(async (resolve, reject) => {
        while (true) {
            const response = (await promptUser(
                "memjs $ ",
            )).trim();
            if (!response) {
                console.log("resolving");
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
    .then(() => console.log("loop done"))
    .catch((err) => console.error(err))
    .finally(() => readline.close());
