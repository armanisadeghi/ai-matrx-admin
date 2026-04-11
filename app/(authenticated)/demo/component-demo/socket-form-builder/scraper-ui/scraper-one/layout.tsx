import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/socket-form-builder/scraper-ui/scraper-one", {
  title: "Component Demo Socket Form Builder Scraper Ui Scraper One",
  description: "Interactive demo: Component Demo Socket Form Builder Scraper Ui Scraper One. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
