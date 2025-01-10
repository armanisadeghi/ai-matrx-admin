import React from 'react';
import { useRecipe } from './useRecipe';

interface MessageTemplate {
    id: string;
    role: 'system' | 'user' | 'assistant';
    type: 'text' | 'image' | 'video';
    content: string;
}

export function useMessageTemplates() {
    const { 
        selectedRecipeMessages,
        selectedMessages 
    } = useRecipe();

    const orderedMessages = React.useMemo(() => {
        const messageMap = new Map(
            selectedMessages.map(message => [message.id, message])
        );

        return selectedRecipeMessages
            .map(recipeMessage => ({
                message: messageMap.get(recipeMessage.messageId),
                order: recipeMessage.order
            }))
            .filter(item => item.message)
            .sort((a, b) => a.order - b.order)
            .map(item => ({
                id: item.message!.id,
                role: item.message!.role,
                type: item.message!.type,
                content: item.message!.content
            })) as MessageTemplate[];
    }, [selectedRecipeMessages, selectedMessages]);

    return {
        messages: orderedMessages
    };
}