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
    const rawIpa = dictionary[english] ?? [];
    const ipa = [...rawIpa];
    const paddedEnglish = `^${english.toLowerCase()}$`;
    const attributedEnglish = [];

    for (let i = 0; i < english.length; i++) {
        let expectedSounds = ipaSet;
        if (rawIpa.length > 0) {
            expectedSounds = new Set(ipa.slice(0, 1));
            expectedSounds.add("Ø");

            const lastSound = attributedEnglish[attributedEnglish.length - 1];
            if (lastSound) {
                expectedSounds.add(attributedEnglish[lastSound])
            }
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
                ipaSlice: ipa.slice(0, 3),
                candidates
            })
        }

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

        if (verbose) {
            console.log(likelihoods);
        }

        totalSeqLikelihood = Math.max(totalSeqLikelihood, 1);
        totalCharLikelihood = Math.max(totalCharLikelihood, 1);

        for (const { seqLikelihood, charLikelihood, sound } of likelihoods) {
            const scaledSeqLikelihood = seqLikelihood / totalSeqLikelihood;
            const scaledCharLikelihood = charLikelihood / totalCharLikelihood;

            const curLikelihood = scaledSeqLikelihood +
                scaledCharLikelihood +
                scaledSeqLikelihood * scaledCharLikelihood;

            /*console.log({
                bestLikelihood,
                curLikelihood,
                bestSound,
                sound
            })*/
            
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

    if (deDupString(rawIpa) !== deDupString(attributedEnglish)) {
        console.log({
            english,
            attributedEnglish: attributedEnglish.join(""),
            ipa: deDupString(rawIpa)
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