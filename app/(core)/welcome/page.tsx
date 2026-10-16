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

export default async function WelcomePage() {
  const { user } = await getSessionVerdict();
  if (!user) {
    redirect("/login?redirectTo=/welcome");
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
      <WelcomeClient firstName={firstName} newUser={isNewUser(user)} />
    </>
  );
}
