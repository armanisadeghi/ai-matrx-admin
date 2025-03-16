// File: features/chat/ui-parts/layout/ChatHeader.tsx

import React from "react";
import { MessageSquare, Bell } from "lucide-react";
import ClientHeaderContent from "@/features/chat/ui-parts/header/ClientHeaderContent";
import {IconMenu2, IconX} from "@tabler/icons-react";

interface ChatHeaderProps {
  title?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  title = "Matrx"
}) => {
  return (
    <header className="p-3 flex items-center justify-between bg-zinc-100 dark:bg-zinc-850 z-10">
      <div className="flex items-center space-x-2">
        <div className="p-1 rounded-md">
          <IconMenu2 size={20} className="text-gray-800 dark:text-gray-200" />
        </div>
        <span className="font-medium text-gray-800 dark:text-gray-200">{title}</span>
      </div>

      {/* Client-side header right icons */}
      <ClientHeaderContent />
    </header>
  );
};

export default ChatHeader;