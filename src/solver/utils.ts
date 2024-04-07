export type Summary = {
    fixed: { letter: string, index: number }[],
    requiredLetters: string[],
    indexExclusions: { letters: string[], index: number }[],
    notInWord: string[]
};

export function getCandidates(words: string[], summary: Summary) {
    const wordsWithRequiredLetters = words.filter(candidateWord => summary.requiredLetters.every(letter => candidateWord.includes(letter)));
    const wordsWithFixedLetters = wordsWithRequiredLetters.filter(candidateWord => summary.fixed.every(fixed => candidateWord[fixed.index] === fixed.letter));
    const wordsWithIndexExclusions = wordsWithFixedLetters.filter(candidateWord => summary.indexExclusions.every(exclusion => !exclusion.letters.includes(candidateWord[exclusion.index])));
    const wordsWithExcludedLettersRemoved = wordsWithIndexExclusions.filter(candidateWord => summary.notInWord.every(character => !candidateWord.includes(character)));

    return wordsWithExcludedLettersRemoved;
}