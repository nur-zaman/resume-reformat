"use client";

import { useId } from "react";
import { TextInput } from "@/components/ui/text-input";
import { cn } from "@/lib/utils/cn";
import { IconButton } from "../controls";

export function LabeledField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <TextInput
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function StringListField({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  function setItem(index: number, value: string) {
    onChange(items.map((it, i) => (i === index ? value : it)));
  }
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function addItem() {
    onChange([...items, ""]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <TextInput
            value={item}
            aria-label={`${label} item ${index + 1}`}
            placeholder="Add a skill"
            onChange={(e) => setItem(index, e.target.value)}
          />
          <IconButton label={`Remove ${label} item ${index + 1}`} variant="danger" onClick={() => removeItem(index)}>
            ✕
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="self-start rounded-md border border-hairline px-2.5 py-1 text-xs text-body hover:text-ink"
      >
        + Add item
      </button>
    </div>
  );
}
