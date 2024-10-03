import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flashcard } from '../types';
import OpenAI from 'openai';

interface AIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: Flashcard;
}

const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose, card }) => {
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
        setChatMessages(newMessages);
        setChatInput('');

        const openai = new OpenAI({
            apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true
        });

        try {
            const stream = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: `You are a helpful assistant. The current flashcard question is: "${card.front}" and the answer is: "${card.back}". Help the user understand this concept.` },
                    ...newMessages
                ],
                stream: true,
            });

            let assistantMessage = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                assistantMessage += content;
                setChatMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ask AI Assistant</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col h-[400px]">
                    <div className="flex-grow overflow-auto p-4">
                        {chatMessages.map((msg, index) => (
                            <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                <span className={`inline-block p-2 rounded ${msg.role === 'user' ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                                    {msg.content}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-zinc-700">
                        <div className="flex">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="flex-grow p-2 rounded-l bg-zinc-800 text-white"
                                placeholder="Ask a question..."
                            />
                            <Button onClick={handleSendMessage} className="rounded-l-none">Send</Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AIChatModal;
