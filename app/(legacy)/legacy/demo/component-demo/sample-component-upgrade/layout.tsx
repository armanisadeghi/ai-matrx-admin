import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Sample Upgrade",
  title: "Demo",
  description: "Sample component upgrade demo.",
  letter: "SA", // Sample Upgrade
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
