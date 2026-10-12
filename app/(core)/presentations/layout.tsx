import React from "react";

import { createRouteMetadata } from "@/utils/route-metadata";
import PresentationsLanding from "@/features/auth/components/module-landing/landings/PresentationsLanding";
import { OfficeLookSeed } from "@/features/file-actions/skin/OfficeLookSeed";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export const metadata = createRouteMetadata("/presentations", {
  title: "Presentations",
  description: "Slide decks you edit, present and share",
  letter: "PR",
});

/** Guests see the marketing landing; signed-in people get the Presentations home and editor. */
export default async function PresentationsLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = await getSessionVerdict();
  if (!isAuthenticated) return <PresentationsLanding />;
  return (
    <OfficeLookSeed userId={user.id}>
      <div className="w-full h-full scrollbar-none">{children}</div>
    </OfficeLookSeed>
  );
}
