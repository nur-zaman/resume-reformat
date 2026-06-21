import { cn } from "@/lib/utils/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Dark content card per DESIGN.md: `#1a1a1a` surface, 1px hairline border, 12px radius,
 * and no drop shadow.
 */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-surface-card p-5",
        className,
      )}
      {...props}
    />
  );
}
