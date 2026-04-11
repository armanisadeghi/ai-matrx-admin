import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/ssr/demos/speaker-demo", {
  title: "Speaker Demo",
  description: "Interactive demo: Speaker Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
