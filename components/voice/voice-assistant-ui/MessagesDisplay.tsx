'use client';

import {AnimatePresence, motion} from "framer-motion";
import React, {useEffect, useRef} from "react";
import {Message} from "@/types/voice/voiceAssistantTypes";
import MessageContentDisplay from "@/components/message-display";


function MessagesDisplay({messages}: { messages: Message[] }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    return (
        <div className="space-y-4">
            <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -20}}
                        layout
                        className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <motion.div
                            layout
                            className={`max-w-[80%] p-4 rounded-lg ${
                                message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                        >
                            {message.role === 'assistant' ? (
                                <MessageContentDisplay
                                    content={message.content}
                                    role={message.role}
                                />
                            ) : (
                                 <p className="whitespace-pre-wrap">{message.content}</p>
                             )}

                            <div className="flex items-center justify-between text-xs opacity-50 mt-1">
                                <time dateTime={new Date(message.timestamp).toISOString()}>
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </time>
                                {message.latency && (
                                    <span className="ml-2">{message.latency}ms</span>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-1"/>
        </div>
    );
}

export default MessagesDisplay;
