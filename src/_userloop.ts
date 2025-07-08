import readline from "readline";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

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
                case 2: // set
                    switch (words[0]) {
                        case "e": {
                            //console.log(`encrypt ${words[1]} to ${idc.encrypt(words[1])}`);
                            break;
                        }
                        case "d": {
                            //console.log(`decrypt ${words[1]} to ${idc.decrypt(words[1])}`);
                            break;
                        }
                        default:
                            console.log("kannst mich");
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
