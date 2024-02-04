import _ from "lodash";
import axios from "axios";
import Bimap from "./bimap";
import LZUTF8 from "lzutf8";
import {
    Box,
    Button,
    CircularProgress,
    colors,
    FormControl,
    FormLabel,
    Input,
    Stack,
    Typography,
    useTheme
} from "@mui/joy";
import { Buffer } from "buffer";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

const textToInputRatio = 0.75;
const sampleSize = 10;

export default function App() {
    const [loading, setLoading] = useState(true);
    const [words, setWords] = useState<string[]>([]);
    const [wordLength, setWordLength] = useState(5);
    const [word, setWord] = useState("");
    const [inputWidth, setInputWidth] = useState(0);
    const [level, setLevel] = useState(1);
    const usedWordsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        async function load() {
            const words = await axios.get("/words-compressed.txt", { responseType: "arraybuffer" });
            const decompressed = await new Promise<string>(resolve => LZUTF8.decompressAsync(Buffer.from(words.data), {}, (result: string, err: any) => {
                resolve(result);
            }));
            const allWords = decompressed.split(/\r?\n/).filter(Boolean);
            setWords(allWords);
            setLoading(false);
        }

        load();
    }, []);

    useEffect(() => {
        function handleResize() {
            setInputWidth(Math.min(80, Math.floor((window.innerWidth - wordLength * 8 * 2) / (wordLength))));
        }

        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, [wordLength]);

    function pickWord() {
        const candidates = words.filter(w => w.length === wordLength && !usedWordsRef.current.has(w));
        const word = _.sample(candidates.splice(0, level + sampleSize));
        if (!word) throw new Error("No word found");
        setWord(word);
        console.log(word);
    }

    function nextLevel() {
        usedWordsRef.current.add(word);
        setLevel(level + 1);
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
                                        max: 30,
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
                {Boolean(word) && <WordGuesser key={level} inputSize={inputWidth} word={word} maxGuesses={5} isValidWord={word => words.some(x => word.toLowerCase() === x.toLowerCase())} onNextLevel={nextLevel} />}
            </Stack>
        </Box>
    );
}

function WordGuesser({ word, maxGuesses, isValidWord, inputSize, onNextLevel }: { word: string, maxGuesses: number, isValidWord: (word: string) => boolean, inputSize: number, onNextLevel: () => void }) {
    const [guesses, setGuesses] = useState<string[]>(new Array(maxGuesses).fill(""));
    const [currentRow, setCurrentRow] = useState(0);
    const theme = useTheme();
    const inputRefs = useRef<HTMLInputElement[][]>([]);
    const gameStatus = useMemo(() => {
        if (guesses.slice(0, currentRow).some(guess => guess.toLowerCase() === word.toLowerCase())) return "win";
        if (currentRow >= maxGuesses) return "loss";
        return "playing";
    }, [word, guesses, currentRow, maxGuesses]);

    useEffect(() => {
        setGuesses(new Array(maxGuesses).fill(""));
        setCurrentRow(0);
    }, [word, maxGuesses]);

    const refCallback = useCallback((input: HTMLInputElement) => {
        if (!input) return;
        const lastRow = inputRefs.current[inputRefs.current.length - 1];
        if (!lastRow || lastRow.length === word.length) {
            inputRefs.current.push([input]);
            return;
        }

        lastRow.push(input);
    }, [word.length]);

    function onChange(event: React.KeyboardEvent<HTMLDivElement>, row: number, column: number) {
        if (/^[a-z]$/i.test(event.key)) {
            const newGuesses = [...guesses];
            newGuesses[row] = newGuesses[row].substring(0, column) + event.key.toUpperCase() + newGuesses[row].substring(column + 1);
            setGuesses(newGuesses);

            changeFocus(row, column, "forward");
        } else if (event.key === "Backspace") {
            const newGuesses = [...guesses];
            const previousGuessLength = newGuesses[row].length;
            newGuesses[row] = newGuesses[row].substring(0, column - (previousGuessLength === word.length ? 0 : 1));
            setGuesses(newGuesses);

            if (column !== word.length - 1 || previousGuessLength < word.length) {
                changeFocus(row, column, "backward");
            }
        } else if (event.key === "Enter") {
            submitGuess();
        }
    }

    function changeFocus(row: number, column: number, direction: "forward" | "backward" | "explicit") {
        if (direction === "forward") {
            if (column < word.length - 1) {
                inputRefs.current[row][column + 1].focus();
            }
        } else if (direction === "backward") {
            if (column > 0) {
                inputRefs.current[row][column - 1].focus();
            }
        } else if (direction === "explicit") {
            if (row < maxGuesses && column < word.length) {
                inputRefs.current[row][column].disabled = false;
                inputRefs.current[row][column].focus();
            }
        }
    }

    function submitGuess() {
        if (guesses[currentRow].length === word.length && isValidWord(guesses[currentRow])) {
            setCurrentRow(currentRow + 1);
            changeFocus(currentRow + 1, 0, "explicit");
        }
    }

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

    return (
        <Stack direction="column" spacing={1}>
            {guesses.map((guess, row) => (
                <Stack key={row} direction="row" spacing={1}>
                    {Array.from(getRowData(word, guess, row)).map(({ letter, color }, column) => {
                        const readonly = row > currentRow || gameStatus !== "playing";
                        return (
                            <input
                                ref={refCallback}
                                key={column}
                                value={letter}
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
                                    filter: row > currentRow || (gameStatus !== "playing" && row > currentRow - 1) ? "opacity(0)" : "opacity(1)",
                                    display: gameStatus !== "playing" && row > currentRow - 1 ? "none" : "block"
                                }}
                                onKeyDown={e => onChange(e, row, column)}
                                disabled={readonly}
                            />
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