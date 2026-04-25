import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Scraper One",
  title: "Demo",
  description: "Scraper UI variant one demo.",
  letter: "S1", // Scraper One
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
