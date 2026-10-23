import { createRouteMetadata } from "@/utils/route-metadata";

// One tab of the "Compute" tab shell — it names itself (scripts/check-tab-shell-titles.ts).
export const metadata = createRouteMetadata("/administration", {
  titlePrefix: "Repair Runs",
  title: "Compute",
  letter: "RR",
});

export default function AdministrationComputeRepairRunsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
