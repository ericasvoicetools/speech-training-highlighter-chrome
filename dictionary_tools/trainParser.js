const fs = require('fs');

const file = fs.readFileSync("./data/en_us.json", "utf8");
const dictionary = JSON.parse(file);
const histograms = {};

const ipaClassification = JSON.parse(fs.readFileSync("./data/en_us_ipa_classification.json", "utf8"));
const vowels = new Set(["a", "e", "i", "o", "u", "y"]);

for (const [english, ipa] of Object.entries(dictionary)) {
    const score = (ipaIndex, englishIndex) => {
        const ipaPosition = ipaIndex / Math.max(ipa.length - 1, 1);
        const englishPosition = englishIndex / Math.max(english.length - 1, 1);
        const diff = (ipaPosition - englishPosition) * english.length;
        const gaussedDiff = Math.exp(-(diff * diff) / 3);

        return gaussedDiff;
    }

    let englishIndex = 0;
    for (const engChar of english) {
        const engHistogram = histograms[engChar] ?? {};
        let ipaIndex = 0;
        for (const ipaChar of ipa) {
            if (ipaClassification[ipaChar].indexOf("vowel") >= 0) {
                if (!vowels.has(engChar)) {
                    ipaIndex++;
                    continue;
                }
            }

            if (ipaClassification[ipaChar].indexOf("consonant") >= 0) {
                if (vowels.has(engChar)) {
                    ipaIndex++;
                    continue;
                }
            }

            const ipaKey = `/${ipaChar}/`;
            const charScore = score(ipaIndex, englishIndex);
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
        const innerScaled = {};
        let total = [...Object.values(hist)].reduce((total, value) => total + value, 0);
        for (const [innerChar, value] of Object.entries(hist)) {
            const percentage = value * 100 / total;
            if (percentage >= 0.01) {
                innerScaled[innerChar] = percentage;
            }
        }
        scaled[outerChar] = innerScaled;
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

const priors = scaleHistogram(crossMultiplyHistogram(histograms))


fs.writeFileSync("./data/en_us_priors.json", JSON.stringify(priors, null, 4), "utf8");
