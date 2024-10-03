// flash-cards/components/AiChatModal.tsx

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Flashcard, FlashcardData, ChatMessage } from "@/types/flashcards.types";
import { useAiChat } from '../hooks/useAiChat';
import { RootState, AppDispatch } from '@/lib/redux/store';
import { addMessage } from '@/lib/redux/slices/flashcardChatSlice';

interface AiChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    flashcard: FlashcardData;
    firstName: string;
}

const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, flashcard, firstName }) => {
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('current');
    const dispatch = useDispatch<AppDispatch>();

    const currentChat = useSelector((state: RootState) =>
        state.flashcardChat[flashcard.id]?.chat || []
    );
    const allChats = useSelector((state: RootState) => state.flashcardChat);

    const { isLoading, streamingMessage, sendInitialMessage, sendMessage } = useAiChat();

    useEffect(() => {
        if (isOpen && flashcard && currentChat.length === 0) {
            const fullFlashcard: Flashcard = {
                ...flashcard,
                reviewCount: 0,
                correctCount: 0,
                incorrectCount: 0
            };
            sendInitialMessage(fullFlashcard, firstName, (content: string) => {
                dispatch(addMessage({ flashcardId: flashcard.id, message: { role: 'assistant', content } }));
            });
        }
    }, [isOpen, flashcard, firstName, sendInitialMessage, currentChat.length, dispatch]);

    const handleSubmit = () => {
        if (message.trim() && !isLoading) {
            dispatch(addMessage({ flashcardId: flashcard.id, message: { role: 'user', content: message } }));
            sendMessage(message, flashcard.id, (content: string) => {
                dispatch(addMessage({ flashcardId: flashcard.id, message: { role: 'assistant', content } }));
            });
            setMessage('');
        }
    };

    const renderMessage = (content: string, role: string) => (
        <div className={`mb-4 ${role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-lg ${role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({node, ...props}) => <p className="mb-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-500 underline" {...props} />,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl">Ask the AI</DialogTitle>
                    <div className="flex space-x-2">
                        <Button
                            onClick={() => setActiveTab('current')}
                            variant={activeTab === 'current' ? 'default' : 'outline'}
                        >
                            Current Flashcard
                        </Button>
                        <Button
                            onClick={() => setActiveTab('all')}
                            variant={activeTab === 'all' ? 'default' : 'outline'}
                        >
                            All History
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto p-4 bg-background rounded-lg mb-4">
                    {activeTab === 'current' ? (
                        <>
                            {currentChat.map((msg: ChatMessage, idx: number) => (
                                <React.Fragment key={idx}>
                                    {renderMessage(msg.content, msg.role)}
                                </React.Fragment>
                            ))}
                            {streamingMessage && renderMessage(streamingMessage, 'assistant')}
                        </>
                    ) : (
                        Object.entries(allChats).flatMap(([cardId, flashcardState]) =>
                            flashcardState.chat.map((msg: ChatMessage, idx: number) => (
                                <React.Fragment key={`${cardId}-${idx}`}>
                                    {renderMessage(`[Card ${cardId}] ${msg.content}`, msg.role)}
                                </React.Fragment>
                            ))
                        )
                    )}
                    {isLoading && <div className="text-center">AI is thinking...</div>}
                </div>

                <div className="flex items-start space-x-2">
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your question..."
                        className="flex-grow"
                        rows={3}
                    />
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        Send
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AiChatModal;