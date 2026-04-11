import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/voice/server-token", {
  title: "Voice Server Token",
  description: "Interactive demo: Voice Server Token. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
