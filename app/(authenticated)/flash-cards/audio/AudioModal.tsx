import React, {useState, useEffect} from 'react';
import {
    Credenza,
    CredenzaContent,
    CredenzaHeader,
    CredenzaTitle,
    CredenzaDescription,
    CredenzaBody,
} from "@/components/ui/credenza-modal/credenza";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Headphones} from 'lucide-react';
import TextToSpeechPlayer from './TextToSpeechPlayer';
import {motion, AnimatePresence} from 'framer-motion';
import {useWindowSize} from "@uidotdev/usehooks";
import {cn} from "@/lib/utils";

interface AudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    hideText?: boolean;
    className?: string;
}

const AudioModal: React.FC<AudioModalProps> = (
    {
        isOpen,
        onClose,
        text,
        icon = <Headphones className="h-6 w-6 sm:h-8 sm:w-8"/>,
        title = "Audio",
        description = "Listen to the audio and see the text.",
        hideText = false,
        className,
    }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTextComplete, setIsTextComplete] = useState(false);
    const [startTextAnimation, setStartTextAnimation] = useState(false);
    const {width} = useWindowSize();
    const isMobile = width ? width < 640 : false;

    useEffect(() => {
        if (isOpen) {
            setDisplayedText('');
            setIsTextComplete(false);
            setStartTextAnimation(false);

            const delayTimer = setTimeout(() => {
                setStartTextAnimation(true);
            }, 1000);

            return () => clearTimeout(delayTimer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (startTextAnimation && !hideText) {
            let index = 0;
            const intervalId = setInterval(() => {
                if (index < text.length) {
                    setDisplayedText((prev) => prev + text[index]);
                    index++;
                } else {
                    clearInterval(intervalId);
                    setIsTextComplete(true);
                }
            }, 50);
            return () => clearInterval(intervalId);
        }
    }, [startTextAnimation, text, hideText]);

    return (
        <Credenza open={isOpen} onOpenChange={onClose}>
            <CredenzaContent
                className={cn(
                    "sm:max-w-[800px] max-h-[90vh] w-[95vw] sm:w-[90vw]",
                    className
                )}
            >
                <CredenzaHeader>
                    <CredenzaTitle className="text-xl sm:text-3xl font-bold flex items-center gap-2">
                        {icon}
                        {title}
                    </CredenzaTitle>
                    <CredenzaDescription className="text-base sm:text-lg text-muted-foreground">
                        {description}
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody className="mt-4 sm:mt-6 flex flex-col gap-4">
                    {!hideText && (
                        <ScrollArea className="flex-grow h-[30vh] sm:h-[40vh] w-full rounded-md border p-4">
                            <AnimatePresence>
                                {startTextAnimation && displayedText && (
                                    <motion.div
                                        initial={{opacity: 0}}
                                        animate={{opacity: 1}}
                                        exit={{opacity: 0}}
                                        className="text-base sm:text-lg leading-relaxed"
                                    >
                                        {displayedText}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </ScrollArea>
                    )}
                    <div className={cn(
                        "w-full",
                        hideText ? "mt-0" : "mt-4 sm:mt-6"
                    )}>
                        <TextToSpeechPlayer
                            text={text}
                            autoPlay={true}
                            onPlaybackEnd={() => {
                            }}
                        />
                    </div>
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
};

export default AudioModal;
