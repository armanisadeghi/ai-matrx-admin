'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui';
import MessageTemplateHeader from './MessageTemplateHeader';
import MessageEditor from '@/features/rich-text-editor/provider/withMessageEditor';
import { useUpdateMessage } from '../hooks/messages/useAddMessage';
import { useMessageTemplatesWithNew } from '../hooks/dev/useMessageWithNew';

interface MessageCardProps {
    id: string;
    initialContent: string;
    role: string;
    isCollapsed: boolean;
    onCollapse: () => void;
    onExpand: () => void;
    onDelete?: (id: string) => void;
}

export function MessageCard({
    id,
    role,
    initialContent,
    isCollapsed,
    onCollapse,
    onExpand,
    onDelete
}: MessageCardProps) {
    const [content, setContent] = useState(initialContent);
    const [isEditorHidden, setIsEditorHidden] = useState(isCollapsed);
    const [isDirty, setIsDirty] = useState(false);
    
    const { updateMessageContent, saveMessage } = useUpdateMessage();
    const { deleteMessageById } = useMessageTemplatesWithNew();

    const handleSave = () => {
        updateMessageContent(id, content);
        saveMessage(id);
        setIsDirty(false);
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(id);
        } else {
            deleteMessageById(id);
        }
    };

    const handleAddMedia = () => {
        // Placeholder for media functionality
        console.log('Adding media to editor:', id);
    };

    const handleLinkBroker = () => {
        // Placeholder for broker linking
        console.log('Linking broker for:', id);
    };

    const handleToggleCollapse = () => {
        const newCollapsedState = !isCollapsed;
        setIsEditorHidden(newCollapsedState);
        if (newCollapsedState) {
            onCollapse();
        } else {
            onExpand();
        }
    };

    const handleMessageUpdate = (messageData: unknown) => {
        console.log('Message updated:', messageData);
        setIsDirty(true);
    };

    const handleChipUpdate = (chips: unknown) => {
        console.log('Chips updated:', chips);
        setIsDirty(true);
    };

    return (
        <Card className='h-full p-0 overflow-hidden bg-background border-elevation2'>
        <MessageTemplateHeader
            id={id}
            role={role}
            isCollapsed={isCollapsed}
            onAddMedia={handleAddMedia}
            onLinkBroker={handleLinkBroker}
            onDelete={handleDelete}
            onSave={handleSave}
            onToggleCollapse={onCollapse}
        />

        <div
            className={`transition-all duration-200 ${
                isEditorHidden ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'
            }`}
        >
            <MessageEditor
                id={id}
                className='w-full h-full border rounded-md'
                initialContent={content}
                onMessageUpdate={(messageData) => {
                    console.log('--Editor Container Message updated:', messageData);
                }}
                onChipUpdate={(chips) => {
                    console.log('Editor Container Chips updated:', chips);
                }}
            />
        </div>
    </Card>
    );
}