import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import OrchestraStudioPage from "@/features/agents/orchestra-studio/OrchestraStudioPage";

// Renamed from "System Builder" (owner ruling 2026-10-17); /agents/system-builder redirects here.
export const metadata: Metadata = {
  title: "Orchestra Studio",
  description: "Plan a multi-agent system, then build each agent.",
};

export default async function Page() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect("/agents");
  return (
    <Suspense>
      <OrchestraStudioPage />
    </Suspense>
  );
}
