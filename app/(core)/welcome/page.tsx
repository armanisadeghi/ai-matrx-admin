import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import PageHeader from "@/features/shell/components/header/PageHeader";
import HeaderIconTitle from "@/features/shell/components/header/variants/variants/HeaderIconTitle";
import { isNewUser } from "@/utils/onboarding";
import { firstNameOf } from "@/features/marketing/smart-add/welcome/firstName";
import { WelcomeClient } from "./WelcomeClient";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Get started with AI Matrx",
};

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ found?: string }> }) {
  const { user } = await getSessionVerdict();
  // `?found=1`: any account can open the sign-up welcome ("here's what we found") on its own login, not only a new one.
  const askedForFound = (await searchParams).found === "1";
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(askedForFound ? "/welcome?found=1" : "/welcome")}`);
  }

  const firstName =
    (typeof user.user_metadata?.full_name === "string"
      ? firstNameOf(user.user_metadata.full_name)
      : null) ||
    (typeof user.user_metadata?.name === "string"
      ? firstNameOf(user.user_metadata.name)
      : null) ||
    null;

  return (
    <>
      <PageHeader>
        <HeaderIconTitle icon="Sparkles" title="Welcome" />
      </PageHeader>
      <WelcomeClient firstName={firstName} newUser={isNewUser(user) || askedForFound} />
    </>
  );
}
