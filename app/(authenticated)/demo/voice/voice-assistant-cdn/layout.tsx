import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/voice/voice-assistant-cdn", {
  title: "Voice Voice Assistant Cdn",
  description: "Interactive demo: Voice Voice Assistant Cdn. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
