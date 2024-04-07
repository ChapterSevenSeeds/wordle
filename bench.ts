import fs from 'fs/promises';
import _ from 'lodash';

const wordsCache: Record<number, string[]> = {};

async function getWords(length: number) {
    if (wordsCache[length]) return wordsCache[length];
    const words = (await fs.readFile(`./public/words/originals/words-${length}-unique.txt`, "utf-8")).split(/\r?\n/).filter(Boolean);
    wordsCache[length] = words;
    return words;
}

function submitGuess(word: string, guess: string, previousSummary?: Summary | undefined): Summary | "win" {
    if (word === guess) return "win";

    previousSummary ??= {
        fixed: [],
        requiredLetters: [],
        indexExclusions: [],
        notInWord: []
    };
    const guessChars = Array.from(guess);
    const fixed = guessChars.map((guessChar, charIndex) => ({ char: guessChar, index: charIndex })).filter(guessChar => word[guessChar.index] === guessChar.char);
    previousSummary.fixed = _.uniqBy([...previousSummary.fixed, ...fixed.map(x => ({ letter: x.char, index: x.index }))], x => x.index);

    const requiredLetters = guessChars.filter(x => word.includes(x));
    previousSummary.requiredLetters = _.uniq([...previousSummary.requiredLetters, ...requiredLetters]);

    const indexExclusions = guessChars.map((guessChar, charIndex) => ({ char: guessChar, index: charIndex })).filter(guessChar => word.includes(guessChar.char) && word[guessChar.index] !== guessChar.char)
    for (const exclusion of indexExclusions) {
        const previousExclusion = previousSummary.indexExclusions.find(x => x.index === exclusion.index);
        if (!previousExclusion) {
            previousSummary.indexExclusions.push({
                index: exclusion.index,
                letters: [exclusion.char]
            })
        } else {
            previousExclusion.letters = _.uniq([...previousExclusion.letters, exclusion.char]);
        }
    }

    const notInWord = guessChars.filter(x => !word.includes(x));
    previousSummary.notInWord = _.uniq([...previousSummary.notInWord, ...notInWord]);

    return previousSummary;
}

(async () => {
    const trials = 10000;
    for (let wordLength = 12; wordLength <= 23; ++wordLength) {
        const allGuessesForRun: number[] = [];
        for (let i = 0; i < trials; ++i) {
            const word = _.sample(await getWords(wordLength));
            if (!word) return;
            let summary: Summary = {
                fixed: [],
                indexExclusions: [],
                requiredLetters: [],
                notInWord: []
            };
            let guesses = 0;
            for (; ;) {
                const candidates = await getCandidates(wordLength, summary);
                const guess = _.sample(candidates);
                if (!guess) return;
                ++guesses;
                const result = submitGuess(word, guess, summary);
                if (result === "win") break;
                summary = result;
            }
            
            allGuessesForRun.push(guesses);
        }

        const mean = _.mean(allGuessesForRun);
        console.log(`Word length: ${wordLength}, Average guesses before a win: ${mean}, Recommended guesses: ${Math.ceil(mean * 1.3682074202449091282238387339521)}`);
    }
})();