import { WordleGame } from "../components/WordleGame";

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-zinc-950 text-zinc-100">
      <header className="flex min-h-[4rem] w-full items-center justify-center border-b border-zinc-800 px-4 pt-[env(safe-area-inset-top,0px)]">
        <h1 className="text-lg font-semibold uppercase tracking-[0.4em] text-zinc-200">
          Wordle Practice
        </h1>
      </header>

      <main className="flex w-full flex-1 flex-col items-center gap-8 px-4 py-10 sm:gap-12 sm:px-6 sm:py-12">
        <section className="text-center">
          <h2 className="text-xl font-medium text-zinc-300">
            Unlimited Wordle runs, no daily cap.
          </h2>
          <p className="mt-3 max-w-lg text-sm text-zinc-400">
            Guess the hidden five-letter word in six tries. Each guess must be a valid word.
            After every submission, the tiles flip to show how close you were to the solution.
          </p>
        </section>

        <WordleGame />
      </main>

      <footer className="flex min-h-[4.5rem] w-full items-center justify-center border-t border-zinc-800 px-4 pb-[env(safe-area-inset-bottom,0px)]">
        <p className="text-xs text-zinc-500">Built with Next.js, Tailwind, and a love for Wordle.</p>
      </footer>
    </div>
  );
}
