import { createReviewItem } from "../factory";
import { CURRENT_SCHEMA_VERSION } from "../version";
import type { GenerationResult, ReviewItem } from "../schema";
import { proposedContentId, realisticResume } from "./realistic-resume";

export const sampleReviewItems: ReviewItem[] = [
  createReviewItem({
    targetContentId: proposedContentId,
    reason:
      "The job description emphasizes performance work; this quantified latency claim was proposed to match it. Confirm it is accurate before accepting.",
  }),
];

export const sampleGenerationResult: GenerationResult = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  resume: realisticResume,
  reviewItems: sampleReviewItems,
  inferredJob: { title: "Senior Software Engineer", company: "Acme Corp" },
};
