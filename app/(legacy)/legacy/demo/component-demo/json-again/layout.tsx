import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "JSON Again",
  title: "Demo",
  description: "JSON again playground demo.",
  letter: "JA", // JSON Again
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
