import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Scraper UI",
  title: "Demo",
  description: "Socket form builder scraper UI experiments index.",
  letter: "PU", // Scraper UI parent
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
