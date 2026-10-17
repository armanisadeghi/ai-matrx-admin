// app/(core)/compare/page.tsx — Compare: the deterministic comparison engine. A person gives a list
// of same-type things (companies by reviews, local businesses, …) and gets a ranked, side-by-side of
// the real facts, metered in points. Feature: features/comparison/.

import { createRouteMetadata } from "@/utils/route-metadata";
import { ComparePage } from "@/features/comparison/ComparePage";
import { ComparePublicLanding } from "@/features/comparison/public/ComparePublicLanding";
import { getPublicPolicy } from "@/features/comparison/public/fetch.server";
import { getServerAuth } from "@/utils/supabase/getServerAuth";

export const metadata = createRouteMetadata("/compare", {
  title: "Compare",
  description: "Line up two or more companies, places or products and see the real numbers side by side.",
  letter: "CO",
});

export default async function CompareRoutePage() {
  // A signed-out visitor gets the public front door (sign-up carries what they typed); a signed-in person, the workspace.
  const { isAuthenticated } = await getServerAuth();
  if (isAuthenticated) return <ComparePage />;
  const policy = await getPublicPolicy();
  return <ComparePublicLanding runRequiresAccount={policy?.runRequiresAccount ?? true} />;
}
