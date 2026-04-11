import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/services/callback-manager", {
  title: "Services Callback Manager",
  description: "Interactive demo: Services Callback Manager. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
