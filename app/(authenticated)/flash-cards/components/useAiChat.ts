// useAiChat.ts

import { useState } from 'react';
import OpenAI from 'openai';
import { FlashcardData } from '../types';  // Assuming FlashcardData is imported

export const useAiChat = () => {
    const [conversation, setConversation] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Function to send the initial message automatically with the flashcard context
    const sendInitialMessage = async (flashcard: FlashcardData, username: string) => {
        const flashcardData = `
          Topic: ${flashcard.topic || 'N/A'}
          Lesson: ${flashcard.lesson || 'N/A'}
          Grade Level: ${flashcard.gradeLevel || 'N/A'}
          Front: ${flashcard.front}
          Back: ${flashcard.back}
          Example: ${flashcard.example || 'N/A'}
          Detailed Explanation: ${flashcard.detailedExplanation || 'N/A'}
          Audio Explanation: ${flashcard.audioExplanation || 'N/A'}
        `;

        const firstMessage = `The following message is from a user named ${username} and they are currently reviewing this flashcard:\n${flashcardData}\n\nHi. I'm struggling with this topic. Can you please help me by explaining it to me in simple terms that I'll be able to understand. I really want to learn this and totally understand it, but I'm struggling.\n\nPlease use simple terms to explain this to me and break it into small parts, if you can.`;

        const initialMessages = [
            {
                role: 'system',
                content: `
                You are an assistant who specializes in helping middle-school kids with studying, while they use an advanced Flashcard application. 
                When the user has a question, you will be given the exact flashcard they are currently working on, which will include various resources they may or may not have already seen. 
                Always end your response by offering them another specific aspect of the topic to explore or asking which parts are still difficult to understand.
                `,
            },
            {
                role: 'user',
                content: firstMessage,
            },
        ];

        setIsLoading(true);

        try {
            const openai = new OpenAI({
                apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
                dangerouslyAllowBrowser: true,
            });

            let aiResponse = '';
            const stream = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: initialMessages,
                stream: true,
            });

            // Handle response stream, appending only the new chunk to the last message
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                aiResponse += content;
                setConversation((prev) => {
                    const updatedConversation = [...prev];
                    if (updatedConversation.length > 0 && updatedConversation[updatedConversation.length - 1].role === 'assistant') {
                        updatedConversation[updatedConversation.length - 1].content += content;  // Append to the last message
                    } else {
                        updatedConversation.push({ role: 'assistant', content: aiResponse });
                    }
                    return updatedConversation;
                });
            }
        } catch (error) {
            console.error('Error fetching AI response:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to handle sending user messages in the chat after the first one
    const sendMessage = async (userMessage: string) => {
        const userMsg = { role: 'user', content: userMessage };
        setConversation((prev) => [...prev, userMsg]);

        setIsLoading(true);

        try {
            const openai = new OpenAI({
                apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
                dangerouslyAllowBrowser: true,
            });

            let aiResponse = '';
            const stream = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [...conversation, userMsg],
                stream: true,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                aiResponse += content;
                setConversation((prev) => {
                    const updatedConversation = [...prev];
                    if (updatedConversation.length > 0 && updatedConversation[updatedConversation.length - 1].role === 'assistant') {
                        updatedConversation[updatedConversation.length - 1].content += content;
                    } else {
                        updatedConversation.push({ role: 'assistant', content: aiResponse });
                    }
                    return updatedConversation;
                });
            }
        } catch (error) {
            console.error('Error fetching AI response:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        conversation,
        isLoading,
        sendInitialMessage,
        sendMessage,
    };
};
