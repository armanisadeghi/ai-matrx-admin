// Footer.tsx
import React from 'react';
import {motion} from 'motion/react';
import {Mic, MicOff, Send} from 'lucide-react';

interface FooterProps {
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    isListening: boolean;
    onToggleMic: () => void;
}

export const Footer: React.FC<FooterProps> = (
    {
        input,
        onInputChange,
        onSubmit,
        isListening,
        onToggleMic
    }) => (
    <div className="border-t bg-background/80 backdrop-blur-sm">
        <div className="flex gap-2">
            <div className="flex-1">
                <input
                    type="text"
                    className="w-full p-4 rounded-lg bg-background border focus:ring-2 focus:ring-primary"
                    placeholder={isListening ? "Listening... or type your message" : "Type your message"}
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit();
                        }
                    }}
                />
            </div>
            <motion.button
                type="button"
                className={`p-4 rounded-full ${isListening ? 'bg-red-500 text-white' : 'bg-muted'}`}
                onClick={onToggleMic}
                whileTap={{scale: 0.9}}
            >
                {isListening ? <Mic className="w-5 h-5"/> : <MicOff className="w-5 h-5"/>}
            </motion.button>
            <motion.button
                onClick={onSubmit}
                className="p-4 rounded-full bg-primary text-primary-foreground"
                disabled={!input.trim()}
                whileTap={{scale: 0.9}}
            >
                <Send className="w-5 h-5"/>
            </motion.button>
        </div>
    </div>
);
