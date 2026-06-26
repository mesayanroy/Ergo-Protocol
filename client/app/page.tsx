export default function HomePage() {
  const headlineOptions = [
    "Lend Smarter. Borrow Safer.",
    "Capital Efficiency, Engineered for Stellar.",
    "Resilient Lending for Every Market Cycle.",
  ] as const;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <p className="text-sm uppercase tracking-[0.2em] text-accentSecondary">Ergo Protocol</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
          {headlineOptions[0]}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300 md:text-lg">
          A production-grade Stellar lending protocol with shared liquidity, robust risk controls, and
          institutional-ready market support.
        </p>
        <button
          type="button"
          className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Launch App
        </button>
        <div className="mt-10 grid gap-3 text-sm text-neutral-400 md:grid-cols-3">
          {headlineOptions.map((headline) => (
            <div key={headline} className="rounded-xl border border-white/10 bg-white/5 p-3">
              {headline}
            </div>
          ))}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur md:hidden">
        <ul className="flex items-center justify-between text-sm">
          <li>Supply</li>
          <li>Borrow</li>
          <li>Governance</li>
          <li>Wallet</li>
        </ul>
      </nav>
    </main>
  );
}