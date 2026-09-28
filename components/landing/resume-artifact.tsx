export function ResumeArtifact() {
  return (
    <div className="relative">
      <figure className="overflow-hidden rounded-lg border border-hairline bg-surface-card shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <span className="size-3 rounded-pill bg-hairline-strong" />
          <span className="size-3 rounded-pill bg-hairline-strong" />
          <span className="size-3 rounded-pill bg-hairline-strong" />
          <span className="ml-2 font-mono text-xs text-muted">alex-rivera · senior-pm.pdf</span>
        </div>

        <div className="bg-surface-soft p-4 sm:p-6">
          <div className="mx-auto max-w-sm rounded-sm bg-paper px-7 py-7 font-serif text-paper-ink" aria-hidden="true">
            <header className="text-center">
              <h3 className="text-xl font-bold tracking-tight">Alex Rivera</h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-ink/55">
                Product Manager · San Francisco
              </p>
            </header>

            <hr className="my-4 border-paper-ink/15" />

            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper-ink/70">
              Experience
            </p>
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">Senior Product Manager</span>
                <span className="font-mono text-[10px] text-paper-ink/55">2021 — Now</span>
              </div>
              <p className="text-[12px] italic text-paper-ink/70">Northwind Labs</p>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-paper-ink/85">
                <li className="flex gap-2">
                  <span className="text-paper-ink/40">–</span>
                  <span>
                    Led discovery and roadmap for a{" "}
                    <mark className="rounded-xs bg-primary/45 px-0.5 text-paper-ink">
                      payments platform serving 2M+ users
                    </mark>
                    .
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-paper-ink/40">–</span>
                  <span>Shipped 14 cross-functional releases with a 4-engineer pod.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-paper-ink/40">–</span>
                  <span>Cut onboarding drop-off 31% through staged activation.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </figure>

      <div className="absolute -right-3 -top-4 flex items-center gap-2 rounded-pill border border-hairline bg-surface-elevated px-3 py-1.5 shadow-lg shadow-black/40 sm:-right-6">
        <span className="flex size-4 items-center justify-center rounded-pill bg-success/15">
          <svg viewBox="0 0 20 20" fill="none" className="size-3 text-success" aria-hidden="true">
            <path d="M16.5 5.5 8 14l-4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-xs font-medium text-body-strong">Every claim verified</span>
      </div>

      <div className="absolute -bottom-4 -left-3 flex items-center gap-2 rounded-pill bg-primary px-3 py-1.5 shadow-lg shadow-black/40 sm:-left-6">
        <span className="font-mono text-[10px] uppercase tracking-widest text-on-primary/70">
          Tailored to
        </span>
        <span className="text-xs font-semibold text-on-primary">Senior PM @ Stripe</span>
      </div>
    </div>
  );
}
