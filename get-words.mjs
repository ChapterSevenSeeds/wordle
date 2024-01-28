import fs from "fs/promises";
import LZUTF8 from "lzutf8";

const words = (await fs.readFile("./unigram_freq.csv", "utf-8")).toString().split(/\r?\n/).splice(1).map(x => x.split(",")[0]).join("\n");
await fs.writeFile("words.txt", words)
await fs.writeFile("words-compressed.txt", LZUTF8.compress(words));

