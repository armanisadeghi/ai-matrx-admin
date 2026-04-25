import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Entity Analyzer",
  title: "Demo",
  description: "Entity analyzer component demo.",
  letter: "EA", // Entity Analyzer
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
