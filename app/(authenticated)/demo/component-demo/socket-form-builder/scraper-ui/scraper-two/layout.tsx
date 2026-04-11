import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Scraper Two",
  title: "Demo",
  description: "Scraper UI variant two demo.",
  letter: "S2", // Scraper Two
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
