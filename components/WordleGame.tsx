"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  LetterEvaluation,
  LetterState,
  evaluateGuess,
  getEmptyBoard,
  getRandomSolution,
  isValidGuess,
  normalizeGuess,
} from "../lib/wordle";
import { MAX_GUESSES, WORD_LENGTH } from "../lib/word-bank";

type GameStatus = "playing" | "won" | "lost";

type KeyboardState = Record<string, LetterState | undefined>;

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const STATS_STORAGE_KEY = "wordle-practice/stats";

interface GameStats {
  totalPlayed: number;
  totalWon: number;
  currentStreak: number;
  maxStreak: number;
}

const DEFAULT_STATS: GameStats = {
  totalPlayed: 0,
  totalWon: 0,
  currentStreak: 0,
  maxStreak: 0,
};

export function WordleGame() {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [board, setBoard] = useState<LetterEvaluation[][]>(() => getEmptyBoard());
  const [currentRow, setCurrentRow] = useState(0);
  const [currentGuess, setCurrentGuess] = useState("");
  const [solution, setSolution] = useState(() => getRandomSolution());
  const [status, setStatus] = useState<GameStatus>("playing");
  const [alert, setAlert] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState<KeyboardState>({});
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [, startTransition] = useTransition();

  const setGuessValue = useCallback((value: string) => {
    const sanitized = value.replace(/[^a-z]/gi, "").slice(0, WORD_LENGTH).toLowerCase();
    setCurrentGuess(sanitized);
  }, []);

  const focusHiddenInput = useCallback(() => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 0);
  }, []);

  const handleBoardActivate = useCallback(() => {
    if (status !== "playing") return;
    focusHiddenInput();
  }, [focusHiddenInput, status]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (status !== "playing") {
        setGuessValue("");
        return;
      }
      setGuessValue(event.target.value);
    },
    [setGuessValue, status],
  );

  const handleInputFocus = useCallback(() => setIsInputFocused(true), []);
  const handleInputBlur = useCallback(() => setIsInputFocused(false), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GameStats>;
        setStats({
          totalPlayed: parsed.totalPlayed ?? DEFAULT_STATS.totalPlayed,
          totalWon: parsed.totalWon ?? DEFAULT_STATS.totalWon,
          currentStreak: parsed.currentStreak ?? DEFAULT_STATS.currentStreak,
          maxStreak: parsed.maxStreak ?? DEFAULT_STATS.maxStreak,
        });
      }
    } catch {
      setStats(DEFAULT_STATS);
    } finally {
      setStatsLoaded(true);
    }
  }, []);

  const boardWithCurrentGuess = useMemo(() => {
    return board.map((row, rowIndex) => {
      if (rowIndex !== currentRow) return row;
      return row.map((cell, cellIndex) => {
        if (cell.state !== "empty") return cell;
        const letter = currentGuess[cellIndex] ?? "";
        return { letter, state: "empty" };
      });
    });
  }, [board, currentRow, currentGuess]);

  const showAlert = useCallback((message: string) => {
    setAlert(message);
    const timeout = setTimeout(() => setAlert(null), 1800);
    return () => clearTimeout(timeout);
  }, []);

  const updateKeyboardState = useCallback((evaluations: LetterEvaluation[]) => {
    setKeyboard((prev) => {
      const next = { ...prev };
      for (const entry of evaluations) {
        const letter = entry.letter.toUpperCase();
        if (!letter) continue;

        const existing = next[letter];
        if (entry.state === "correct") {
          next[letter] = "correct";
        } else if (entry.state === "present" && existing !== "correct") {
          next[letter] = "present";
        } else if (!existing || existing === "empty") {
          next[letter] = entry.state;
        }
      }
      return next;
    });
  }, []);

  const persistStats = useCallback((next: GameStats) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const finalizeGame = useCallback(
    (didWin: boolean) => {
      setStatus(didWin ? "won" : "lost");
      setStats((prev) => {
        const totalPlayed = prev.totalPlayed + 1;
        const totalWon = prev.totalWon + (didWin ? 1 : 0);
        const currentStreak = didWin ? prev.currentStreak + 1 : 0;
        const maxStreak = didWin ? Math.max(prev.maxStreak, currentStreak) : prev.maxStreak;
        const nextStats: GameStats = {
          totalPlayed,
          totalWon,
          currentStreak,
          maxStreak,
        };
        persistStats(nextStats);
        return nextStats;
      });
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          hiddenInputRef.current?.blur();
        }, 0);
      }
    },
    [hiddenInputRef, persistStats],
  );

  const commitGuess = useCallback(
    (guess: string) => {
      if (status !== "playing") return;

      if (guess.length !== WORD_LENGTH) {
        showAlert("Not enough letters");
        return;
      }

      const normalized = normalizeGuess(guess);
      if (!isValidGuess(normalized)) {
        showAlert("Not in word list");
        return;
      }

      const evaluation = evaluateGuess(normalized, solution);
      setBoard((prev) => {
        const next = prev.map((row) => row.slice());
        next[currentRow] = evaluation.letters;
        return next;
      });

      updateKeyboardState(evaluation.letters);

      if (evaluation.isCorrect) {
        finalizeGame(true);
        showAlert("Splendid!");
      } else if (currentRow + 1 === MAX_GUESSES) {
        finalizeGame(false);
        showAlert(solution.toUpperCase());
      } else {
        setCurrentRow((prev) => prev + 1);
      }
      setGuessValue("");
    },
    [currentRow, finalizeGame, setGuessValue, showAlert, solution, status, updateKeyboardState],
  );

  const handleLetter = useCallback(
    (letter: string) => {
      if (status !== "playing") return;
      if (currentGuess.length >= WORD_LENGTH) return;
      setGuessValue(`${currentGuess}${letter}`);
      if (isInputFocused) focusHiddenInput();
    },
    [currentGuess, focusHiddenInput, isInputFocused, setGuessValue, status],
  );

  const handleBackspace = useCallback(() => {
    if (status !== "playing") return;
    setGuessValue(currentGuess.slice(0, -1));
    if (isInputFocused) focusHiddenInput();
  }, [currentGuess, focusHiddenInput, isInputFocused, setGuessValue, status]);

  const handleEnter = useCallback(() => {
    if (status !== "playing") return;
    commitGuess(currentGuess);
    if (isInputFocused) focusHiddenInput();
  }, [commitGuess, currentGuess, focusHiddenInput, isInputFocused, status]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const { key } = event;
      if (status !== "playing") {
        event.preventDefault();
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        commitGuess(currentGuess);
        return;
      }
      if (
        key === "Backspace" ||
        key === "Tab" ||
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown"
      ) {
        return;
      }
      if (/^[a-zA-Z]$/.test(key)) {
        return;
      }
      if (key.length === 1) {
        event.preventDefault();
      }
    },
    [commitGuess, currentGuess, status],
  );

  const handlePhysicalKeyboard = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;

      if (key === "Enter") {
        event.preventDefault();
        handleEnter();
        return;
      }

      if (key === "Backspace") {
        event.preventDefault();
        handleBackspace();
        return;
      }

      if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        handleLetter(key.toLowerCase());
      }
    },
    [handleBackspace, handleEnter, handleLetter],
  );

  useEffect(() => {
    window.addEventListener("keydown", handlePhysicalKeyboard);
    return () => window.removeEventListener("keydown", handlePhysicalKeyboard);
  }, [handlePhysicalKeyboard]);

  const startNewGame = useCallback(() => {
    startTransition(() => {
      setBoard(getEmptyBoard());
      setCurrentRow(0);
      setGuessValue("");
      setStatus("playing");
      setKeyboard({});
      setAlert(null);
      setSolution(getRandomSolution());
    });
    if (isInputFocused) {
      focusHiddenInput();
    }
  }, [focusHiddenInput, isInputFocused, setGuessValue]);

  return (
    <div className="relative flex w-full max-w-3xl flex-col items-center gap-5 sm:gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-zinc-500">
          <span>Practice Mode</span>
          <span aria-hidden className="text-zinc-800">•</span>
          <span>{status === "playing" ? "Guess the word" : status === "won" ? "You won!" : "Better luck next time"}</span>
        </div>
        {alert && (
          <div className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-zinc-200 shadow">
            {alert}
          </div>
        )}
      </div>

      <input
        ref={hiddenInputRef}
        type="text"
        value={currentGuess}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        inputMode="latin"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Type your Wordle guess"
        className="sr-only"
      />

      {statsLoaded && (
        <StatsSummary
          stats={stats}
        />
      )}

      {!isInputFocused && isTouchDevice && status === "playing" && (
        <button
          type="button"
          onClick={handleBoardActivate}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 shadow-sm transition hover:border-zinc-700 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          Tap grid to type
        </button>
      )}

      <Board board={boardWithCurrentGuess} onActivate={handleBoardActivate} />

      <Keyboard
        keyboardState={keyboard}
        onEnter={handleEnter}
        onBackspace={handleBackspace}
        onLetter={handleLetter}
      />

      {status !== "playing" && (
        <button
          type="button"
          className="mt-2 w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-950 shadow transition hover:bg-emerald-400 sm:w-auto"
          onClick={startNewGame}
        >
          New Game
        </button>
      )}
    </div>
  );
}

