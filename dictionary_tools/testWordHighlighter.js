const fs = require('fs');

const dictionary = JSON.parse(fs.readFileSync("./data/en_us.json", "utf8"));
const priors = JSON.parse(fs.readFileSync("./data/en_us_priors_sequence.json", "utf8"));
const singleCharPriors = JSON.parse(fs.readFileSync("./data/en_us_priors.json", "utf8"));
const allIpa = JSON.parse(fs.readFileSync("./data/en_us_ipa_sounds.json", "utf8"));
const ipaSet = new Set(allIpa);
const ipaClassification = JSON.parse(fs.readFileSync("./data/en_us_ipa_classification.json", "utf8"));

const unknownSequencePriors = Object.fromEntries(allIpa.map(x => [x, 0]));

function deDupString(str) {
    let deDupped = "";
    let prevChar = "";
    for (const char of str) {
        if (char !== prevChar && char !== "Ø") {
            deDupped += char;
            prevChar = char;
        }
    }
    return deDupped;
}

//let mismatches = 0;
//let total = 0;

function getPriorsForSlice(slice, expectedSounds) {
    const slicePriors = {};

    for (const sound of expectedSounds) {
        slicePriors[sound] = 0;
    }

    const slices = (slice.includes("^") || slice.includes("$")) ? [slice] : [slice, `^${slice.slice(1)}`, `${slice.slice(0, 2)}$`];

    for (substr of slices) {
        const subPriors = priors[substr] ?? {};
        for (const sound of expectedSounds) {
            slicePriors[sound] += subPriors[sound] ?? 0;
        }
    }
    
    return slicePriors;
}

function soundsForWord(rawEnglish, dontUseDictionary) {
    const english = rawEnglish.toLowerCase();
    const rawIpa = dontUseDictionary ? [] : dictionary[english] ?? [];
    const ipa = [...rawIpa];
    const paddedEnglish = `^${english.toLowerCase()}$`;
    const attributedEnglish = [];

    for (let i = 0; i < english.length; i++) {
        let expectedSounds = ipaSet;
        if (rawIpa.length > 0) {
            expectedSounds = new Set(ipa.slice(0, 1));
            expectedSounds.add("Ø");

            const lastSound = attributedEnglish[attributedEnglish.length - 1];
            const soundBeforeLast = attributedEnglish[attributedEnglish.length - 2];
            if (lastSound && lastSound !== soundBeforeLast) {
                expectedSounds.add(lastSound);
            }
        }

        substr = paddedEnglish.slice(i, i + 3);
        const candidates = getPriorsForSlice(substr, expectedSounds);

        let bestSound = "Ø";
        let bestLikelihood = 0;
        const middleCharPriors = singleCharPriors[substr[1]];

        let totalSeqLikelihood = 0;
        let totalCharLikelihood = 0;

        const likelihoods = [...expectedSounds].map(sound => {
            const seqLikelihood = candidates[sound] ?? 0;
            const charLikelihood = middleCharPriors[`/${sound}/`] ?? 0;
            
            totalSeqLikelihood += seqLikelihood;
            totalCharLikelihood += charLikelihood;

            return { seqLikelihood, charLikelihood, sound };
        });

        totalSeqLikelihood = Math.max(totalSeqLikelihood, 1);
        totalCharLikelihood = Math.max(totalCharLikelihood, 1);

        for (const { seqLikelihood, charLikelihood, sound } of likelihoods) {
            const scaledSeqLikelihood = seqLikelihood / totalSeqLikelihood;
            const scaledCharLikelihood = charLikelihood / totalCharLikelihood;

            const curLikelihood = scaledSeqLikelihood +
                scaledCharLikelihood +
                scaledSeqLikelihood * scaledCharLikelihood;
            
            if (curLikelihood > bestLikelihood) {
                bestLikelihood = curLikelihood;
                bestSound = sound;
            }
        }
        attributedEnglish.push(bestSound);
        const ipaSpliceIndex = ipa.indexOf(bestSound);
        if (ipaSpliceIndex >= 0) {
            ipa.splice(ipaSpliceIndex, 1);
        }
    }

    if (ipa.length > 0) {
        console.log("fallback")
        return soundsForWord(rawEnglish, true);
    }

    return attributedEnglish;
}


const colorMapConsole = {
    "dark-vowel": "31",
    "medium-vowel": "31",
    "dark-voiced-consonant": "34",
    "nasal-consonant": "33",
    "approximant": "32",
    "bright-voiced-consonant": "37",
    "voiceless-consonant": "37",
    "bright-vowel": "37",
    "silent": "37",
};

function tagColorConsole(sound, text) {
    return `\u001b[${colorMapConsole[sound]}m${text}`
}

function tagColorHtml(sound, text) {
    return `<span class=speech-highligher-${sound}>${text}</span>`
}

function classifyRuns(english) {
    ipa = soundsForWord(english);
    const runs = [];
    let currentRun = {};
    console.log(ipa, english);
    for (let i = 0; i < ipa.length; i++) {
        const sound = ipaClassification[ipa[i]];
        if (sound === currentRun.sound) {
            currentRun.length++;
            currentRun.text += english[i];
        } else {
            currentRun = {
                sound,
                length: 1,
                text: english[i]
            }
            runs.push(currentRun);
        }
    }
    return runs;
}

function highlightWord(word) {
    const runs = classifyRuns(word);
    let highlighted = "";

    for (const { sound, text } of runs) {
        highlighted += tagColorConsole(sound, text);
    }

    return highlighted;
}

console.log(highlightWord(process.argv[2] ?? "color"));

//console.log(soundsForWord(process.argv[2] ?? "color", true))
