// File: features/chat/ui-parts/layout/ChatHeader.tsx

import React from "react";
import ClientHeaderContent from "@/features/chat/components/header/ClientHeaderContent";
import Link from "next/link";

interface ChatHeaderProps {
    title?: string;
    baseRoute?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ baseRoute = "/chat", title = "AI Matrx" }) => {
    return (
        <header
            className="py-2 px-3 flex items-center justify-between bg-card border-b border-border z-11"
        >
            <div className="flex items-center space-x-2">
                <Link href={baseRoute}>
                    <span className="font-medium text-foreground">{title}</span>
                </Link>
            </div>

            {/* Client-side header right icons */}
            <ClientHeaderContent baseRoute={baseRoute} />
        </header>
    );
};

export default ChatHeader;
