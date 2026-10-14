import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/administration", {
  title: "Communications",
  description: "Voice communications and transfer settings.",
  letter: "CO",
  canonicalPath: "/administration/communications",
});

export default function CommunicationsAdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
