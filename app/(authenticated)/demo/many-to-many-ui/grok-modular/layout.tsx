import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/many-to-many-ui/grok-modular", {
  title: "Many To Many Ui Grok Modular",
  description: "Interactive demo: Many To Many Ui Grok Modular. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
