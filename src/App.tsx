import 'react-simple-keyboard/build/css/index.css';
import './App.css';

import assert from 'assert';
import axios from 'axios';
import { Buffer } from 'buffer';
import _ from 'lodash';
import LZUTF8 from 'lzutf8';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Keyboard from 'react-simple-keyboard';

import {
    Box, Button, CircularProgress, colors, FormControl, FormLabel, Input, Stack, Typography,
    useTheme
} from '@mui/joy';

import Bimap from './bimap';
import LocalStorage from './LocalStorage';

const textToInputRatio = 0.75;
const sampleSize = 500;

async function decompress(buffer: Buffer) {
    return await new Promise<string>(resolve => LZUTF8.decompressAsync(Buffer.from(buffer), {}, (result: string, err: any) => {
        resolve(result);
    }));
}

const allowedGuessesByWordLength: Record<number, number> = {
    1: 19,
    2: 15,
    3: 11,
    4: 8,
    5: 6,
    6: 5,
    7: 5,
    8: 4,
    9: 4,
    10: 3,
    11: 3,
    12: 3,
    13: 3
}

export default function App() {
    const [loading, setLoading] = useState(true);
    const [wordLength, setWordLength] = useState(5);
    const [word, setWord] = useState("");
    const [inputWidth, setInputWidth] = useState(0);
    const levelRef = useRef(1);
    const allWordsRef = useRef<string[]>([]);
    const wordsToPickFromRef = useRef<string[]>([]);
    const usedWordsRef = useRef<Set<string>>(new Set());

    const pickWord = useCallback(() => {
        const candidates = wordsToPickFromRef.current.filter(w => !usedWordsRef.current.has(w));
        const word = _.sample(candidates.splice(0, levelRef.current + sampleSize));
        if (!word) throw new Error("No word found");
        setWord(word);
        console.log(word);
    }, []);

    useEffect(() => {
        async function load() {
            const [wordsToPickFrom, allWords] = await Promise.all([
                axios.get(`/words/compressed/words-${wordLength}-unique-compressed.txt`, { responseType: "arraybuffer" }),
                axios.get(`/words/compressed/words-${wordLength}-compressed.txt`, { responseType: "arraybuffer" })
            ]);
            const [wordsToPickFromDecompressed, allWordsDecompressed] = await Promise.all([
                decompress(wordsToPickFrom.data),
                decompress(allWords.data)
            ]);
            wordsToPickFromRef.current = wordsToPickFromDecompressed.split(/\r?\n/).filter(Boolean);
            allWordsRef.current = allWordsDecompressed.split(/\r?\n/).filter(Boolean);
            setLoading(false);

            const level = LocalStorage.currentLevel;
            levelRef.current = level;
            const usedWords = LocalStorage.usedWords;
            usedWordsRef.current = usedWords;
            if (level > 1) pickWord();
        }

        load();
    }, [pickWord, wordLength]);

    useEffect(() => {
        function handleResize() {
            setInputWidth(Math.min(80, Math.floor((window.innerWidth - wordLength * 8 * 2) / (wordLength))));
        }

        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, [wordLength]);

    const isValidWord = useCallback((word: string) => allWordsRef.current.some(x => word.toLowerCase() === x.toLowerCase()), []);

    function nextLevel() {
        usedWordsRef.current.add(word);
        LocalStorage.usedWords = usedWordsRef.current;
        levelRef.current++;
        LocalStorage.currentLevel = levelRef.current;
        pickWord();
    }

    if (loading) return <CircularProgress determinate={false} />
    return (
        <Box sx={{ mx: "auto", marginTop: 2 }}>
            <Stack direction="column" spacing={4} justifyContent="center" alignItems="center">
                {!Boolean(word) &&
                    <>
                        <FormControl>
                            <FormLabel>Word Length</FormLabel>
                            <Input
                                type="number"
                                slotProps={{
                                    input: {
                                        min: 1,
                                        max: 13,
                                        step: 1
                                    }
                                }}
                                value={wordLength}
                                onChange={e => setWordLength(parseInt(e.target.value))}
                            />
                        </FormControl>
                        <Button variant="solid" onClick={pickWord}>Start</Button>
                    </>
                }
                {Boolean(word) &&
                    <WordGuesser key={levelRef.current} inputSize={inputWidth} word={word} maxGuesses={allowedGuessesByWordLength[word.length]} isValidWord={isValidWord} onNextLevel={nextLevel} />
                }
            </Stack>
        </Box>
    );
}

function WordGuesser({ word, maxGuesses, isValidWord, inputSize, onNextLevel }: { word: string, maxGuesses: number, isValidWord: (word: string) => boolean, inputSize: number, onNextLevel: () => void }) {
    const [guesses, setGuesses] = useState<string[]>([""]);
    const [currentRow, setCurrentRow] = useState(0);
    const keyboardRef = useRef<any>(null);
    const theme = useTheme();
    const gameStatus = useMemo(() => {
        if (guesses.slice(0, currentRow).some(guess => guess.toLowerCase() === word.toLowerCase())) return "win";
        if (currentRow >= maxGuesses) return "loss";
        return "playing";
    }, [word, guesses, currentRow, maxGuesses]);

    const submitGuess = useCallback(() => {
        assert(guesses[currentRow].length === word.length && isValidWord(guesses[currentRow]));
        keyboardRef.current.setInput("");

        setCurrentRow(currentRow + 1);
        if (currentRow >= maxGuesses - 1 || guesses.some(x => x.toLowerCase() === word.toLowerCase())) return;
        setGuesses([...guesses, ""]);
    }, [currentRow, guesses, isValidWord, maxGuesses, word]);

    const onChange = useCallback((event: KeyboardEvent) => {
        if (gameStatus !== "playing") return;

        const row = currentRow;
        const column = guesses[row].length;
        if (/^[a-z]$/i.test(event.key)) {
            guesses[row] = (guesses[row] + event.key.toUpperCase()).substring(0, word.length);
            keyboardRef.current.setInput(guesses[row]);
            setGuesses([...guesses]);
        } else if (event.key === "Backspace") {
            guesses[row] = guesses[row].substring(0, column - 1) + guesses[row].substring(column);
            keyboardRef.current.setInput(guesses[row]);
            setGuesses([...guesses]);
        } else if (event.key === "Enter") {
            if (guesses[row].length === word.length && isValidWord(guesses[row])) {
                submitGuess();
            }
        }
    }, [currentRow, gameStatus, guesses, isValidWord, submitGuess, word.length]);

    useEffect(() => {
        document.addEventListener("keydown", onChange);

        return () => document.removeEventListener("keydown", onChange);
    }, [onChange]);

    useEffect(() => {
        setGuesses([""]);
        setCurrentRow(0);
    }, [word, maxGuesses]);

    function getRowData(word: string, guess: string, row: number) {
        if (row >= currentRow) return new Array(word.length).fill("").map((_, i) => ({ letter: guess[i] ?? "", color: row === currentRow && guess.length === word.length && isValidWord(guess) ? colors.grey[500] : colors.grey[700], index: i }));

        const fullGuess = Array.from(withLength(guess, word.length));
        const wordArray = Array.from(word);
        const guessLetterIndexToWordLetterIndexMapping = new Bimap<number, number>();
        for (const [guessIndex, mapsToWordIndex] of fullGuess.map((_, i) => [i, -1])) {
            guessLetterIndexToWordLetterIndexMapping.set(guessIndex, mapsToWordIndex);
        }

        // See if the guess has any correct letters in the correct position
        for (let i = 0; i < wordArray.length; i++) {
            if (guess[i]?.toLowerCase() === wordArray[i].toLowerCase()) {
                guessLetterIndexToWordLetterIndexMapping.set(i, i);
            }
        }

        // See if the guess has any correct letters in the wrong position (but not already mapped to another letter in the word)
        for (let i = 0; i < fullGuess.length; i++) {
            if (guessLetterIndexToWordLetterIndexMapping.getByKey(i) !== undefined && guessLetterIndexToWordLetterIndexMapping.getByKey(i) !== -1) continue;
            const index = wordArray.findIndex((letter, wordLetterIndex) => letter === guess[i]?.toLowerCase() && (guessLetterIndexToWordLetterIndexMapping.getByValue(wordLetterIndex) === undefined || guessLetterIndexToWordLetterIndexMapping.getByValue(wordLetterIndex) === -1));
            if (index !== -1) {
                guessLetterIndexToWordLetterIndexMapping.set(i, index);
            }
        }

        return _.orderBy(Array.from(guessLetterIndexToWordLetterIndexMapping), x => x[0]).map(([guessIndex, wordIndex]) => {
            if (wordIndex === -1) {
                return { letter: guess[guessIndex], color: colors.grey[600], index: guessIndex };
            }

            if (wordIndex === guessIndex) return { letter: guess[guessIndex], color: theme.palette.success[500], index: guessIndex };

            return { letter: guess[guessIndex], color: theme.palette.warning[500], index: guessIndex };
        });
    }

    function getKeyboardStyles() {
        const keyStyles: { "key-success": Set<string>, "key-warning": Set<string>, "key-disabled": Set<string> } = {
            "key-success": new Set<string>(),
            "key-warning": new Set<string>(),
            "key-disabled": new Set<string>()
        };
        for (const guess of guesses.slice(0, currentRow)) {
            for (let i = 0; i < guess.length; i++) {
                if (guess[i].toLowerCase() === word[i].toLowerCase()) {
                    keyStyles["key-success"].add(guess[i].toUpperCase());
                    if (keyStyles["key-warning"].has(guess[i].toUpperCase())) keyStyles["key-warning"].delete(guess[i].toUpperCase());
                } else if (word.includes(guess[i].toLowerCase()) && !keyStyles["key-success"].has(guess[i])) {
                    keyStyles["key-warning"].add(guess[i].toUpperCase());
                } else if (!word.includes(guess[i].toLowerCase()) && !keyStyles["key-warning"].has(guess[i].toUpperCase()) && !keyStyles["key-success"].has(guess[i].toUpperCase())) {
                    keyStyles["key-disabled"].add(guess[i].toUpperCase());
                }
            }
        }

        return Object.entries(keyStyles).filter(x => x[1].size > 0).map(([className, keys]) => ({ class: className, buttons: Array.from(keys).join(" ") }));
    }

    function onTextChange(text: string) {
        text = text.substring(0, word.length);
        keyboardRef.current.setInput(text);
        setGuesses([...guesses.slice(0, currentRow), text, ...guesses.slice(currentRow + 1)]);
    }

    return (
        <Stack direction="column" spacing={1}>
            {guesses.map((guess, row) => (
                <Stack key={row} direction="row" spacing={1}>
                    {Array.from(getRowData(word, guess, row)).map(({ letter, color }, column) => {
                        return (
                            <div
                                key={column}
                                className="letter"
                                style={{
                                    width: `${inputSize}px`,
                                    height: `${inputSize}px`,
                                    padding: 0,
                                    borderRadius: theme.radius.md,
                                    outline: "none",
                                    border: "none",
                                    fontSize: `${inputSize * textToInputRatio}px`,
                                    textAlign: "center",
                                    backgroundColor: color,
                                }}
                            >
                                {letter}
                            </div>
                        );
                    })}
                </Stack>
            ))}
            {gameStatus === "loss" &&
                <Typography fontSize="20px" variant="plain" color="danger">You lost! The word was {word}.</Typography>
            }
            {gameStatus === "win" &&
                <Typography fontSize="20px" variant="plain" color="success">You won!</Typography>
            }
            {gameStatus !== "playing" && <Button onClick={onNextLevel}>Next Level</Button>}
            {gameStatus === "playing" &&
                <>
                    {guesses[currentRow].length === word.length && !isValidWord(guesses[currentRow]) && <Typography fontSize="20px" variant="plain" color="danger">Not a valid word</Typography>}
                    {guesses[currentRow].length < word.length && <Typography fontSize="20px" variant="plain" color="warning">Enter a {word.length}-letter word</Typography>}
                    {guesses[currentRow].length === word.length && isValidWord(guesses[currentRow]) && <Button onClick={submitGuess}>Submit</Button>}
                    <Keyboard
                        layoutName="default"
                        layout={{
                            default: [
                                "Q W E R T Y U I O P",
                                "A S D F G H J K L",
                                "Z X C V B N M {backspace}",
                            ]
                        }}
                        display={{
                            "{backspace}": "⌫",
                        }}
                        theme="hg-theme-default myTheme1"
                        keyboardRef={r => keyboardRef.current = r}
                        onChange={onTextChange}
                        buttonTheme={getKeyboardStyles()}
                    />
                </>
            }
        </Stack>
    );
}

function* withLength(str: string, length: number) {
    let i = 0;
    while (i < length && i < str.length) {
        yield str[i];
        i++;
    }

    while (i < length) {
        yield "";
        i++;
    }
}