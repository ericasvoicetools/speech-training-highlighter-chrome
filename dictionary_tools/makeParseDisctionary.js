const fs = require('fs');

const dictFile = fs.readFileSync("./data/en_us.json", "utf8");
const dictionary = JSON.parse(dictFile);
const priorFile = fs.readFileSync("./data/en_us_priors.json", "utf8");
const priors = JSON.parse(priorFile);
const classFile = fs.readFileSync("./data/en_us_ipa_classification.json", "utf8");
const ipaClassification = JSON.parse(classFile);

let mismatch = 0;

const output = {};

for (const [english, IPA] of Object.entries(dictionary)) {
    const ipaArray = [...IPA].map(x => `/${x}/`);
    let ipaIndex = 0;
    const attributedEnglish = [];
    for (const engChar of english) {
        const engCharPriors = priors[engChar];

        function score(ipaChar) {
            return (engCharPriors[ipaChar] ?? 0) + ((priors[ipaChar] ?? {})[engChar] ?? 0);
        }

        if (!engCharPriors) {
            attributedEnglish[engChar] = "silent";
            continue;
        }

        const likelihoods = [-1, 0, 1]
            .map(offset => (ipaArray[ipaIndex + offset]) ?? "silent")
            .map(score);
        
        likelihoods[1] = likelihoods[1] * 1.1;

        const maxLikelihood = Math.max(...likelihoods);
        const matchOffset = likelihoods.lastIndexOf(maxLikelihood) - 1;

        attributedEnglish.push([
            engChar,
            ipaClassification[ipaArray[ipaIndex + matchOffset]] ?? "silent"
        ]);
        ipaIndex += Math.min(2, matchOffset + 1);
    }
    const last = attributedEnglish[attributedEnglish.length - 2] ?? [];
    if ((last[1] === "silent") || ipaIndex < ipaArray.length - 1) {
        mismatch++;
        continue;
    }

    let html = "";
    let prevSound = "";
    let openSpan = false;
    for (const [engChar, sound] of attributedEnglish) {
        if (sound !== prevSound) {
            prevSound = sound;
            if (openSpan) {
                html += "</span>"
                openSpan = false;
            }
            if (sound !== "silent") {
                html += `<span class=speech-highligher-${sound}>`;
                openSpan = true;
            }
        }
        html += engChar;
    }
    if (openSpan) {
        html += "</span>"
    }
    output[english] = html;
}

fs.writeFileSync("./data/en_us_replacements.json", JSON.stringify(output, null, 4), "utf8");
console.log({mismatch, total: [...Object.entries(dictionary)].length})