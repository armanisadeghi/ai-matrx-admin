import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/socket-form-builder/scraper-ui/scraper-bookmark-viewer", {
  title: "Component Demo Socket Form Builder Scraper Ui Scraper Bookmark Viewer",
  description: "Interactive demo: Component Demo Socket Form Builder Scraper Ui Scraper Bookmark Viewer. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
