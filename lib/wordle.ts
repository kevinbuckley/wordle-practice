import { MAX_GUESSES, PRACTICE_WORDS, VALID_GUESSES, WORD_LENGTH } from "./word-bank";

export type LetterState = "correct" | "present" | "absent" | "empty";

export interface LetterEvaluation {
  letter: string;
  state: LetterState;
}

export interface GuessResult {
  letters: LetterEvaluation[];
  isCorrect: boolean;
}

export function getRandomSolution(): string {
  const index = Math.floor(Math.random() * PRACTICE_WORDS.length);
  return PRACTICE_WORDS[index];
}

export function isValidGuess(guess: string): boolean {
  const normalized = normalizeGuess(guess);
  return normalized.length === WORD_LENGTH && VALID_GUESSES.has(normalized);
}

export function normalizeGuess(guess: string): string {
  return guess.trim().toLowerCase();
}

export function evaluateGuess(guess: string, solution: string): GuessResult {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedSolution = normalizeGuess(solution);

  const result: LetterEvaluation[] = Array.from({ length: WORD_LENGTH }, (_, index) => ({
    letter: normalizedGuess[index] ?? "",
    state: "empty",
  }));

  if (normalizedGuess.length !== WORD_LENGTH || normalizedSolution.length !== WORD_LENGTH) {
    return { letters: result, isCorrect: false };
  }

  const solutionLetters = normalizedSolution.split("");
  const solutionFrequency = solutionLetters.reduce<Record<string, number>>((acc, letter) => {
    acc[letter] = (acc[letter] ?? 0) + 1;
    return acc;
  }, {});

  // First pass: mark correct letters.
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    const guessLetter = normalizedGuess[i];
    if (guessLetter === solutionLetters[i]) {
      result[i] = { letter: guessLetter, state: "correct" };
      solutionFrequency[guessLetter] -= 1;
    }
  }

  // Second pass: mark present / absent.
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    const current = result[i];
    if (current.state === "correct") continue;

    const guessLetter = normalizedGuess[i];
    if (solutionFrequency[guessLetter] && solutionFrequency[guessLetter] > 0) {
      result[i] = { letter: guessLetter, state: "present" };
      solutionFrequency[guessLetter] -= 1;
    } else {
      result[i] = { letter: guessLetter, state: guessLetter ? "absent" : "empty" };
    }
  }

  const isCorrect = result.every((entry) => entry.state === "correct");
  return { letters: result, isCorrect };
}

export function getEmptyBoard(): LetterEvaluation[][] {
  return Array.from({ length: MAX_GUESSES }, () =>
    Array.from({ length: WORD_LENGTH }, () => ({
      letter: "",
      state: "empty" as LetterState,
    })),
  );
}
