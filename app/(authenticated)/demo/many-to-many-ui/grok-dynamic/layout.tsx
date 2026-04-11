import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Grok Dynamic",
  title: "Demo",
  description: "Dynamic many-to-many Grok-driven forms and entity linking",
  letter: "Gd",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
