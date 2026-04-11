import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "JSON Viewer Test",
  title: "Demo",
  description: "JSON viewer test harness demo.",
  letter: "JT", // JSON Viewer Test
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
