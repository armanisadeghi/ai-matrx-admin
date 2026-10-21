// app/(core)/compare/page.tsx — Compare: the deterministic comparison engine. A person gives a list
// of same-type things (companies by reviews, local businesses, …) and gets a ranked, side-by-side of
// the real facts, metered in points. Feature: features/comparison/.

import { createRouteMetadata } from "@/utils/route-metadata";
import { ComparePage } from "@/features/comparison/ComparePage";
import { ComparePublicLanding } from "@/features/comparison/public/ComparePublicLanding";
import { GuestCompare } from "@/features/comparison/public/GuestCompare";
import { getPublicPolicy } from "@/features/comparison/public/fetch.server";
import { getServerAuth } from "@/utils/supabase/getServerAuth";

export const metadata = createRouteMetadata("/compare", {
  title: "Compare",
  description: "Line up two or more companies, places or products and see the real numbers side by side.",
  letter: "CO",
});

export default async function CompareRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A signed-out visitor gets the public front door; a signed-in person, the workspace. When running needs
  // no account (comparison.public.run_requires_account off), a visitor who asked for a comparison (?q= or
  // a run to follow) runs it as their guest — the guest is made then, never on a bare page view.
  const { isAuthenticated } = await getServerAuth();
  if (isAuthenticated) return <ComparePage />;
  const policy = await getPublicPolicy();
  const runRequiresAccount = policy?.runRequiresAccount ?? true;
  const params = await searchParams;
  if (!runRequiresAccount && (params.q || params.run)) return <GuestCompare />;
  return <ComparePublicLanding runRequiresAccount={runRequiresAccount} />;
}
