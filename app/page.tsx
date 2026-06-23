import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl">
        <Image
          src="/logo.png"
          alt="Resume Reformatter"
          width={64}
          height={64}
          priority
          className="mx-auto mb-6 rounded-lg"
        />
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          Invite only
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
          Tailor your resume to any job.
        </h1>
        <p className="mt-4 text-base text-body">
          Paste your resume once, then generate a focused, fact-checked draft for
          every application — and export a clean PDF.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
