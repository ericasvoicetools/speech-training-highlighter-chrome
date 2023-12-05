const fs = require('fs');

const file = fs.readFileSync("./data/en_us.json", "utf8");
const dictionary = JSON.parse(file);
const histograms = {};

const staticRules = JSON.parse(fs.readFileSync("./data/en_us_static_rules.json"));

for (const [rawEnglish, rawIpa] of Object.entries(dictionary)) {
    const english = `^${rawEnglish}$`
    const ipa = [...rawIpa, "Ø"];
    
    const score = (ipaIndex, englishIndex, engSubstr, ipaKey) => {
        const ipaPosition = ipaIndex / Math.max(rawIpa.length - 1, 1);
        const englishPosition = (englishIndex) / Math.max(rawEnglish.length - 1, 1);
        const diff = (ipaPosition - englishPosition) * rawEnglish.length;
        const gaussedDiff = Math.exp(-(diff * diff) / 3);

        return gaussedDiff;
    }

    for (let englishIndex = 0; englishIndex < rawEnglish.length; englishIndex++) {
        const engSubstr = english.slice(englishIndex, englishIndex + 3);
        const validSounds = new Set(staticRules[engSubstr[1]]);
        const engHistogram = histograms[engSubstr] ?? {};
        let ipaIndex = 0;
        for (const ipaChar of ipa) {
            if (!validSounds.has(ipaChar)) {
                ipaIndex++;
                continue;
            }

            const ipaKey = `/${ipaChar}/`;

            const charScore = score(ipaIndex, englishIndex, engSubstr, ipaKey);
            engHistogram[ipaChar] = (engHistogram[ipaChar] ?? 0) + charScore;

            const ipaHistogram = histograms[ipaKey] ?? {};
            ipaHistogram[engSubstr] = (ipaHistogram[engSubstr] ?? 0) + charScore;
            histograms[ipaKey] = ipaHistogram;

            ipaIndex++;
        }
        histograms[engSubstr] = engHistogram;
    }
}

function scaleHistogram(histogram) {
    const scaled = {};
    for (const [outerChar, hist] of Object.entries(histogram)) {
        if (outerChar.startsWith("/")) {
            continue;
        }
        const innerScaled = {};
        let total = [...Object.values(hist)].reduce((total, value) => total + value, 0);
        for (const [innerChar, value] of Object.entries(hist)) {
            const percentage = value * 100 / total;
            if (percentage >= 0.5) {
                innerScaled[innerChar] = Math.round(percentage);
            }
        }
        if ([...Object.keys(innerScaled)].length > 0) {
            scaled[outerChar] = innerScaled;
        }
    }
    return scaled;
}

const priors = scaleHistogram(histograms);

let formattedOutput = "{\n";
for (const key of [...Object.keys(priors)].sort()) {
    if (formattedOutput.length > 3) {
        formattedOutput += ",\n"
    }
    formattedOutput += `\t"${key}": ${JSON.stringify(priors[key])}`;
}
formattedOutput += "\n}\n";

fs.writeFileSync("./data/en_us_priors_sequence.json", formattedOutput, "utf8");
