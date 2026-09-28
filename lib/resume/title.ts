import type { Block, ResumeDoc } from "./schema";

export const DEFAULT_RESUME_TITLE = "Untitled resume";

export function deriveResumeTitle(doc: ResumeDoc): string {
  const header = doc.blocks.find(
    (b): b is Extract<Block, { type: "header" }> => b.type === "header",
  );
  const name = header?.name.trim() ?? "";
  return name !== "" ? name : DEFAULT_RESUME_TITLE;
}
