import { redirect } from "next/navigation";

/**
 * Legacy single-resume route. Resumes now live at `/editor/[id]` and are managed from the
 * dashboard, so this path just sends the user to the list.
 */
export default function LegacyEditorPage() {
  redirect("/dashboard");
}