interface StatsSummaryProps {
  stats: GameStats;
}

function StatsSummary({ stats }: StatsSummaryProps) {
  const winRate =
    stats.totalPlayed === 0 ? 0 : Math.round((stats.totalWon / stats.totalPlayed) * 100);

  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm text-zinc-300 sm:grid-cols-4">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-zinc-100">{stats.totalPlayed}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">Played</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-zinc-100">{stats.totalWon}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">Wins</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-zinc-100">{winRate}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">Win %</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-zinc-100">{stats.currentStreak}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">Streak</span>
      </div>
      <div className="col-span-2 mt-1 text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500 sm:col-span-4">
        Max streak: <span className="text-zinc-300">{stats.maxStreak}</span>
      </div>
    </div>
  );
}

interface BoardProps {
  board: LetterEvaluation[][];
  onActivate: () => void;
}

function Board({ board, onActivate }: BoardProps) {
  return (
    <div
      className="grid select-none gap-1.5 cursor-text sm:gap-2"
      onClick={onActivate}
      onTouchStart={(event) => {
        event.preventDefault();
        onActivate();
      }}
      aria-label="Word grid"
      role="grid"
    >
      {board.map((row, rowIndex) => (
        <div
          key={`board-row-${rowIndex}`}
          className="grid grid-cols-5 gap-1.5 sm:gap-2 [perspective:1200px]"
          role="row"
        >
          {row.map((cell, cellIndex) => (
            <Tile
              key={`tile-${rowIndex}-${cellIndex}-${cell.state}-${cell.letter}`}
              letter={cell.letter}
              state={cell.state}
              index={cellIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface TileProps {
  letter: string;
  state: LetterState;
  index: number;
}

function Tile({ letter, state, index }: TileProps) {
  let base =
    "flex aspect-square w-12 items-center justify-center rounded-md border-2 text-xl font-semibold uppercase transition-transform duration-200 sm:w-14 sm:text-2xl";

  switch (state) {
    case "correct":
      base += " border-emerald-600 bg-emerald-600 text-emerald-50";
      break;
    case "present":
      base += " border-amber-500 bg-amber-500 text-amber-950";
      break;
    case "absent":
      base += " border-zinc-800 bg-zinc-900 text-zinc-600";
      break;
    default:
      base += " border-zinc-800 bg-zinc-950 text-zinc-700";
  }

  const shouldAnimate = state !== "empty" && letter;
  const accessibilityLabel = letter
    ? `${letter.toUpperCase()} ${
        state === "correct"
          ? "correct"
          : state === "present"
            ? "present"
            : state === "absent"
              ? "absent"
              : "pending"
      }`
    : "Empty";

  return (
    <div
      className={`${base} ${shouldAnimate ? "animate-tile-flip" : ""}`}
      style={shouldAnimate ? { animationDelay: `${index * 80}ms` } : undefined}
      role="gridcell"
      aria-label={accessibilityLabel}
    >
      {letter.toUpperCase()}
    </div>
  );
}

interface KeyboardProps {
  keyboardState: KeyboardState;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

function Keyboard({ keyboardState, onLetter, onEnter, onBackspace }: KeyboardProps) {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-1.5 sm:gap-2">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={`keyboard-row-${row}`} className="flex w-full justify-center gap-1.5 sm:gap-2">
          {rowIndex === 2 && (
            <KeyboardKey label="enter" onClick={onEnter} className="px-4 text-xs uppercase tracking-[0.2em]" />
          )}

          {row.split("").map((letter) => (
            <KeyboardKey
              key={`key-${letter}-${keyboardState[letter] ?? "none"}`}
              label={letter}
              state={keyboardState[letter]}
              onClick={() => onLetter(letter.toLowerCase())}
            />
          ))}

          {rowIndex === 2 && (
            <KeyboardKey
              label="del"
              onClick={onBackspace}
              className="px-4 text-xs uppercase tracking-[0.2em]"
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface KeyboardKeyProps {
  label: string;
  state?: LetterState;
  onClick: () => void;
  className?: string;
}

function KeyboardKey({ label, state, onClick, className }: KeyboardKeyProps) {
  let base =
    "flex h-11 min-w-[38px] items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs font-semibold uppercase text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98] sm:h-12 sm:min-w-[44px] sm:text-sm";

  if (state === "correct") {
    base =
      "flex h-11 min-w-[38px] items-center justify-center rounded-md border border-emerald-500 bg-emerald-500 px-2 text-xs font-semibold uppercase text-emerald-950 transition hover:brightness-110 active:scale-[0.98] sm:h-12 sm:min-w-[44px] sm:text-sm";
  } else if (state === "present") {
    base =
      "flex h-11 min-w-[38px] items-center justify-center rounded-md border border-amber-400 bg-amber-400 px-2 text-xs font-semibold uppercase text-amber-950 transition hover:brightness-110 active:scale-[0.98] sm:h-12 sm:min-w-[44px] sm:text-sm";
  } else if (state === "absent") {
    base =
      "flex h-11 min-w-[38px] items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs font-semibold uppercase text-zinc-500 transition hover:brightness-110 active:scale-[0.98] sm:h-12 sm:min-w-[44px] sm:text-sm";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${state ? "animate-key-pop" : ""} ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
