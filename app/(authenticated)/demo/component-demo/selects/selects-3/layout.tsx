import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Selects 3",
  title: "Demo",
  description: "Select pattern variant 3 demo.",
  letter: "N3", // Selects 3
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
