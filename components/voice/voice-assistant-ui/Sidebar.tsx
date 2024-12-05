// Sidebar.tsx
import React from 'react';
import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';
import ConversationTab from './ConversationTab';
import {ProcessState, Message, Conversation} from "@/types/voice/voiceAssistantTypes";

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string;
    onNewConversation: () => void;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = (
    {
        conversations,
        currentConversationId,
        onNewConversation,
        onSelectConversation,
        onDeleteConversation
    }) => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b">
            <Button
                onClick={onNewConversation}
                variant="outline"
                size="sm"
                className="w-full gap-2"
            >
                <Plus className="w-4 h-4"/>
                New Conversation
            </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
                <ConversationTab
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === currentConversationId}
                    onSelect={() => onSelectConversation(conv.id)}
                    onDelete={() => onDeleteConversation(conv.id)}
                />
            ))}
        </div>
    </div>
);
