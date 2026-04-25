import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Tool Selector",
  title: "Demo",
  description: "Tool selector component demo.",
  letter: "Tl", // Tool Selector
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
