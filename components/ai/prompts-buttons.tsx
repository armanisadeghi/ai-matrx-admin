import React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';
import {motion} from 'motion/react';
import {QUICK_ACTIONS} from '@/constants/flashcard-constants';



interface PromptButtonsProps {
    prompts: Record<string, string>;
    onSelectPrompt?: (prompt: string) => void;
    className?: string;
}

export const PromptButtons = (
    {
        prompts,
        onSelectPrompt,
        className
    }: PromptButtonsProps) => {
    return (
        <ScrollArea className={cn("w-full max-w-[100vw] px-2", className)}>
            <div className="flex gap-2 pb-4 overflow-x-auto">
                {Object.entries(prompts).map(([title, description]) => (
                    <motion.button
                        key={title}
                        onClick={() => onSelectPrompt?.(description)}
                        className="flex flex-col min-w-[140px] max-w-[200px] h-[84px] p-3
                     bg-card hover:bg-accent text-card-foreground
                     rounded-lg border border-border
                     transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                     active:scale-95"
                        whileHover={{y: -2}}
                        whileTap={{scale: 0.98}}
                    >
            <span className="text-sm font-medium line-clamp-1">
              {title}
            </span>
                        <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {description}
            </span>
                    </motion.button>
                ))}
            </div>
        </ScrollArea>
    );
};

interface AiChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    firstName: string;
}

export const QuickActionButtons = ({ onSelect, isDisabled }: {
    onSelect: (prompt: string) => void;
    isDisabled: boolean;
}) => {
    return (
        <ScrollArea className="w-full max-w-[100vw]">
            <div className="flex gap-3 pb-2 px-1">
                {Object.entries(QUICK_ACTIONS).map(([title, prompt]) => (
                    <button
                        key={title}
                        onClick={() => onSelect(String(prompt))}
                        disabled={isDisabled}
                        className={`
                            flex flex-col items-start gap-1.5
                            min-w-[160px] max-w-[200px]
                            px-4 py-3 rounded-xl
                            bg-secondary/40 hover:bg-secondary 
                            dark:bg-secondary/20 dark:hover:bg-secondary/40
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                            group
                        `}
                    >
                        <span className="text-sm font-semibold line-clamp-1 text-left w-full text-foreground">
                            {title}
                        </span>
                        <span className="text-xs line-clamp-2 text-left w-full text-muted-foreground group-hover:text-foreground/80">
                            {String(prompt)}
                        </span>
                    </button>
                ))}
            </div>
        </ScrollArea>
    );
};
