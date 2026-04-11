import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/voice/tts-with-controls", {
  title: "Voice Tts With Controls",
  description: "Interactive demo: Voice Tts With Controls. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
