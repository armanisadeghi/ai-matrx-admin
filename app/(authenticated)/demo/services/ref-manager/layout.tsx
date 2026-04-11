import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/services/ref-manager", {
  title: "Services Ref Manager",
  description: "Interactive demo: Services Ref Manager. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
