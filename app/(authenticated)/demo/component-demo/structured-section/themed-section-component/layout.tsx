import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Themed Section",
  title: "Demo",
  description: "Themed structured section demo.",
  letter: "TS", // Themed Section
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
