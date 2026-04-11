import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Selects 2",
  title: "Demo",
  description: "Select pattern variant 2 demo.",
  letter: "N2", // Selects 2
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
