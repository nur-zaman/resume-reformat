import { SignInForm } from "@/components/auth/sign-in-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <SignInForm linkError={error === "link"} />;
}
