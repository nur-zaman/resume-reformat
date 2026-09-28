export function LandingBackground() {
  return (
    <div className="lp-backdrop" aria-hidden="true">
      <div className="lp-grid" />
      <div className="lp-blob lp-blob--primary" />
      <div className="lp-blob lp-blob--blue" />
      <div
        className="absolute inset-x-0 top-0 h-[620px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 0%, color-mix(in oklab, var(--color-primary) 12%, transparent), transparent 70%)",
        }}
      />
      <div className="lp-grain" />
    </div>
  );
}
