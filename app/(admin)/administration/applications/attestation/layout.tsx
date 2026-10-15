import { createRouteMetadata } from "@/utils/route-metadata";

// One tab of the "Applications" tab shell — it names itself, so the browser tab and
// its badge change as a person switches tabs (scripts/check-tab-shell-titles.ts).
export const metadata = createRouteMetadata("/administration", {
  titlePrefix: "Attestation",
  title: "Applications",
  letter: "AT",
});

export default function AdministrationApplicationsAttestationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
