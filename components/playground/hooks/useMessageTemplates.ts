import React from 'react';
import { useRecipe } from './useRecipe';
import { MessageTemplateDataOptional } from '@/types';

export function useMessageTemplates() {
    const { 
        recipeMessages,
        messages 
    } = useRecipe();

    console.log('Templates Hook:', { recipeMessages, messages }); // Let's see what we're getting

    const orderedMessages = React.useMemo(() => {
        if (!recipeMessages?.length || !messages?.length) {
            return [];
        }

        return recipeMessages
            .sort((a, b) => a.order - b.order)
            .map(recipeMessage => {
                const message = messages.find(m => m.id === recipeMessage.messageId);
                if (!message) return null;
                
                return {
                    id: message.id,
                    role: message.role,
                    type: message.type,
                    content: message.content
                };
            })
            .filter(Boolean) as MessageTemplateDataOptional[];
    }, [recipeMessages, messages]);

    console.log('Ordered Messages:', orderedMessages); // Let's see what we're producing

    return {
        messages: orderedMessages
    };
}