import axios from 'axios';
import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Add, Delete, Edit } from '@mui/icons-material';
import { Box, colors, FormControl, FormLabel, IconButton, Input, Stack, useTheme } from '@mui/joy';

import { decompress, withLength } from '../utils';
import { getCandidates, Summary } from './utils';

export default function Solver() {
    const [wordLength, setWordLength] = useState(5);
    const [words, setWords] = useState<{ letter: string, color: "orange" | "green" | "none" }[][]>([]);
    const [editingRow, setEditingRow] = useState(-1);
    const [candidates, setCandidates] = useState<string[]>([]);
    const theme = useTheme();
    const allWords = useRef<string[]>([]);

    useEffect(() => {
        async function load() {
            const availableWordsCompressed = await axios.get(`/words/compressed/words-${wordLength}-unique-compressed.txt`, { responseType: "arraybuffer" });
            const availableWords = await decompress(availableWordsCompressed.data);
            allWords.current = availableWords.toUpperCase().split(/\r?\n/).filter(Boolean);
        }

        load();
    }, [wordLength]);

    useEffect(() => {
        const candidates = getCandidates(allWords.current, {
            fixed: _.chain(words.flatMap(word => word.map((x, index) => ({ ...x, index })).filter(letter => letter.color === "green").map(letter => ({ letter: letter.letter, index: letter.index })))).uniqBy(x => x.index).value(),
            requiredLetters: words.flatMap(word => word.filter(x => x.color !== "none").map(letter => letter.letter)).filter(Boolean),
            indexExclusions: _.chain(words
                .flatMap(word => word.map((x, index) => ({ ...x, index }))
                    .filter(letter => letter.color === "orange")
                    .map(letter => ({ letters: [letter.letter], index: letter.index }))))
                .groupBy(x => x.index)
                .entries()
                .reduce((acc, [index, letters]) => {
                    const previousEntry = acc.find(x => x.index === parseInt(index));
                    if (!previousEntry) {
                        acc.push({ index: parseInt(index), letters: _.uniq(letters.flatMap(x => x.letters)) });
                        return acc;
                    } else {
                        previousEntry.letters = _.uniq([...previousEntry.letters, ...letters.flatMap(x => x.letters)]);
                        return acc;
                    }
                }, [] as Summary["indexExclusions"]).value(),
            notInWord: words.flatMap(word => word.filter(letter => letter.color === "none").map(letter => letter.letter))
        });

        setCandidates(candidates);
    }, [allWords, words]);

    const onChange = useCallback((event: KeyboardEvent) => {
        if (editingRow < 0) return;
        const row = editingRow;
        const column = words[row].length;
        if (/^[a-z]$/i.test(event.key)) {
            if (column < wordLength) {
                words[row] = [...words[row], { letter: event.key.toUpperCase(), color: "none" }];
                setWords([...words]);
            }
        } else if (event.key === "Backspace") {
            if (column > 0) {
                words[row] = words[row].slice(0, -1);
                setWords([...words]);
            }
        }
    }, [editingRow, wordLength, words]);

    useEffect(() => {
        document.addEventListener("keydown", onChange);

        return () => document.removeEventListener("keydown", onChange);
    }, [onChange]);

    function handleAdd() {
        setWords([...words, []]);
        setEditingRow(words.length);
    }

    function handleDelete(index: number) {
        setWords(words.filter((_, i) => i !== index));
        setEditingRow(-1);
    }

    function cycleColor(row: number, column: number) {
        const item = words[row][column];
        if (!item) return;

        words[row][column].color = words[row][column].color === "none" ? "orange" : words[row][column].color === "orange" ? "green" : "none";
        setWords([...words]);
    }

    return (
        <Stack spacing={2} alignItems="center" sx={{ padding: theme => theme.spacing(2) }}>
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
            <Stack spacing={2}>
                {words.map((word, wordIndex) => (
                    <Stack key={wordIndex} direction="row" spacing={1} alignItems="center">
                        {Array.from(withLength(word, wordLength, { letter: "", color: "none" })).map((letter, letterIndex) => (
                            <Box
                                key={letterIndex}
                                sx={{
                                    backgroundColor: letter.color === "green" ? theme.palette.success[500] : letter.color === "orange" ? theme.palette.warning[500] : colors.grey[editingRow !== wordIndex ? 700 : 500],
                                    width: "60px",
                                    height: "60px",
                                    borderRadius: "5px",
                                    textAlign: "center",
                                    fontSize: "40px",
                                    color: "white",
                                    cursor: "pointer",
                                    userSelect: "none"
                                }}
                                onClick={() => cycleColor(wordIndex, letterIndex)}
                            >
                                {letter.letter}
                            </Box>
                        ))}
                        {editingRow !== wordIndex &&
                            <IconButton onClick={() => setEditingRow(wordIndex)}>
                                <Edit />
                            </IconButton>
                        }
                        <Box>
                            <IconButton onClick={() => handleDelete(wordIndex)}>
                                <Delete />
                            </IconButton>
                        </Box>
                    </Stack>
                ))}
            </Stack>
            <IconButton onClick={handleAdd}>
                <Add />
            </IconButton>
            <Box sx={{ maxHeight: "600px", overflow: "scroll", padding: theme => theme.spacing(2) }}>
                {candidates.slice(0, 100).map(candidate => <div key={candidate}>{candidate}</div>)}
            </Box>
        </Stack>
    );
}