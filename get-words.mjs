import fs from "fs/promises";
import _ from "lodash";
import LZUTF8 from "lzutf8";

const allowedWords = new Set((await fs.readFile("./words_alpha.txt", "utf-8")).split(/\r?\n/).filter(Boolean));
const wordsOrderedByFrequency = (await fs.readFile("./unigram_freq.csv", "utf-8")).split(/\r?\n/).splice(1).map(x => x.split(",")[0]).filter(x => Boolean(x) && allowedWords.has(x));

for (let i = 0; i < _.maxBy(wordsOrderedByFrequency, x => x.length).length; i++) {
    const ofLength = wordsOrderedByFrequency.filter(x => x.length === i);
    const ofLengthWithoutRepeatedLetters = ofLength.filter(x => _.uniq(x).length === x.length);
    if (ofLength.length > 0) {
        await fs.writeFile(`public/words/originals/words-${i}.txt`, ofLength.join("\n"));
        await fs.writeFile(`public/words/compressed/words-${i}-compressed.txt`, LZUTF8.compress(ofLength.join("\n")));
        await fs.writeFile(`public/words/originals/words-${i}-unique.txt`, ofLengthWithoutRepeatedLetters.join("\n"));
        await fs.writeFile(`public/words/compressed/words-${i}-unique-compressed.txt`, LZUTF8.compress(ofLengthWithoutRepeatedLetters.join("\n")));
    }
}

await fs.writeFile("public/words/originals/words-all.txt", wordsOrderedByFrequency.join("\n"));
await fs.writeFile("public/words/compressed/words-all-compressed.txt", LZUTF8.compress(wordsOrderedByFrequency.join("\n")));