import { createEmptyResumeDoc } from "../factory";
import type { ResumeDoc } from "../schema";

/** The brand-new resume state: a single, editable header block. */
export const emptyResume: ResumeDoc = createEmptyResumeDoc();
