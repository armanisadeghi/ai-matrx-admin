import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Color Tester",
  title: "Demo",
  description: "Color tester component demo.",
  letter: "Cr", // Color Tester
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
