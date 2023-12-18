
async function highlightText() {
    const colorMap = {
        "dark-vowel": "#ff0000",
        "medium-vowel": "#8B0000",
        "dark-voiced-consonant": "#0080FF",
        "nasal-consonant": "#DAA520",
        "approximant": "#9ACD32",
        "bright-voiced-consonant": "#000000",
        "voiceless-consonant": "#000000",
        "bright-vowel": "#000000",
        "silent": "#000000"
    };
    const PREFIX = "speech-highligher";

    async function getSettings() {
        await chrome.storage.sync.get().then(items => Object.assign(colorMap, items));
    }

    await getSettings();

    async function readFileAsJson(filename) {
        const file = await chrome.runtime.getURL(filename);
        const json = await (await fetch(file)).json();
        return json;
    }

    const dictionary = await readFileAsJson("data/en_us.json");
    const priors = await readFileAsJson("data/en_us_priors_sequence.json");
    const singleCharPriors = await readFileAsJson("data/en_us_priors.json");
    const ipaClassification = await readFileAsJson("data/en_us_ipa_classification.json");
    const ipaSet = new Set(Object.keys(ipaClassification));

    const unknownSequencePriors = Object.fromEntries([...ipaSet.keys()].map(x => [x, 0]));
    
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
                if (lastSound && ipa.length < (english.length - i)) {
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
            return soundsForWord(rawEnglish, true);
        }
    
        return attributedEnglish;
    }

    function tagColorHtml(sound, text) {
        return `<span class=speech-highligher-${sound}>${text}</span>`
    }
    
    function classifyRuns(english) {
        ipa = soundsForWord(english);
        const runs = [];
        let currentRun = {};
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
            highlighted += tagColorHtml(sound, text);
        }
    
        return highlighted;
    }

    const speechStyle = document.createElement("style");
    speechStyle.id = PREFIX;
    speechStyle.type = "text/css";
    let innerHTML = ""
    for ([classname, color] of Object.entries(colorMap)) {
        innerHTML += `
.${PREFIX}-${classname} {
    color: ${color};
}
`;
    }
    speechStyle.innerHTML = innerHTML
    
    const oldSpeechStyle = document.getElementById(PREFIX);
    if (oldSpeechStyle) {
        oldSpeechStyle.replaceWith(speechStyle);
    } else {
        document.head.appendChild(speechStyle);
    }

    const ampcodePattern = `(&\\w+;)`;
    const tagPattern = "(\\<.*?\\>)";
    const nonwordPattern = "([^a-zA-Z\-'])";
    const wordPattern = "([A-Za-z\-']+)";
    const wordRegexp = new RegExp("^([A-Za-z]+)");
    
    const parseRegex = new RegExp([ampcodePattern, tagPattern, nonwordPattern, wordPattern].join("|"), "gm");
    
    function highlightString(text) {
        let newString = "";
    
        for (const group of text.matchAll(parseRegex)) {
            const parseBlock = group[0];
            if (wordRegexp.test(parseBlock)) {
                newString += highlightWord(parseBlock);
            } else {
                newString += parseBlock;
            }
        }
    
        return newString;
    }


    const tags = [
        "p", "div", "td", "ol", "ul",
        "h1", "h2", "h3", "h4", "h5", "h6"
    ];

  for (const element of document.body.querySelectorAll(tags, tags.map(x => x.toUpperCase()))) {
    if (element.className.startsWith && element.className.startsWith(PREFIX)) {
        continue;
    }

    const {innerHTML} = element;
    if (innerHTML && innerHTML.indexOf(PREFIX) < 0) {
        const newHtml = highlightString(innerHTML);
        if (innerHTML !== newHtml) {
            element.innerHTML = newHtml;
        }
    }
    }
  console.log("Done.")
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.url.includes('chrome://')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightText
    });
  }
});
