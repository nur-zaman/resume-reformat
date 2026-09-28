import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const base =
  "inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-semibold " +
  "transition-colors disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-active " +
    "disabled:bg-primary-disabled disabled:text-muted",
  secondary:
    "bg-surface-card text-ink border border-hairline hover:bg-surface-elevated " +
    "disabled:text-muted",
  danger:
    "bg-error text-ink hover:bg-error/90 " +
    "disabled:bg-error/40 disabled:text-muted",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
