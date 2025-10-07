import solutions from "../data/solutions.json";
import valid from "../data/valid.json";

export const PRACTICE_WORDS: readonly string[] = solutions;
export const VALID_GUESSES = new Set<string>([...valid]);

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
