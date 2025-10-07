import type { Metadata } from 'next';
import Link from 'next/link';

import { PHASE_TWO_ACADEMY } from '@/data/phase-two';

export const metadata: Metadata = {
  title: 'BrainSAIT Academy Preview',
  description: 'Training curriculum and change management resources for clinical and revenue teams.',
};

export default function AcademyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-4xl px-6 py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Phase Two</p>
          <h1 className="text-3xl font-semibold">BrainSAIT Academy</h1>
          <p className="text-sm text-gray-400">
            Structured lessons, coaching playbooks, and certification tracks to keep hospital teams aligned with revenue integrity workflows.
          </p>
        </header>

        <div className="space-y-4">
          {PHASE_TWO_ACADEMY.map((module) => (
            <article key={module.id} className="glass-morphism rounded-2xl border border-white/10 p-5">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold">{module.title}</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-gray-400">
                  {module.duration}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">{module.summary}</p>
            </article>
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Join the curriculum beta</p>
            <p className="text-xs text-gray-400">Pilot cohorts unlock facilitator support and Arabic translations.</p>
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
