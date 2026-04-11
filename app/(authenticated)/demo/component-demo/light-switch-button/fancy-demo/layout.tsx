import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Fancy",
  title: "Demo",
  description: "Light switch fancy demo.",
  letter: "LF", // LS Fancy
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
