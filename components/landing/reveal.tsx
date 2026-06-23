"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

// Layout effect on the client (runs before paint, so above-the-fold content never flashes
// visible-then-hidden); plain effect on the server, where layout effects are a no-op anyway.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealProps = {
  children: ReactNode;
  /** Stagger offset in ms, applied to the transition delay. */
  delay?: number;
  /** Distance the element rises from, e.g. "22px". */
  y?: string;
  className?: string;
  /** Element to render — use "li"/"article"/etc. to keep the markup semantic. */
  as?: ElementType;
};

/**
 * Scroll-reveal wrapper. The cardinal rule: content is rendered VISIBLE by default — on the
 * server, with JS off, for headless renderers, and for reduced-motion users no `data-reveal`
 * attribute is ever emitted, so nothing is hidden. Only after the effect confirms
 * IntersectionObserver support AND that motion is allowed do we drive the attribute directly
 * on the node ("hidden" before paint, then "shown" on intersection). A reveal that never
 * fires can therefore only leave content fully shown, never blank.
 *
 * Driven by DOM mutation rather than React state: it's a one-shot visual effect that needs no
 * re-render, and it keeps the node out of React's reconciliation after the first paint. We
 * unobserve after revealing — a landing page shouldn't re-hide sections on scroll-up.
 */
export function Reveal({ children, delay = 0, y = "22px", className, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) return; // stay visible

    el.dataset.reveal = "hidden";
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "shown";
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ "--reveal-delay": `${delay}ms`, "--reveal-y": y } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}
