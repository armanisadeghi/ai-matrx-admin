import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Floating Labels",
  title: "Demo",
  description: "Floating labels component demo.",
  letter: "FL", // Floating Labels
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
