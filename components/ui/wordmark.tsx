import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * The brand lockup: the "R" mark (public/logo.png) + the live `resume/reformatter` wordmark.
 * The mark sits on near-black, matching the app chrome. The text treatment (lowercase mono,
 * electric-yellow slash) is rendered live rather than baked in, so it inherits the surrounding
 * text colour — callers set colour/size via `className` (the slash stays `text-primary`). The
 * baked banner image (app/opengraph-image.png) is reserved for social/OG previews.
 *
 * The icon is decorative (`alt=""`): the adjacent text already names the brand, so screen
 * readers should not announce it twice.
 */
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
