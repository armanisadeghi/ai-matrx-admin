import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/socket-form-builder/scraper-ui/scraper-two", {
  title: "Component Demo Socket Form Builder Scraper Ui Scraper Two",
  description: "Interactive demo: Component Demo Socket Form Builder Scraper Ui Scraper Two. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
