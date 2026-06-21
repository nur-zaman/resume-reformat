import { ResumeEditor } from "@/components/editor/resume-editor";
import { realisticResume } from "@/lib/resume/fixtures/realistic-resume";
import { sampleReviewItems } from "@/lib/resume/fixtures/generation-result";

/**
 * Server component. In M2 it seeds the client editor with a fixture (resume + a sample
 * pending proposal) as serializable props. M4/M6 swap the fixture for a parse result or
 * a Supabase read behind this same prop contract — the client editor is unaffected.
 */
export default function EditorPage() {
  return (
    <ResumeEditor initialDoc={realisticResume} initialReviewItems={sampleReviewItems} />
  );
}
