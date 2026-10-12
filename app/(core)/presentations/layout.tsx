import React from "react";

import { createRouteMetadata } from "@/utils/route-metadata";
import PresentationsLanding from "@/features/auth/components/module-landing/landings/PresentationsLanding";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export const metadata = createRouteMetadata("/presentations", {
  title: "Presentations",
  description: "Slide decks you edit, present and share",
  letter: "PR",
});

/** Guests see the marketing landing; signed-in people get the Presentations home and editor. */
export default async function PresentationsLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) return <PresentationsLanding />;
  return <div className="w-full h-full scrollbar-none">{children}</div>;
}
