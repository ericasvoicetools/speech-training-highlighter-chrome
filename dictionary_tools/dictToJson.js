const fs = require('fs');

const lines = fs.readFileSync("./data/en_us.txt", "utf8").split("\n");
const json = {}
const lineParser = /(?<key>\S+)\s+\/(?<value>\S+)\//

const ipaSymbols = JSON.parse(fs.readFileSync("./data/en_us_ipa_sounds.json", "utf8"));
const diaphonemes = new Set(ipaSymbols.filter(x => x.length > 1));

/**
 * Process an IPA string into a tokenized array with diaphonemes
 * kept together as single sound.
 */
function parseIpa(ipa) {
    const parsed = [];
    let unparsed = ipa;
    while (unparsed.length > 0) {
        const diaphonemeCandidate = unparsed.slice(0, 2);
        if (diaphonemes.has(diaphonemeCandidate)) {
            parsed.push(diaphonemeCandidate);
            unparsed = unparsed.slice(diaphonemeCandidate.length);
        } else {
            parsed.push(unparsed.slice(0, 1));
            unparsed = unparsed.slice(1);
        }
    }
    return parsed;
}

for (const line of lines) {
    const {key, value} = line.match(lineParser)?.groups ?? {};
    if (key) {
        json[key] = parseIpa(value.replace(/ˈ|ˌ/g, ""))
    }
}

let formattedOutput = "{\n";
for (const key of [...Object.keys(json)].sort()) {
    if (formattedOutput.length > 3) {
        formattedOutput += ",\n"
    }
    formattedOutput += `\t"${key}": ${JSON.stringify(json[key])}`;
}
formattedOutput += "\n}\n";

fs.writeFileSync("./data/en_us.json", formattedOutput, "utf8");
