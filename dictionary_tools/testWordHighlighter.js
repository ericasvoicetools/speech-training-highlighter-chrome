const fs = require('fs');

const dictionary = JSON.parse(fs.readFileSync("./data/en_us.json", "utf8"));
const priors = JSON.parse(fs.readFileSync("./data/en_us_priors_sequence.json", "utf8"));
const singleCharPriors = JSON.parse(fs.readFileSync("./data/en_us_priors.json", "utf8"));
const allIpa = JSON.parse(fs.readFileSync("./data/en_us_ipa_sounds.json", "utf8"));
const ipaSet = new Set(allIpa);

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

let mismatches = 0;
let total = 0;

function soundsForWord(english, verbose) {
    const rawIpa = dictionary[english];
    const ipa = ["Ø", ...rawIpa, "Ø"];
    const paddedEnglish = `^${english.toLowerCase()}$`;
    const attributedEnglish = [];

    for (let i = 0; i < english.length; i++) {
        let expectedSounds = ipaSet;
        let ipaSlice = [];
        if (rawIpa) {
            const rawIpaPosition = i * rawIpa.length / english.length;
            const ipaPosition = rawIpaPosition + 1;
            ipaSlice = ipa.slice(
                Math.max(0, Math.round(ipaPosition - 1.5)),
                Math.min(ipa.length, Math.round(ipaPosition + 1.5))
            );
            expectedSounds = new Set(ipaSlice);
        }

        substr = paddedEnglish.slice(i, i + 3);
        const candidates = Object.fromEntries(Object.entries(priors[substr] ?? unknownSequencePriors).filter(
            entry => expectedSounds.has(entry[0])
        ));

        if (verbose) {
            console.log({
                paddedEnglish,
                dict: dictionary[english],
                expectedSounds,
                substr,
                ipaSlice,
                candidates
            })
        }

        let bestSound = "Ø";
        let bestLikelihood = 0;
        const middleCharPriors = singleCharPriors[substr[1]];
        for (const sound of ipaSlice) {
            const seqLikelihood = candidates[sound] ?? 0.1;
            const charLikelihood = middleCharPriors[`/${sound}/`] ?? 0.1;
            const curLikelihood = seqLikelihood + charLikelihood + seqLikelihood * charLikelihood;
            
            if (verbose) {
                console.log({
                    sound,
                    seqLikelihood,
                    middleCharPriors: middleCharPriors[`/${sound}/`],
                    bestLikelihood,
                    bestSound,
                    curLikelihood,
                    char: substr[1],
                })
            }
            if (curLikelihood > bestLikelihood) {
                bestLikelihood = curLikelihood;
                bestSound = sound;
            }
        }
        attributedEnglish.push(bestSound);
    }

    if (deDupString(ipa) !== deDupString(attributedEnglish)) {
        console.log({
            english,
            attributedEnglish: attributedEnglish.join(""),
            ipa: deDupString(ipa),
            //reconstructedIpa: deDupString(attributedEnglish)
        });
        mismatches++;
    }
    total++;
}

if (process.argv[2]) {
    soundsForWord(process.argv[2] ?? "", true);
} else {
    for (const word of Object.keys(dictionary)) {
        soundsForWord(word);
    }
}


console.log(`${mismatches} out of ${total}`)