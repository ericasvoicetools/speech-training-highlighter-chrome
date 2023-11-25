const fs = require('fs');

const file = fs.readFileSync("./data/en_us.json", "utf8");
const dictionary = JSON.parse(file);
const histograms = {};

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
        const engHistogram = histograms[engSubstr] ?? {};
        let ipaIndex = 0;
        for (const ipaChar of ipa) {
            const ipaKey = `/${ipaChar}/`;

            const charScore = score(ipaIndex, englishIndex, engSubstr, ipaKey);
            engHistogram[ipaChar] = (engHistogram[ipaChar] ?? 0) + charScore;

            const ipaHistogram = histograms[ipaKey] ?? {};
            ipaHistogram[engSubstr] = (ipaHistogram[engSubstr] ?? 0) + charScore;
            histograms[ipaKey] = ipaHistogram;

            ipaIndex++;
        }
        histograms[engSubstr] = engHistogram;
        englishIndex++;
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
            if (percentage >= 0.01) {
                innerScaled[innerChar] = percentage;
            }
        }
        if ([...Object.keys(innerScaled)].length > 0) {
            scaled[outerChar] = innerScaled;
        }
    }
    return scaled;
}

const priors = scaleHistogram(histograms)


fs.writeFileSync("./data/en_us_priors_sequence.json", JSON.stringify(priors, null, 4), "utf8");
