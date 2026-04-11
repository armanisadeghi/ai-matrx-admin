import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/code-generator/react-live-parts", {
  title: "Code Generator React Live Parts",
  description: "Interactive demo: Code Generator React Live Parts. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
