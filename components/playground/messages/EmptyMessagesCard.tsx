import React, { useState, useEffect } from 'react';
import { Radar } from "lucide-react";
import { cn } from '@/utils/cn';
import { useAddMessage } from '@/components/playground/hooks/messages/useAddMessage';
import { DEFAULT_MESSAGES } from '@/components/playground/messages/prompts';
import MatrxGradientCard from '@/components/matrx/MatrxGradientCard';

// Add styles for animation that might not be in Tailwind by default
const globalStyles = `
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
  50% { box-shadow: 0 0 30px rgba(37, 99, 235, 0.8); }
}
@keyframes reverse-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(-360deg); }
}
.drop-shadow-glow {
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
}
.animate-reverse {
  animation-direction: reverse;
}
`;

// Improved Loading Overlay Component
const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
      <div className="w-[32rem] h-[32rem] bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-violet-500/20 rounded-xl shadow-2xl flex flex-col items-center justify-center gap-6 border border-white/20 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-violet-500/10 animate-pulse" />
        
        {/* Spinning circles */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-4 border-t-blue-500 border-r-indigo-500 border-b-violet-500 border-l-transparent rounded-full animate-spin" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-t-transparent border-r-blue-500 border-b-indigo-500 border-l-violet-500 rounded-full animate-spin animate-reverse" />
        </div>
        
        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-8 text-white">
          <Radar className="h-20 w-20 text-white drop-shadow-glow animate-pulse" />
          
          <div className="text-center">
            <p className="text-2xl font-semibold text-white mb-3">Matrx is cooking up your recipe...</p>
            <p className="text-lg text-white/80">Preparing your custom environment</p>
          </div>
          
          {/* Loading dots */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

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
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(true); // Control the overlay
    const { addMessage } = useAddMessage({ onSuccess, onError });
    
    // Set up the initial cooldown timer and handle overlay
    // We make this longer than the actual cooldown to ensure smooth transition
    useEffect(() => {
        // First timer for the actual application cooldown
        const cooldownTimer = setTimeout(() => {
            setInitialCooldownComplete(true);
        }, 2000);
        
        // Second timer for the overlay (slightly longer to ensure we never see disabled state)
        // This timer will ALWAYS run for the minimum time before deciding what to do
        const overlayTimer = setTimeout(() => {
            // After minimum time, only hide if not disabled
            if (!disabled) {
                setShowLoadingOverlay(false);
            }
        }, 2300); // Extra 300ms to ensure cooldown is complete first
        
        // Clean up timers if the component unmounts
        return () => {
            clearTimeout(cooldownTimer);
            clearTimeout(overlayTimer);
        };
    }, []); // Empty dependency array - this only runs once on mount
    
    // This effect handles changes to the disabled prop AFTER initial mount
    useEffect(() => {
        // Only react to disabled changes after the initial cooldown is complete
        if (initialCooldownComplete) {
            setShowLoadingOverlay(disabled);
        }
    }, [disabled, initialCooldownComplete]);
    
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
    
    // Render loading overlay if needed
    if (showLoadingOverlay) {
        return (
            <>
                {/* Add the custom styles to the document */}
                <style>{globalStyles}</style>
                <LoadingOverlay />
            </>
        );
    }
    
    if (isCompleted) {
        return (
            <MatrxGradientCard
                title="Messages Added Successfully"
                subtitle="Your conversation is ready to begin"
                className={cn("w-full h-full flex flex-col text-sm sm:text-base", className)}
                containerClassName="bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500"
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
                containerClassName="bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500"
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