// ChatUI.tsx
import React, { useState } from "react";
import { MessageSquare, Bell, User } from "lucide-react";

import ResponseColumn from "./ResponseColumn";
import { Message } from "./types";
import PromptInput from "./PromptInput";

const DEFAULT_MODEL_ID = "id:49848d52-9cc8-4ce4-bacb-32aa2201cd10";


const ChatUI: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatStarted, setIsChatStarted] = useState<boolean>(false);

    // Function to handle sending a new message
    const handleSendMessage = (message: string) => {
        // Check if message only contains whitespace
        if (!message || message.replace(/\s/g, "").length === 0) return;

        // Add user message (preserving all whitespace)
        const newMessages: Message[] = [
            ...messages,
            {
                id: Date.now(),
                text: message, // Keep original message with all whitespace
                sender: "user",
                timestamp: new Date().toISOString(),
            },
        ];

        setMessages(newMessages);
        setIsChatStarted(true);

        // Simulate assistant response after a delay
        setTimeout(() => {
            setMessages([
                ...newMessages,
                {
                    id: Date.now() + 1,
                    text: "This is a sample response from the assistant. The background of this message will blend with the main background, while user messages have a different background color.",
                    sender: "assistant",
                    timestamp: new Date().toISOString(),
                },
            ]);
        }, 1000);
    };

    return (
        <div
            className="flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 absolute inset-0"
            style={{
                backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23999' fill-opacity='0.15' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
            }}
        >
            {/* Header - fixed at top */}
            <header className="p-3 flex items-center justify-between bg-transparent z-10">
                <div className="flex items-center space-x-2">
                    <div className="p-1 rounded-md">
                        <MessageSquare size={20} className="text-gray-800 dark:text-gray-200" />
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Matrix Chat</span>
                </div>

                {/* Header right icons */}
                <div className="flex items-center space-x-3">
                    <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800">
                        <Bell size={18} />
                    </button>
                    <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800">
                        <MessageSquare size={18} />
                    </button>
                    <button className="p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <User size={18} className="text-gray-700 dark:text-gray-300" />
                    </button>
                </div>
            </header>

            {/* Main content area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {!isChatStarted ? (
                    // Initial welcome screen
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Good afternoon.</h1>
                            <p className="text-xl text-gray-600 dark:text-gray-400">How can I help you today?</p>
                        </div>

                        {/* Initial Chat input */}
                        <div className="w-full max-w-3xl">
                            <PromptInput onSendMessage={handleSendMessage} defaultModelKey={DEFAULT_MODEL_ID} />

                            {/* Action buttons */}
                            <div className="mt-4 flex justify-center flex-wrap gap-3">
                                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                                    <span className="text-sm">Research</span>
                                </button>
                                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                                    <span className="text-sm">Brainstorm</span>
                                </button>
                                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                                    <span className="text-sm">Analyze Data</span>
                                </button>
                                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                                    <span className="text-sm">Create Images</span>
                                </button>
                                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                                    <span className="text-sm">Code</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Chat conversation view with fixed input at bottom
                    <>
                        {/* Scrollable message area without visible scrollbar */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">
                            <ResponseColumn messages={messages} />
                        </div>

                        {/* Simple blocker div that sits behind the input but above the response */}
                        <div
                            className="absolute bottom-0 left-0 right-0 h-8 bg-zinc-100 dark:bg-zinc-900 z-5"
                            style={{
                                backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23999' fill-opacity='0.15' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
                            }}
                        />

                        {/* Fixed input area at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 z-10">
                            <div className="p-4">
                                <div className="max-w-3xl mx-auto border border-zinc-100 dark:border-zinc-700 rounded-3xl">
                                    <PromptInput onSendMessage={handleSendMessage} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default ChatUI;
