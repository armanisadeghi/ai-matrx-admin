import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Modular Chatbot route
export const metadata = createRouteMetadata("/ai/prompts/experimental/chatbot-customizer/modular", {
  title: "Modular Chatbot",
  description: "Build chatbots with modular components",
});

export default function ModularChatbotLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

