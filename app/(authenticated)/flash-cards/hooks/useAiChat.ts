import { useState, useCallback } from 'react';
import { Flashcard, FlashcardData, AiAssistModalTab, ChatMessage } from '@/types/flashcards.types';
import { flashcardQuestionOne, systemContentOne } from "../utils/messageTemplates";
import { ChatCompletionMessageParam } from "ai/prompts";
import { defaultAiModel } from "../utils/chatSettings";
import {openai} from "@/lib/openai/browserClient";

export const useAiChat = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');

    const sendInitialMessage = useCallback(async (
        flashcard: Flashcard,
        firstName: string,
        onMessageReceived: (content: string) => void
    ) => {
        setIsLoading(true);
        setStreamingMessage('');

        const aIFlashcardContext = `
            Topic: ${flashcard.topic || 'Unknown'}
            Lesson: ${flashcard.lesson || 'Unknown'}
            Grade Level: ${flashcard.gradeLevel || 'Unknown'}
            Front: ${flashcard.front || 'Unknown'}
            Back: ${flashcard.back || 'Unknown'}
            Example: ${flashcard.example || 'Unknown'}
            Detailed Explanation: ${flashcard.detailedExplanation || 'Unknown'}
            Audio Explanation: ${flashcard.audioExplanation || 'Unknown'}
        `;

        const initialMessages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemContentOne },
            { role: 'user', content: flashcardQuestionOne(firstName, aIFlashcardContext) },
        ];

        try {
            const stream = await openai.chat.completions.create({
                model: defaultAiModel,
                messages: initialMessages,
                stream: true,
            });

            let aiResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                aiResponse += content;
                setStreamingMessage(aiResponse);
            }

            onMessageReceived(aiResponse);
        } catch (error) {
            console.error('Error fetching AI response:', error);
        } finally {
            setIsLoading(false);
            setStreamingMessage('');
        }
    }, []);

    const sendMessage = useCallback(async (
        message: string,
        flashcardId: string,
        onMessageReceived: (content: string) => void
    ) => {
        setIsLoading(true);
        setStreamingMessage('');

        try {
            const stream = await openai.chat.completions.create({
                model: defaultAiModel,
                messages: [
                    { role: 'system', content: systemContentOne },
                    { role: 'user', content: message }
                ],
                stream: true,
            });

            let aiResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                aiResponse += content;
                setStreamingMessage(aiResponse);
            }

            onMessageReceived(aiResponse);
        } catch (error) {
            console.error('Error fetching AI response:', error);
        } finally {
            setIsLoading(false);
            setStreamingMessage('');
        }
    }, []);

    return {
        isLoading,
        streamingMessage,
        sendInitialMessage,
        sendMessage,
    };
};