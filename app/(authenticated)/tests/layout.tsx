import { EntityPack } from "@/providers/packs/EntityPack";
import { createRouteMetadata } from "@/utils/route-metadata";

// Force dynamic rendering for all test pages to avoid build timeouts
export const dynamic = "force-dynamic";

export const metadata = createRouteMetadata("/tests", {
  title: "Tests",
  description: "Internal test and experimental routes for development",
  letter: "Tx",
});

export default function TestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EntityPack>{children}</EntityPack>;
}
