import type { Metadata } from "next";
import { Suspense } from "react";
import ChatLayoutShell from "./ChatLayoutShell";
import ChatLoading from "./loading";

export const metadata: Metadata = {
  title: "Chat | AI Matrx",
  description: "AI-powered chat interface",
};

export default function PublicChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatLayoutShell>{children}</ChatLayoutShell>
    </Suspense>
  );
}
