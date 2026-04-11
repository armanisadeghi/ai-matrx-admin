import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Grok Modular",
  title: "Demo",
  description: "Modular many-to-many Grok UI blocks and composition patterns",
  letter: "Gm",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
