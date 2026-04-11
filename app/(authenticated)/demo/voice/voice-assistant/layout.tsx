import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/voice/voice-assistant", {
  title: "Voice Voice Assistant",
  description: "Interactive demo: Voice Voice Assistant. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
