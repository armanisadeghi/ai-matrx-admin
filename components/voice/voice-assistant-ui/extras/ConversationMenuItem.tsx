// ConversationMenuItem.tsx
import React from 'react';
import {MoreVertical, Trash2, Edit2, Eye} from "lucide-react";
import {Button} from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui";
import {useVoiceChat} from "@/hooks/tts/useVoiceChat";

interface ConversationMenuProps {
    voiceChatHook: ReturnType<typeof useVoiceChat>;
    conversationId: string;
    title: string;
    isActive: boolean;
}

export const ConversationMenuItem = (
    {
        voiceChatHook,
        conversationId,
        title,
        isActive
    }: ConversationMenuProps) => {
    const {setCurrentConversationId, deleteConversation} = voiceChatHook;

    return (
        <div
            className={`
                group/item flex items-center justify-between py-1.5 px-3 cursor-pointer
                ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}
            `}
            onClick={() => setCurrentConversationId(conversationId)}
        >
            <span className="truncate text-sm pr-2">{title || 'New conversation'}</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                    >
                        <MoreVertical className="w-4 h-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setCurrentConversationId(conversationId)}>
                        <Eye className="w-4 h-4 mr-2"/>
                        View Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            // Hook will be updated to handle this
                        }}
                    >
                        <Edit2 className="w-4 h-4 mr-2"/>
                        Edit Title
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversationId);
                        }}
                    >
                        <Trash2 className="w-4 h-4 mr-2"/>
                        Delete Chat
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
