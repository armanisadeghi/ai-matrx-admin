import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/many-to-many-ui/grok/quick-tester", {
  title: "Many To Many Ui Grok Quick Tester",
  description: "Interactive demo: Many To Many Ui Grok Quick Tester. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
