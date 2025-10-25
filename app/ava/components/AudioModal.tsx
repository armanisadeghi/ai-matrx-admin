import React, { useState, useEffect } from 'react';
import {
    Credenza,
    CredenzaContent,
    CredenzaHeader,
    CredenzaTitle,
    CredenzaDescription,
    CredenzaBody,
} from "@/components/ui/credenza-modal/credenza";
import { Beaker } from 'lucide-react';
import TextToSpeechPlayer from './TextToSpeechPlayer';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
}

const AudioModal: React.FC<AudioModalProps> = ({ isOpen, onClose, text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTextComplete, setIsTextComplete] = useState(false);
    const [startTextAnimation, setStartTextAnimation] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDisplayedText('');
            setIsTextComplete(false);
            setStartTextAnimation(false);

            // Delay the start of text animated-menu by 2 seconds
            const delayTimer = setTimeout(() => {
                setStartTextAnimation(true);
            }, 1000);

            return () => clearTimeout(delayTimer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (startTextAnimation) {
            let index = 0;
            const intervalId = setInterval(() => {
                if (index < text.length) {
                    setDisplayedText((prev) => prev + text[index]);
                    index++;
                } else {
                    clearInterval(intervalId);
                    setIsTextComplete(true);
                }
            }, 50); // Adjust this value to control the speed of text appearance
            return () => clearInterval(intervalId);
        }
    }, [startTextAnimation, text]);

    return (
        <Credenza open={isOpen} onOpenChange={onClose}>
            <CredenzaContent className="sm:max-w-[800px] max-h-[80vh]">
                <CredenzaHeader>
                    <CredenzaTitle className="text-3xl font-bold flex items-center">
                        <Beaker className="mr-2 h-8 w-8" />
                        Chemistry Explanation
                    </CredenzaTitle>
                    <CredenzaDescription className="text-lg">
                        Listen to the audio explanation of the concept.
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody className="mt-6">
                    <div className="space-y-4">
                        <AnimatePresence>
                            {startTextAnimation && displayedText && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-lg leading-relaxed"
                                >
                                    {displayedText}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="mt-8">
                        <TextToSpeechPlayer
                            text={text}
                            autoPlay={true}
                            onPlaybackEnd={() => {}}
                        />
                    </div>
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
};

export default AudioModal;
