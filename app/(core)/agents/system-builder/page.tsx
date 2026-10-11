import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import SystemBuilderPage from "@/features/agents/system-builder/SystemBuilderPage";

// "System Builder" is a working label: no canonical name exists yet (common-docs/operations/conflicts.md).
export const metadata: Metadata = {
  title: "System Builder",
  description: "Plan a multi-agent system, then build each agent.",
};

export default async function Page() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect("/agents");
  return (
    <Suspense>
      <SystemBuilderPage />
    </Suspense>
  );
}
