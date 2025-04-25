// File: app/(authenticated)/chat/page.tsx
import { Metadata } from "next";
import { ChatMode } from "@/types/chat/chat.types";
import WelcomeScreen from "@/features/chat/components/views/WelcomeScreen";

const DEFAULT_MODEL_ID = "dd45b76e-f470-4765-b6c4-1a275d7860bf"; // "49848d52-9cc8-4ce4-bacb-32aa2201cd10";
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
