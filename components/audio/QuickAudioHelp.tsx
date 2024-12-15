// components/audio/QuickAudioHelp.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AudioModal from '@/components/audio/AudioModal';
import { AUDIO_HELP_MESSAGES } from '@/constants/audioHelp';
import type { QuickAudioHelpProps } from '@/types/audioHelp';

const QuickAudioHelp: React.FC<QuickAudioHelpProps> = ({ messageId, className }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const message = AUDIO_HELP_MESSAGES[messageId];

    if (!message) {
        console.warn(`Audio help message with id "${messageId}" not found`);
        return null;
    }

    const Icon = message.icon;

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={className}
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Icon className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{message.title || 'Audio Help Available'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <AudioModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                text={message.text}
                icon={<Icon className="h-6 w-6 sm:h-8 sm:w-8" />}
                title={message.title}
                description={message.description}
            />
        </>
    );
};

export default QuickAudioHelp;
