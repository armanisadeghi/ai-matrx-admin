// File: app/(authenticated)/chat/page.tsx
import { Metadata } from "next";
import { ChatMode } from "@/types/chat/chat.types";
import { DEFAULT_MODEL_ID, DEFAULT_MODE } from "@/constants/chat";

export const metadata: Metadata = {
    title: "Matrx AI. Chat Reimagined.",
    description: "The most powerful AI Models, in one place, empowered with Matrx Superpowers!",
};

function WelcomeScreenFallback() {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat. Reimagined.</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">Artificial Intelligence with Matrx Superpowers.</p>
            </div>

            <div className="w-full max-w-3xl flex justify-center items-center">
                <div className="relative w-12 h-12">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-200 dark:border-zinc-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            </div>
        </div>
    );
}

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedSearchParams = await searchParams;

    const modelId = (resolvedSearchParams.model as string) || (DEFAULT_MODEL_ID as string);
    const mode = (resolvedSearchParams.mode as ChatMode) || (DEFAULT_MODE as ChatMode);

    return <></>;

}
