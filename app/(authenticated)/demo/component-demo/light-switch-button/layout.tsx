import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Light Switch",
  title: "Demo",
  description: "Light switch button component demo.",
  letter: "Lw", // Light Switch
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
