import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Instant Custom Chatbot route
export const metadata = createRouteMetadata("/ai/prompts/experimental/chatbot-customizer/instant-custom-chatbot", {
  title: "Instant Custom Chatbot",
  description: "Quick chatbot setup and deployment",
});

export default function InstantCustomChatbotLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

