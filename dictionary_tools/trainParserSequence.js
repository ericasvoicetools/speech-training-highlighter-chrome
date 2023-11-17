const fs = require('fs');

const file = fs.readFileSync("./data/en_us.json", "utf8");
const dictionary = JSON.parse(file);
const histograms = {};
const ipaSymbols = new Set();

//const ipaClassification = JSON.parse(fs.readFileSync("./data/en_us_ipa_classification.json", "utf8"));
//const vowels = new Set("a", "e", "i", "o", "u", "y");

for (const [rawEnglish, ipa] of Object.entries(dictionary)) {
    const score = (ipaIndex, englishIndex) => {
        const ipaPosition = ipaIndex / Math.max(ipa.length - 1, 1);
        const englishPosition = (englishIndex - 1) / Math.max(english.length - 3, 1);
        const diff = (ipaPosition - englishPosition) * english.length;
        const gaussedDiff = Math.exp(-(diff * diff) / 3);
        return gaussedDiff;
    }

    const english = `^${rawEnglish}$`
    for (let englishIndex = 1; englishIndex < english.length - 1; englishIndex++) {
        const engChar = english.slice(englishIndex - 1, englishIndex + 2);
        const engHistogram = histograms[engChar] ?? {};
        let ipaIndex = 0;
        for (const ipaChar of ipa) {
            ipaSymbols.add(ipaChar);
            const ipaKey = `/${ipaChar}/`;
            const charScore = score(ipaIndex, englishIndex)
            engHistogram[ipaKey] = (engHistogram[ipaKey] ?? 0) + charScore;

            const ipaHistogram = histograms[ipaKey] ?? {};
            ipaHistogram[engChar] = (ipaHistogram[engChar] ?? 0) + charScore;
            histograms[ipaKey] = ipaHistogram;

            ipaIndex++;
        }
        histograms[engChar] = engHistogram;
        englishIndex++;
    }
}

function scaleHistogram(histogram) {
    const scaled = {};
    for (const [outerChar, hist] of Object.entries(histogram)) {
        if (!outerChar.startsWith("/")) {
            continue;
        }
        const innerScaled = {};
        let total = [...Object.values(hist)].reduce((total, value) => total + value, 0);
        for (const [innerChar, value] of Object.entries(hist)) {
            const percentage = value * 100 / total;
            if (percentage >= 1) {
                innerScaled[innerChar] = percentage;
            }
        }
        if ([...Object.keys(innerScaled)].length > 0) {
            scaled[outerChar] = innerScaled;
        }
    }
    return scaled;
}

function crossMultiplyHistogram(histogram) {
    const crossedPriors = {};
    for (const [outerChar, hist] of Object.entries(histograms)) {
        const innerPriors = {};
        for (const [innerChar, value] of Object.entries(hist)) {
            innerPriors[innerChar] = value * histogram[innerChar][outerChar];
        }
        crossedPriors[outerChar] = innerPriors;
    }
    return crossedPriors;
}

const priors = scaleHistogram(histograms)


fs.writeFileSync("./data/en_us_priors_sequence.json", JSON.stringify(priors, null, 4), "utf8");
