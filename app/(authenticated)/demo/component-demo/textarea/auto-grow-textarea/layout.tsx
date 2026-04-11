import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/textarea/auto-grow-textarea", {
  title: "Component Demo Textarea Auto Grow Textarea",
  description: "Interactive demo: Component Demo Textarea Auto Grow Textarea. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
