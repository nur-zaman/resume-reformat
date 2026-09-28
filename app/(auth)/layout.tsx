import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          aria-label="Resume Reformatter — home"
          className="mb-8 inline-block text-muted hover:text-body"
        >
          <Wordmark iconSize={24} className="text-sm" />
        </Link>
        {children}
      </div>
    </div>
  );
}
