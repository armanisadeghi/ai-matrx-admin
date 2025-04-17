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
        <div className="space-y-4 pt-3">
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
                            className={`max-w-[80%] p-2 rounded-lg ${
                                message.role === 'user'
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-50'
                                : 'bg-muted text-muted-foreground'
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
                        </motion.div>
                    </motion.div>
                ))}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-1"/>
        </div>
    );
}

export default MessagesDisplay;
