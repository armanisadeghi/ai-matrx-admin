import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Markdown Block",
  title: "Demo",
  description: "Markdown text block editor demo.",
  letter: "Mb", // Markdown Block
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
