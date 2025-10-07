import type { Metadata } from 'next';
import Link from 'next/link';

import { PHASE_TWO_APP_STORE } from '@/data/phase-two';

export const metadata: Metadata = {
  title: 'BrainSAIT App Store Preview',
  description: 'Discover upcoming automation modules and partner integrations for BrainSAIT.',
};

export default function AppStorePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-5xl px-6 py-16 space-y-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Phase Two</p>
          <h1 className="text-3xl font-semibold">BrainSAIT App Store</h1>
          <p className="text-sm text-gray-400">
            Curated extensions for revenue recovery, payer collaboration, and clinician tooling. Final catalogue coming in the Phase Two launch.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {PHASE_TWO_APP_STORE.map((card) => (
            <article key={card.id} className="glass-morphism h-full rounded-2xl border border-white/10 p-5">
              <h2 className="text-xl font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm text-gray-400">{card.description}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">{card.category}</p>
            </article>
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Request early access</p>
            <p className="text-xs text-gray-400">We are onboarding design partners to shape the marketplace launch.</p>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
          >
            Back to dashboard
          </Link>
        </footer>
      </section>
    </main>
  );
}
