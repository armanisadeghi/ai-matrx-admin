import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Selects 5",
  title: "Demo",
  description: "Select pattern variant 5 demo.",
  letter: "N5", // Selects 5
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
