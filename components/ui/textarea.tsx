import { cn } from "@/lib/utils/cn";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md bg-surface-card px-3.5 py-3 text-sm text-ink",
        "border border-hairline placeholder:text-muted",
        "focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}
