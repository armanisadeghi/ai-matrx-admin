import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui";
import {MoreVertical, Trash2} from "lucide-react";
import React from "react";
import { ProcessState, Message, Conversation } from "@/types/voice/voiceAssistantTypes";


function ConversationTab(
    {
        conversation,
        isActive,
        onSelect,
        onDelete
    }: {
        conversation: Conversation;
        isActive: boolean;
        onSelect: () => void;
        onDelete: () => void;
    }) {
    return (
        <div
            className={`
                flex items-center gap-2 p-2 rounded-lg cursor-pointer
                ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}
            `}
            onClick={onSelect}
        >
            <span className="truncate max-w-[150px]">{conversation.title}</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                        <MoreVertical className="w-4 h-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Trash2 className="w-4 h-4 mr-2"/>
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export default ConversationTab;
