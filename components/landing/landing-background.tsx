/**
 * Decorative background for the landing page: a fixed stack of pure-CSS layers behind the
 * content (which lives in a `relative z-10` wrapper). Back-to-front: the masked engineered
 * grid, two drifting brand-coloured glows, a top spotlight that lifts the hero headline, and
 * a fine grain overlay that kills the colour banding the blurred glows would otherwise show.
 *
 * Entirely non-interactive and announced to nobody — the layer styles + keyframes live under
 * the "Landing page" section of globals.css and respect prefers-reduced-motion there.
 */
export function LandingBackground() {
  return (
    <div className="lp-backdrop" aria-hidden="true">
      <div className="lp-grid" />
      <div className="lp-blob lp-blob--primary" />
      <div className="lp-blob lp-blob--blue" />
      {/* Static spotlight cone behind the hero — keeps the headline reading crisply. */}
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
