import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Container Queries",
  title: "Demo",
  description: "CSS container query responsive grid demo.",
  letter: "CQ", // Container queries
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
