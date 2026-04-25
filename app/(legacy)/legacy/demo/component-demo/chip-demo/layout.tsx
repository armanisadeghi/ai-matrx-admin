import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Chip",
  title: "Demo",
  description: "Chip component demo.",
  letter: "Cp", // Chip
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
