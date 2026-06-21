"use client";

import { blockCapabilities } from "@/lib/editor";
import type { Block } from "@/lib/resume";
import { cn } from "@/lib/utils/cn";
import { useEditorStore, nowIso } from "./editor-context";
import { ConfirmDeleteButton, MoveButtons, VisibilityToggle } from "./controls";
import {
  EducationEditor,
  ExperienceEditor,
  HeaderEditor,
  RichTextSectionEditor,
  SkillsEditor,
  SummaryEditor,
} from "./block-editors";

function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case "header":
      return <HeaderEditor block={block} />;
    case "summary":
      return <SummaryEditor block={block} />;
    case "skills":
      return <SkillsEditor block={block} />;
    case "experience":
      return <ExperienceEditor block={block} />;
    case "education":
      return <EducationEditor block={block} />;
    case "richtext":
      return <RichTextSectionEditor block={block} />;
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

export function BlockCard({
  block,
  index,
  total,
}: {
  block: Block;
  index: number;
  total: number;
}) {
  const { state, dispatch } = useEditorStore();
  const caps = blockCapabilities(block, index, total);
  const dimmed = block.type !== "header" && block.visible === false;

  return (
    <section
      id={`block-${block.id}`}
      tabIndex={-1}
      aria-label={block.type === "header" ? "Header" : block.title}
      className={cn(
        "rounded-lg border bg-surface-card p-4 transition-colors",
        state.selectedBlockId === block.id ? "border-hairline-strong" : "border-hairline",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        {block.type === "header" ? (
          <h2 className="text-sm font-semibold text-ink">Header</h2>
        ) : (
          <input
            value={block.title}
            aria-label="Section title"
            onChange={(e) => dispatch({ type: "block/rename", blockId: block.id, title: e.target.value })}
            className="rounded-md bg-transparent text-sm font-semibold text-ink outline-none hover:bg-surface-elevated focus:bg-surface-elevated focus:px-2"
          />
        )}
        <div className="flex items-center gap-1.5">
          {caps.canHide ? (
            <VisibilityToggle
              visible={block.type !== "header" && block.visible}
              onToggle={() => dispatch({ type: "block/toggleVisible", blockId: block.id })}
            />
          ) : null}
          {caps.canMoveUp || caps.canMoveDown ? (
            <MoveButtons
              itemLabel="section"
              canMoveUp={caps.canMoveUp}
              canMoveDown={caps.canMoveDown}
              onMove={(direction) => dispatch({ type: "block/move", blockId: block.id, direction })}
            />
          ) : null}
          {caps.canDelete ? (
            <ConfirmDeleteButton
              label="Delete section"
              onDelete={() => dispatch({ type: "block/delete", blockId: block.id, now: nowIso() })}
            />
          ) : null}
        </div>
      </header>
      <div className={cn(dimmed && "opacity-50")}>
        <BlockBody block={block} />
      </div>
    </section>
  );
}
