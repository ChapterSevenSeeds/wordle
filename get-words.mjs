import fs from "fs/promises";
import _ from "lodash";
import LZUTF8 from "lzutf8";

const words = (await fs.readFile("./unigram_freq.csv", "utf-8")).toString().split(/\r?\n/).splice(1).map(x => x.split(",")[0]).filter(Boolean);

for (let i = 0; i < _.maxBy(words, x => x.length).length; i++) {
    const ofLength = words.filter(x => x.length === i);
    if (ofLength.length > 0) {
        await fs.writeFile(`public/words/originals/words-${i}.txt`, ofLength.join("\n"));
        await fs.writeFile(`public/words/compressed/words-${i}-compressed.txt`, LZUTF8.compress(ofLength.join("\n")));
    }
}

await fs.writeFile("public/words/originals/words-all.txt", words.join("\n"));
await fs.writeFile("public/words/compressed/words-all-compressed.txt", LZUTF8.compress(words.join("\n")));