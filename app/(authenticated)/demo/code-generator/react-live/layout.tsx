import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/code-generator/react-live", {
  title: "Code Generator React Live",
  description: "Interactive demo: Code Generator React Live. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
