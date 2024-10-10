// flash-cards/components/AiChatModal.tsx
'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {useAppSelector, useAppDispatch} from '@/lib/redux/hooks';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ArrowUp} from 'lucide-react';
import {useAiChat} from '../hooks/useAiChat';
import {addMessage} from '@/lib/redux/slices/flashcardChatSlice';
import {selectActiveFlashcard, selectActiveFlashcardChat} from '@/lib/redux/selectors/flashcardSelectors';
import MarkdownRenderer from "@/app/(authenticated)/flash-cards/ai/MarkdownRenderer";

interface AiChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    firstName: string;
}

const AiChatModal: React.FC<AiChatModalProps> = ({isOpen, onClose, firstName}) => {
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('current');
    const dispatch = useAppDispatch();

    const currentFlashcard = useAppSelector(selectActiveFlashcard);
    const currentChat = useAppSelector(selectActiveFlashcardChat);
    const allChats = useAppSelector((state) => state.flashcardChat.flashcards);

    const {isLoading, streamingMessage, sendInitialMessage, sendMessage} = useAiChat();

    const allChatHistory = useMemo(() => {
        return Object.values(allChats).flatMap(flashcard =>
            flashcard.chat.map(msg => ({
                ...msg,
                content: `[Card ${flashcard.id}] ${msg.content}`
            }))
        );
    }, [allChats]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('current');
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && currentFlashcard && currentChat.length === 0) {
            sendInitialMessage(currentFlashcard, firstName);
        }
    }, [isOpen, currentFlashcard, firstName, sendInitialMessage, currentChat.length]);

    const handleSubmit = () => {
        if (message.trim() && !isLoading && currentFlashcard) {
            dispatch(addMessage({flashcardId: currentFlashcard.id, message: {role: 'user', content: message}}));
            const chatHistory = activeTab === 'current' ? currentChat : allChatHistory;
            sendMessage(message, currentFlashcard.id, chatHistory);
            setMessage('');
        }
    };

    const renderMessage = (content: string, role: any) => (
        <MarkdownRenderer content={content} type="message" role={role} />
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-neutral-100 dark:bg-neutral-800 w-full max-w-[70vw] h-[90vh] flex flex-col">
                <DialogHeader className="mb-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setActiveTab('current')}
                                variant="outline"
                                className={`${activeTab === 'current' ? 'bg-primary text-primary-foreground' : ''}`}
                            >
                                Current Flashcard
                            </Button>
                            <Button
                                onClick={() => setActiveTab('all')}
                                variant="outline"
                                className={`${activeTab === 'all' ? 'bg-primary text-primary-foreground' : ''}`}
                            >
                                All History
                            </Button>
                        </div>
                        <DialogTitle className="text-md">
                            {currentFlashcard.front}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto w-full space-y-4">
                    {activeTab === 'current' ? (
                        <>
                            {currentChat.map((msg, idx) => (
                                <React.Fragment key={idx}>
                                    {renderMessage(msg.content, msg.role)}
                                </React.Fragment>
                            ))}
                            {streamingMessage ? (
                                renderMessage(streamingMessage, 'assistant')
                            ) : (
                                isLoading && (
                                    <div className="text-center w-full py-2 bg-secondary dark:bg-gray-700 rounded">AI is
                                        thinking...</div>
                                )
                            )}
                        </>
                    ) : (
                        allChatHistory.map((msg, idx) => (
                            <React.Fragment key={idx}>
                                {renderMessage(msg.content, msg.role)}
                            </React.Fragment>
                        ))
                    )}
                </div>

                <div className="relative w-full mt-4">
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your question..."
                        className="w-full pr-12"
                        rows={3}
                    />
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full p-2"
                        size="icon"
                    >
                        <ArrowUp className="h-4 w-4"/>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AiChatModal;