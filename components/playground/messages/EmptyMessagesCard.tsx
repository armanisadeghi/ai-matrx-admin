import React, { useState, useEffect } from 'react';
import { Radar } from "lucide-react";
import { cn } from '@/utils';
import { useAddMessage } from '@/components/playground/hooks/messages/useAddMessage';
import { DEFAULT_MESSAGES } from '@/components/playground/messages/prompts';
import MatrxGradientCard from '@/components/matrx/MatrxGradientCard';

interface EmptyMessagesCardProps {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
    className?: string;
    disabled?: boolean;
}

export const EmptyMessagesCard: React.FC<EmptyMessagesCardProps> = ({
    onSuccess,
    onError,
    onClose,
    className,
    disabled = true
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [initialCooldownComplete, setInitialCooldownComplete] = useState(false);
    const { addMessage } = useAddMessage({ onSuccess, onError });

    // Set up the initial 2-second cooldown timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setInitialCooldownComplete(true);
        }, 2000);
        
        // Clean up the timer if the component unmounts
        return () => clearTimeout(timer);
    }, []);

    const handleAddTemplateMessages = async () => {
        // Check both the prop disabled and our cooldown state
        if (disabled || !initialCooldownComplete) return;
        
        setIsCreating(true);
        try {
            await addMessage(DEFAULT_MESSAGES.SYSTEM);
            await addMessage(DEFAULT_MESSAGES.USER);
            setIsCompleted(true);
            onSuccess?.();
        } catch (error) {
            onError?.(error as Error);
        } finally {
            setIsCreating(false);
        }
    };

    // Calculate the effective disabled state based on both the prop and the cooldown
    const isEffectivelyDisabled = disabled || !initialCooldownComplete || isCreating;

    if (isCompleted) {
        return (
            <MatrxGradientCard
                title="Messages Added Successfully"
                subtitle="Your conversation is ready to begin"
                className={cn("w-full h-full flex flex-col text-sm sm:text-base", className)}
                containerClassName="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
                headerClassName="py-4"
                contentClassName="flex flex-col items-center justify-center p-4 flex-grow"
                allowTitleWrap={true}
                allowDescriptionWrap={true}
            >
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
                    <div className="text-center text-background/90 font-medium">
                        System Message and User Message Created Successfully
                    </div>
                    {onClose && (
                        <div 
                            onClick={onClose}
                            className="cursor-pointer px-4 py-2 rounded-md bg-background/20 
                                     hover:bg-background/30 transition-colors text-background/90"
                        >
                            Close
                        </div>
                    )}
                </div>
            </MatrxGradientCard>
        );
    }

    return (
        <div 
            onClick={!isEffectivelyDisabled ? handleAddTemplateMessages : undefined}
            className={cn(
                "mt-10 transition-all duration-300",
                "group hover:opacity-90",
                isEffectivelyDisabled ? "pointer-events-none opacity-50" : "cursor-pointer"
            )}
        >
            <MatrxGradientCard
                title="Provide Instructions and Dynamic Elements for your AI Agent"
                subtitle="Begin with the System instructions & the first User Message."
                description="The system message defines the AI's behavior and capabilities, while the user message starts the interaction. With AI Matrx, you can include dynamic Data Brokers which allow you to create highly dynamic template recipees unlike anything you've ever seen!"
                className={cn("w-full h-full flex flex-col text-md md:text-base", className)}
                containerClassName="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
                headerClassName="py-4 text-xl"
                contentClassName="flex flex-col items-center justify-center p-4 flex-grow text-md"
                allowTitleWrap={true}
                allowDescriptionWrap={true}
            >
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
                    <Radar 
                        size={48}
                        className="text-secondary group-hover:scale-105 transition-transform" 
                    />
                    <span className="font-medium text-center">
                        {isCreating ? 'Adding Messages...' : initialCooldownComplete ? 'CLICK TO GET STARTED' : 'Loading...'}
                    </span>
                </div>
            </MatrxGradientCard>
        </div>
    );
};

export default EmptyMessagesCard;