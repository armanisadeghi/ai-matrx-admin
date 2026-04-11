import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Grok Quick Tester",
  title: "Demo",
  description: "Fast many-to-many Grok UI wiring and relationship smoke tests",
  letter: "Gq",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
