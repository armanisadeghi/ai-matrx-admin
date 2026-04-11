import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Selects 4",
  title: "Demo",
  description: "Select pattern variant 4 demo.",
  letter: "N4", // Selects 4
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
