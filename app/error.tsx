"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Metadata only — never log resume/JD content or tokens (PRD §11).
    console.error("Render error", error.digest);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted">
          An unexpected error occurred. You can try again.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
