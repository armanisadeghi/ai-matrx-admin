import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Config Builder",
  title: "Demo",
  description: "Config builder component demo.",
  letter: "Kb", // Config Builder
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
