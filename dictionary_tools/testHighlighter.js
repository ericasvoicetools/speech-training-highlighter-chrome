const fs = require('fs');

const dictionary = JSON.parse(fs.readFileSync("./data/en_us_replacements.json"));

const ampcodePattern = `(&\\w+;)`;
const tagPattern = "(\\<.*\\>)";
const nonwordPattern = "(\\W)";
const wordPattern = "(\\w+)";
const wordRegexp = new RegExp("^(\\w+)");

const parseRegex = new RegExp([ampcodePattern, tagPattern, nonwordPattern, wordPattern].join("|"), "gm");

function highlightString(text) {
    console.log({text})
    let newString = "";

    for (const group of text.matchAll(parseRegex)) {
        const parseBlock = group[0];
        console.log({parseBlock});
        if (wordRegexp.test(parseBlock)) {
            newString += dictionary[parseBlock.toLowerCase()] ?? parseBlock;
        } else {
            newString += parseBlock;
        }
    }

    console.log({newString});
}

highlightString("\n<span class=\"dropcap\" style=\"font-size: 1.50em\"><span class=\"speech-highligher-voiceless-consonant\">t</span></span>o Sherlock Holmes she\nis always <i><span class=\"speech-highligher-dark-voiced-consonant\">th</span><span class=\"speech-highligher-medium-vowel\">e</span></i> woman. I have seldom heard him mention her under any other\nname. In his eyes she eclipses and predominates the whole of her sex. It was\nnot that he felt any emotion akin to love for Irene Adler. All emotions, and\nthat one particularly, were abhorrent to his cold, precise but admirably\nbalanced mind. He was, I take it, the most perfect reasoning and observing\nmachine that the world has seen, but as a lover he would have placed himself in\na false position. He never spoke of the softer passions, save with a gibe and a\nsneer. They were admirable things for the observer—excellent for drawing\nthe veil from men’s motives and actions. But for the trained reasoner to\nadmit such intrusions into his own delicate and finely adjusted temperament was\nto introduce a distracting factor which might throw a doubt upon all his mental\nresults. Grit in a sensitive instrument, or a crack in one of his own\nhigh-power lenses, would not be more disturbing than a strong emotion in a\nnature such as his. And yet there was but one woman to him, and that woman was\nthe late Irene Adler, of dubious and questionable memory.\n"
)