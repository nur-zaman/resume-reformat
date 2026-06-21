import { cn } from "@/lib/utils/cn";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Dark text input. Focus thickens the border to electric yellow (DESIGN.md
 * `text-input-focused`). The global :focus-visible ring also applies for keyboard nav.
 */
export function TextInput({ className, ...props }: TextInputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md bg-surface-card px-3.5 text-sm text-ink",
        "border border-hairline placeholder:text-muted",
        "focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}
