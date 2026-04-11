import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "JSON Viewer",
  title: "Demo",
  description: "JSON viewer component demo.",
  letter: "JV", // JSON Viewer
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
