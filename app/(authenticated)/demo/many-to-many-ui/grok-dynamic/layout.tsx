import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/many-to-many-ui/grok-dynamic", {
  title: "Many To Many Ui Grok Dynamic",
  description: "Interactive demo: Many To Many Ui Grok Dynamic. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
