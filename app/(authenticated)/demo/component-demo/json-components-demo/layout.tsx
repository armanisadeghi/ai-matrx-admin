import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "JSON Components",
  title: "Demo",
  description: "JSON-driven components demo.",
  letter: "JC", // JSON Components
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
