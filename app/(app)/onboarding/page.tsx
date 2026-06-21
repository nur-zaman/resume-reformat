import { requireAllowlistedUser } from "@/lib/auth/guards";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

/**
 * Import a resume (PRD §6.1 parse flow). Reached from the dashboard's "New resume → Import".
 * Multiple resumes are allowed, so there is no longer a redirect when a resume already
 * exists — each import creates a new resume row. Authorization is enforced here and by RLS;
 * the proxy redirect is UX only.
 */
export default async function OnboardingPage() {
  await requireAllowlistedUser();
  return <OnboardingFlow />;
}
