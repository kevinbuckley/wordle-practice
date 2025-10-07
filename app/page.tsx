import { WordleGame, openStatsModal } from "../components/WordleGame";

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-zinc-950 text-zinc-100">
      <header className="flex min-h-[4rem] w-full items-center justify-center border-b border-zinc-800 px-4 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex w-full max-w-3xl items-center justify-between gap-4">
          <h1 className="text-lg font-semibold uppercase tracking-[0.4em] text-zinc-200">
            Wordle Practice
          </h1>
          <button
            type="button"
            onClick={openStatsModal}
            className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500 transition hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
          >
            Stats
          </button>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center gap-8 px-4 py-10 sm:gap-12 sm:px-6 sm:py-12">
        <section className="text-center">
          <h2 className="text-xl font-medium text-zinc-300">
            Unlimited Wordle runs, no daily cap.
          </h2>
        </section>

        <WordleGame />
      </main>

      <footer className="flex min-h-[4.5rem] w-full items-center justify-center border-t border-zinc-800 px-4 pb-[env(safe-area-inset-bottom,0px)]">
        <p className="text-xs text-zinc-500">Built with Next.js, Tailwind, and a love for Wordle.</p>
      </footer>
    </div>
  );
}
