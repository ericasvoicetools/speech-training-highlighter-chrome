


async function highlightText() {
    const colorMap = {
        "dark-vowel": "#ff0000",
        "medium-vowel": "#8B0000",
        "dark-voiced-consonant": "#0080FF",
        "nasal-consonant": "#DAA520",
        "approximant": "#9ACD32"
    };
    const PREFIX = "speech-highligher";
    const substringMap = {
        "ea": "bright-vowel",
        "oo": "dark-vowel",  // moon
        "ou": "dark-vowel",  // bought, book
        "a": "dark-vowel",   // mama
        "o": "medium-vowel", // boat, mode
        "u": "medium-vowel", // but, mud
        "b": "dark-voiced-consonant",
        "d": "dark-voiced-consonant",
        "g": "dark-voiced-consonant",
        "j": "dark-voiced-consonant",
        "th": "dark-voiced-consonant",
        "ng": "nasal-consonant",
        "r": "approximant",
        "l": "approximant",
        "y": "approximant",
        "w": "approximant",
    }

    async function getSettings() {
        await chrome.storage.sync.get().then(items => Object.assign(colorMap, items));
    }

    await getSettings();

    function makeSubstringCasePermutations(substring) {
        const permutations = [substring, substring.toUpperCase()];
        if (substring.length > 1) {
            permutations.push(`${substring.slice(0,1).toUpperCase()}${substring.slice(1)}`);
        }
        return permutations;
    }

    const compiledSubstringMap = {"&nbsp;": "&nbsp;"};
    for (const [substring, className] of Object.entries(substringMap)) {
        for (const casedSubstr of makeSubstringCasePermutations(substring)) {
            compiledSubstringMap[casedSubstr] = `<span class="${PREFIX}-${className}">${casedSubstr}</span>`
        }
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

    function highlightString(text) {
        let newString = "";
        let tagDepth = 0;
        while (text.length > 0) {
            let newSubstring = text[0];
            let charCount = 1;

            if (text.startsWith("<")) {
                tagDepth++;
            } else if (text.startsWith(">")) {
                tagDepth--;
            }

            if (tagDepth === 0) {
                for (let [substring, span] of Object.entries(compiledSubstringMap)) {
                    if (text.startsWith(substring)) {
                        newSubstring = span;
                        charCount = substring.length;
                        break;
                    }
                }
            }
            newString += newSubstring;
            text = text.slice(charCount);
        }
        return newString;
    }

  for (const element of document.body.getElementsByTagName("*")) {
    for (const child of [...element.children, element]) {
        if (child.className.startsWith && child.className.startsWith(PREFIX)) {
            continue;
        }

        const {innerHTML} = child;
        if (innerHTML && innerHTML.indexOf(PREFIX) < 0) {
            const newHtml = highlightString(innerHTML);
            if (innerHTML !== newHtml) {
                child.innerHTML = newHtml;
            }
        }
    }
  }
  console.log("Done")
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.url.includes('chrome://')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightText
    });
  }
});
