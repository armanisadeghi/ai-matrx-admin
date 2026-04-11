import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Tooltip",
  title: "Demo",
  description: "Tooltip component patterns and variants.",
  letter: "Tp", // Tooltip
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
