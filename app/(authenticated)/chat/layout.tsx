import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import ChatLayoutClient from "./ChatLayoutClient";

export const metadata = createRouteMetadata("/chat", {
    title: "Chat",
    description: "Interact with our reimagined AI chat interface",
});

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return <ChatLayoutClient>{children}</ChatLayoutClient>;
}
