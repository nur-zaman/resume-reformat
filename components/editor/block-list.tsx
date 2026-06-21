"use client";

import type { BlockType } from "@/lib/resume";
import { useEditorStore } from "./editor-context";
import { BlockCard } from "./block-card";

const ADDABLE: { type: Exclude<BlockType, "header">; label: string }[] = [
  { type: "summary", label: "Summary" },
  { type: "skills", label: "Skills" },
  { type: "experience", label: "Experience" },
  { type: "education", label: "Education" },
  { type: "richtext", label: "Custom section" },
];

export function BlockList() {
  const { state } = useEditorStore();
  const total = state.doc.blocks.length;

  return (
    <div className="flex flex-col gap-3">
      {state.doc.blocks.map((block, index) => (
        <BlockCard key={block.id} block={block} index={index} total={total} />
      ))}
      <AddSectionMenu />
    </div>
  );
}

function AddSectionMenu() {
  const { dispatch } = useEditorStore();
  return (
    <div className="rounded-lg border border-dashed border-hairline p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Add a section
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ADDABLE.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => dispatch({ type: "block/add", blockType: option.type })}
            className="rounded-md border border-hairline bg-surface-elevated px-3 py-1.5 text-xs text-body hover:text-ink"
          >
            + {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
