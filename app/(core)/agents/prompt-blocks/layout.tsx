import React from "react";
import { redirect } from "next/navigation";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/agents", {
  titlePrefix: "Prompt blocks",
  title: "Agents",
  description: "Reusable prompt sections agents declare",
  letter: "PB",
});

export default async function PromptBlocksLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect("/agents");
  return <>{children}</>;
}
