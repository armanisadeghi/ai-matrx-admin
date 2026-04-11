import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Scraper Bookmarks",
  title: "Demo",
  description: "Scraper bookmark viewer demo.",
  letter: "BM", // Scraper Bookmarks
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
