import type { Metadata } from 'next';
import Link from 'next/link';

import { PHASE_TWO_PARTNERS } from '@/data/phase-two';

export const metadata: Metadata = {
  title: 'BrainSAIT Partner Hub Preview',
  description: 'Strategic partner directory and integration readiness checklist for Phase Two.',
};

export default function PartnerHubPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-5xl px-6 py-16 space-y-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Phase Two</p>
          <h1 className="text-3xl font-semibold">Partner hub</h1>
          <p className="text-sm text-gray-400">
            Final integrations are underway with clearinghouses, payers, and digital health innovators bringing automation to the BrainSAIT network.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {PHASE_TWO_PARTNERS.map((partner) => (
            <article key={partner.id} className="glass-morphism rounded-2xl border border-white/10 p-5">
              <h2 className="text-xl font-semibold">{partner.name}</h2>
              <p className="mt-2 text-sm text-gray-400">{partner.focus}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">{partner.status}</p>
            </article>
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Nominate a partner</p>
            <p className="text-xs text-gray-400">Share vendor contacts to include in the integration readiness review.</p>
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
