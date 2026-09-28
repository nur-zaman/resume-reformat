import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export function Wordmark({
  iconSize = 24,
  className,
}: {
  iconSize?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono tracking-tight", className)}>
      <Image
        src="/logo.png"
        alt=""
        width={iconSize}
        height={iconSize}
        className="rounded-sm"
        priority
      />
      <span>
        resume<span className="text-primary">/</span>reformatter
      </span>
    </span>
  );
}
