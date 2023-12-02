
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

    const dictionaryFile = chrome.runtime.getURL("en_us_replacements.json");
    const dictionary = await (await fetch(dictionaryFile)).json();

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
    const tagPattern = "(\\<.*\\>)";
    const nonwordPattern = "(\\W)";
    const wordPattern = "(\\w+)";
    const wordRegexp = new RegExp("^(\\w+)");
    
    const parseRegex = new RegExp([ampcodePattern, tagPattern, nonwordPattern, wordPattern].join("|"), "gm");
    
    function highlightString(text) {
        let newString = "";
    
        for (const group of text.matchAll(parseRegex)) {
            const parseBlock = group[0];
            if (wordRegexp.test(parseBlock)) {
                newString += dictionary[parseBlock.toLowerCase()] ?? parseBlock;
            } else {
                newString += parseBlock;
            }
        }
    
        return newString;
    }

  const elements = [
    ...document.body.getElementsByTagName("p"),
    ...document.body.getElementsByTagName("P"),
    ...document.body.getElementsByTagName("h*"),
    ...document.body.getElementsByTagName("H*"),
    ...document.body.getElementsByTagName("ol"),
    ...document.body.getElementsByTagName("ul"),
  ]
  for (const element of elements) {
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
