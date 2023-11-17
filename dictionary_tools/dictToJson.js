const fs = require('fs');

const lines = fs.readFileSync("./data/en_us.txt", "utf8").split("\n");
const json = {}
const lineParser = /(?<key>\S+)\s+\/(?<value>\S+)\//

for (const line of lines) {
    const {key, value} = line.match(lineParser)?.groups ?? {};
    if (key) {
        json[key] = value.replace(/ˈ|ˌ/g, "")
    }
}

fs.writeFileSync("./data/en_us.json", JSON.stringify(json, null, 4), "utf8");