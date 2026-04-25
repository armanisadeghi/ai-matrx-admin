import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Structured Section",
  title: "Demo",
  description: "Structured section component demo.",
  letter: "SS", // Structured Section
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
