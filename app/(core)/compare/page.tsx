// app/(core)/compare/page.tsx — Compare: the deterministic comparison engine. A person gives a list
// of same-type things (companies by reviews, local businesses, …) and gets a ranked, side-by-side of
// the real facts, metered in points. Feature: features/comparison/.

import { createRouteMetadata } from "@/utils/route-metadata";
import { ComparePage } from "@/features/comparison/ComparePage";

export const metadata = createRouteMetadata("/compare", {
  title: "Compare",
  description: "Line up two or more companies, places or products and see the real numbers side by side.",
  letter: "CO",
});

export default function CompareRoutePage() {
  return <ComparePage />;
}
