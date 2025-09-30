// File: app/(authenticated)/chat/page.tsx
import { Metadata } from "next";
import { ChatMode } from "@/types/chat/chat.types";
import WelcomeScreen from "@/features/chat/components/views/WelcomeScreen";

const DEFAULT_MODEL_ID = "548126f2-714a-4562-9001-0c31cbeea375"; // "49848d52-9cc8-4ce4-bacb-32aa2201cd10";
const DEFAULT_MODE = "general" as ChatMode;

export const metadata: Metadata = {
    title: "Matrx AI. Chat Reimagined.",
    description: "The most powerful AI Models, in one place, empowered with Matrx Superpowers!",
};

// Properly handling async searchParams
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    // First await the searchParams
    const resolvedSearchParams = await searchParams;

    // Now we can safely access properties
    const modelId = (resolvedSearchParams.model as string) || (DEFAULT_MODEL_ID as string);
    const mode = (resolvedSearchParams.mode as ChatMode) || (DEFAULT_MODE as ChatMode);

    return <WelcomeScreen initialModelId={modelId} initialMode={mode} />;
}
