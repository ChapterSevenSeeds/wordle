import _ from "lodash";
import axios from "axios";
import LZUTF8 from "lzutf8";
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormLabel,
    Input,
    Stack,
    useTheme
} from "@mui/joy";
import { Buffer } from "buffer";
import { useCallback, useEffect, useRef, useState } from "react";

export default function App() {
    const [loading, setLoading] = useState(true);
    const [words, setWords] = useState<string[]>([]);
    const [wordLength, setWordLength] = useState(5);
    const [word, setWord] = useState("");

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

    function pickWord() {
        const candidates = words.filter(w => w.length === wordLength);
        const word = _.sample(candidates);
        if (!word) throw new Error("No word found");
        setWord(word);
    }

    if (loading) return <CircularProgress determinate={false} />
    return (
        <Box sx={{ mx: "auto", marginTop: 12 }}>
            <Stack direction="column" spacing={4} justifyContent="center" alignItems="center">
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
                {Boolean(word) && <WordGuesser word={word} maxGuesses={5} />}
            </Stack>
        </Box>
    );
}

function WordGuesser({ word, maxGuesses }: { word: string, maxGuesses: number }) {
    const [guesses, setGuesses] = useState<string[]>(new Array(maxGuesses).fill(" ".repeat(word.length)));
    const theme = useTheme();
    const inputRefs = useRef<HTMLInputElement[][]>([]);

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
        const newGuesses = [...guesses];
        newGuesses[row] = newGuesses[row].substring(0, column) + event.key.toUpperCase() + newGuesses[row].substring(column + 1);
        setGuesses(newGuesses);

        if (column < word.length - 1) {
            inputRefs.current[row][column + 1].focus();
        } else if (row < maxGuesses - 1) {
            inputRefs.current[row + 1][0].focus();
        }
    }

    return (
        <Stack direction="column" spacing={4}>
            {guesses.map((guess, row) => (
                <Stack key={row} direction="row" spacing={2}>
                    {Array.from(guess).map((letter, column) => (
                        <div
                            contentEditable="plaintext-only"
                            ref={refCallback}
                            key={column}
                            style={{
                                width: "80px",
                                height: "80px",
                                padding: 0,
                                borderRadius: theme.radius.md,
                                outline: "none",
                                border: "none",
                                fontSize: "60px",
                                textAlign: "center",
                                backgroundColor: theme.palette.background.surface
                            }}
                            onKeyDown={e => onChange(e, row, column)}
                        >
                            {letter}
                        </div>
                    ))}
                </Stack>
            ))}
        </Stack>
    );
}