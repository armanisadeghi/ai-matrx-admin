import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

import { cn } from '@/utils';
import { useAddMessage } from '@/components/playground/hooks/messages/useAddMessage';
import { DEFAULT_MESSAGES } from '@/components/playground/constants/prompts';
import MatrxGradientCard from '@/components/matrx/MatrxGradientCard';

interface NewTemplateMessagesCardProps {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    className?: string;
}

export const NewTemplateMessagesCard: React.FC<NewTemplateMessagesCardProps> = ({
    onSuccess,
    onError,
    className
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const { addMessage } = useAddMessage({ onSuccess, onError });

    const handleAddTemplateMessages = async () => {
        setIsCreating(true);
        try {
            await addMessage(DEFAULT_MESSAGES.SYSTEM);
            await addMessage(DEFAULT_MESSAGES.USER);
            onSuccess?.();
        } catch (error) {
            onError?.(error as Error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <MatrxGradientCard
            title="Start Your Conversation"
            subtitle="Add System and User Messages"
            description="Begin with a system message that defines the AI's behavior and capabilities, followed by your first user message to start the interaction."
            className={cn("w-full text-md sm:text-base", className)}
            containerClassName="mt-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
            headerClassName="py-4"
            contentClassName="flex flex-col items-center justify-center p-4"
            allowTitleWrap={true}
            allowDescriptionWrap={true}
        >
            <Button
                variant="outline"
                onClick={handleAddTemplateMessages}
                disabled={isCreating}
                className="w-full h-16 mt-6 bg-background/80 backdrop-blur-sm 
                          hover:bg-background/90 transition-all duration-300
                          flex items-center justify-center gap-2 px-3
                          text-xs sm:text-sm"
            >
                <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium whitespace-normal text-center leading-tight">
                    {isCreating ? 'Adding Messages...' : 'Create System & User Messages'}
                </span>
            </Button>
        </MatrxGradientCard>
    );
};

export default NewTemplateMessagesCard;