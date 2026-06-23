import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { LandingBackground } from "@/components/landing/landing-background";
import { SiteHeader } from "@/components/landing/site-header";
import { Reveal } from "@/components/landing/reveal";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { ResumeArtifact } from "@/components/landing/resume-artifact";
import { FactCheckCard } from "@/components/landing/fact-check-card";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  ClipboardIcon,
  DownloadIcon,
  LayersIcon,
  LockIcon,
  PencilIcon,
  TargetIcon,
} from "@/components/landing/icons";

export default function Home() {
  return (
    <>
      <LandingBackground />
      <div className="lp-progress" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <HowItWorks />
          <FactCheck />
          <Features />
          <Faq />
          <CtaBand />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Hero -- */

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:pb-28 lg:pt-20">
      <div className="max-w-xl">
        <Reveal>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface-card/70 px-3 py-1 text-xs font-medium text-body transition-colors hover:border-hairline-strong"
          >
            <span className="size-1.5 rounded-pill bg-primary" />
            Private beta · invite-only
          </a>
        </Reveal>

        <Reveal delay={60}>
          <h1 className="mt-6 text-balance text-[clamp(2.25rem,6vw,4.25rem)] font-bold leading-[1.04] tracking-[-0.03em] text-ink">
            Tailor your resume to every job, without the rewrite.
          </h1>
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-body sm:text-lg">
            Paste your resume once. Get a focused, fact-checked draft for each application —
            and export a clean, ATS-ready PDF. You approve every line.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-8">
            <WaitlistForm />
          </div>
          <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            {["Free during beta", "No résumé fed to model training", "Cancel anytime"].map(
              (item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <BadgeCheckIcon className="size-4 text-muted-soft" />
                  {item}
                </li>
              ),
            )}
          </ul>
        </Reveal>
      </div>

      <Reveal delay={120} className="lg:pl-6">
        <ResumeArtifact />
      </Reveal>
    </section>
  );
}

/* ----------------------------------------------------------- How it works -- */

