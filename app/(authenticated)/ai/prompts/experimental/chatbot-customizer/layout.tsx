import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Chatbot Customizer route
export const metadata = createRouteMetadata("/ai/prompts/experimental/chatbot-customizer", {
  title: "Chatbot Customizer",
  description: "Customize and configure AI chatbot behavior",
});

export default function ChatbotCustomizerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

