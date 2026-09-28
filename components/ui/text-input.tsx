import { cn } from "@/lib/utils/cn";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

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
