// File: features/chat/ui-parts/layout/ChatHeader.tsx

import React from "react";
import ClientHeaderContent from "@/features/chat/components/header/ClientHeaderContent";
import { IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";

interface ChatHeaderProps {
    title?: string;
    baseRoute?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ baseRoute = "/chat", title = "Matrx" }) => {
    return (
        <header
            className="p-3 flex items-center justify-between bg-zinc-100 dark:bg-zinc-850 z-10"
            // Remove the background pattern from here
        >
            <div className="flex items-center space-x-2">
                <div className="p-1 rounded-md">
                    <IconMenu2 size={20} className="text-gray-800 dark:text-gray-200" />
                </div>
                <Link href={baseRoute}>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{title}</span>
                </Link>
            </div>

            {/* Client-side header right icons */}
            <ClientHeaderContent baseRoute={baseRoute} />
        </header>
    );
};

export default ChatHeader;
