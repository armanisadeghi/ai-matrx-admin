import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Variant",
  title: "Demo",
  description: "Light switch variant demo.",
  letter: "LV", // LS Variant
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
