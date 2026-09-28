import { requireAllowlistedUser } from "@/lib/auth/guards";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  await requireAllowlistedUser();
  return <OnboardingFlow />;
}
