import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Sheet Persistence",
  title: "Demo",
  description: "Floating sheet persistence demo.",
  letter: "FP", // Sheet Persistence
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
