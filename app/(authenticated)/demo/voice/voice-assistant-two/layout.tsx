import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/voice/voice-assistant-two", {
  title: "Voice Voice Assistant Two",
  description: "Interactive demo: Voice Voice Assistant Two. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