const STEPS = [
  {
    icon: ClipboardIcon,
    title: "Paste your resume",
    body: "Drop in your existing resume or paste the text. We parse it into clean, structured sections — nothing to reformat by hand.",
  },
  {
    icon: TargetIcon,
    title: "Add the job",
    body: "Paste any job description. We re-emphasize the wording, ordering, and highlights so your experience speaks to that exact role.",
  },
  {
    icon: DownloadIcon,
    title: "Review & export",
    body: "Approve every proposed claim, edit inline, then export a pixel-clean, ATS-ready PDF from a fixed template.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-t border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            From paste to polished in three steps.
          </h2>
          <p className="mt-4 text-base text-body">
            No templates to wrestle, no copy-paste between documents. The structured resume is
            the source of truth — the screen preview and the PDF are the same document.
          </p>
        </Reveal>

        <div className="relative mt-14">
          {/* Connecting track behind the step numbers (desktop only). */}
          <div
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-6 hidden h-px bg-hairline md:block"
          />
          <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 90} className="relative flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="relative z-10 flex size-12 items-center justify-center rounded-lg border border-hairline bg-surface-card text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-soft">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Fact-check -- */

function FactCheck() {
  return (
    <section id="fact-check" className="scroll-mt-24 border-t border-hairline">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <Reveal className="order-2 lg:order-1">
          <FactCheckCard />
        </Reveal>

        <Reveal delay={80} className="order-1 max-w-xl lg:order-2">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            The difference
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Tailored, never fabricated.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-body">
            Most AI resume tools will happily invent a metric to make you look good. Resume
            Reformatter does the opposite. Every tailored claim is checked back against your
            original resume — and anything it can&rsquo;t trace gets flagged for you to remove
            or fix before you send it.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Claims grounded in your real experience",
              "Unverifiable lines flagged, never slipped in",
              "You make the final call on every word",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-body-strong">
                <BadgeCheckIcon className="mt-0.5 size-5 shrink-0 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Features -- */

function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Built for the way you actually job-hunt.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 [grid-auto-flow:dense] sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[208px]">
          {/* Hero cell */}
          <Reveal className="sm:col-span-2 sm:row-span-2">
            <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-surface-card p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-pill bg-primary/10 blur-3xl"
              />
              <span className="flex size-10 items-center justify-center rounded-md border border-hairline bg-surface-elevated text-primary">
                <LayersIcon className="size-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-ink">One resume, every version</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-body">
                Keep a single base resume and spin up a tailored copy per application. They all
                live side by side — no folders full of <span className="font-mono text-body-strong">resume_final_v3.pdf</span>.
              </p>
              <div className="mt-auto flex gap-2 pt-6">
                {["Base", "Stripe PM", "Figma PM", "Notion"].map((label, i) => (
                  <span
                    key={label}
                    className={
                      i === 0
                        ? "rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary"
                        : "rounded-md border border-hairline bg-surface-soft px-2.5 py-1.5 text-xs text-muted"
                    }
                  >
                    {label}
                  </span>
                ))}
              </div>
            </article>
          </Reveal>

          <FeatureCell
            icon={LockIcon}
            title="Private by default"
            body="Invite-only access. Your resume is never used to train any model."
          />
          <FeatureCell
            icon={BadgeCheckIcon}
            title="ATS-ready PDF"
            body="A clean, fixed-template export that parsers and recruiters both read."
          />
          <Reveal className="sm:col-span-2">
            <article className="flex h-full items-center gap-4 rounded-lg border border-hairline bg-surface-card p-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface-elevated text-primary">
                <PencilIcon className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink">You stay in control</h3>
                <p className="mt-1 text-sm text-body">
                  Approve, edit, or reject every AI suggestion before it lands. Nothing ships
                  without your sign-off.
                </p>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FeatureCell({
  icon: Icon,
  title,
  body,
}: {
  icon: (props: { className?: string }) => React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Reveal>
      <article className="flex h-full flex-col rounded-lg border border-hairline bg-surface-card p-6">
        <span className="flex size-10 items-center justify-center rounded-md border border-hairline bg-surface-elevated text-primary">
          <Icon className="size-5" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-body">{body}</p>
      </article>
    </Reveal>
  );
}

/* --------------------------------------------------------------------- FAQ -- */

const FAQS = [
  {
    q: "Is it really invite-only?",
    a: "Yes. We're opening access gradually to keep quality high during the private beta. Join the waitlist and we'll email you the moment your invite is ready.",
  },
  {
    q: "Will it invent experience I don't have?",
    a: "No. Every tailored claim is checked against your original resume, and anything unverifiable is flagged for you to remove or correct before export. You always have the final say.",
  },
  {
    q: "What can I export?",
    a: "A clean, ATS-friendly PDF rendered from a fixed template — the exact structured document you reviewed on screen, so there are no formatting surprises.",
  },
  {
    q: "Do you train AI on my resume?",
    a: "Never. Your resume is yours. It isn't used to train any model, and access is gated to invited accounts only.",
  },
  {
    q: "How much will it cost?",
    a: "Pricing isn't finalized while we're in private beta — it's free for beta members. Waitlist members will hear about plans first.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-hairline">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="mt-4 text-base text-body">
            Still curious about something?{" "}
            <a href="#waitlist" className="text-primary underline-offset-4 hover:underline">
              Join the waitlist
            </a>{" "}
            and reply to the welcome email — it reaches a human.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <dl className="divide-y divide-hairline border-y border-hairline">
            {FAQS.map((item) => (
              <details key={item.q} className="group px-1 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-body-strong transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                  <dt>{item.q}</dt>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-pill border border-hairline text-muted transition-transform duration-200 group-open:rotate-45">
                    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <dd className="mt-3 max-w-2xl text-sm leading-relaxed text-body">{item.a}</dd>
              </details>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- CTA band -- */

function CtaBand() {
  return (
    <section id="waitlist" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
      <Reveal className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-lg bg-primary px-6 py-14 text-center sm:px-14 sm:py-20">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight text-on-primary sm:text-[2.75rem]">
            Stop rewriting your resume for every job.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base text-on-primary/80">
            Join the waitlist for early access. Paste once, tailor in seconds, export clean.
          </p>
          <div className="mt-8 flex justify-center">
            <WaitlistForm tone="onYellow" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ Footer -- */

function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <Wordmark iconSize={22} className="text-sm text-body" />
          <p className="mt-2 text-xs text-muted-soft">
            Tailor your resume to any job, privately.
          </p>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <a href="#how" className="text-muted transition-colors hover:text-body">
            How it works
          </a>
          <a href="#faq" className="text-muted transition-colors hover:text-body">
            FAQ
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-body transition-colors hover:text-ink"
          >
            Sign in
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
      <p className="border-t border-hairline px-5 py-5 text-center text-xs text-muted-soft sm:px-8">
        © {new Date().getFullYear()} Resume Reformatter. All rights reserved.
      </p>
    </footer>
  );
}
