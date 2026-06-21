import type { Block, ResumeDoc } from "./schema";

/**
 * Default title for a resume with no usable name (blank starts, or a header whose name
 * field is still empty). Kept here so the create/duplicate actions and the dashboard agree.
 */
export const DEFAULT_RESUME_TITLE = "Untitled resume";

/**
 * Derive a human title for a resume from its content: the header block's name when set,
 * otherwise the default. Pure (no ids, no DB) so it can run on the server action path and
 * be unit-tested directly.
 */
export function deriveResumeTitle(doc: ResumeDoc): string {
  const header = doc.blocks.find(
    (b): b is Extract<Block, { type: "header" }> => b.type === "header",
  );
  const name = header?.name.trim() ?? "";
  return name !== "" ? name : DEFAULT_RESUME_TITLE;
}
