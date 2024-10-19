// hooks/ai/useOpenAIChat.ts

import {useCallback, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {v4 as uuidv4} from 'uuid';
import OpenAI from 'openai';
import {openai, defaultOpenAiModel, defaultTemperature, default4oMiniMaxTokens,} from "@/lib/ai/openAiBrowserClient";
import {RootState} from '@/lib/redux/store';
import {AIProvider, ContentPart, Message} from "@/lib/ai/aiChat.types";
import {addMessage, completeChat, createChat, setError} from "@/lib/redux/slices/aiChatSlice";

type ChatCompletionCreateParams = OpenAI.ChatCompletionCreateParams;
type ChatCompletionChunk = OpenAI.ChatCompletionChunk;

interface UseOpenAIChatOptions extends Omit<ChatCompletionCreateParams, 'messages'> {
    onChunk?: (chunk: string) => void;
    userId: string;
    module: string;
    job: string;
}

export const useOpenAIChat = () => {
    const dispatch = useDispatch();
    const chats = useSelector((state: RootState) => state.aiChat.chats);
    const activeRequests = useRef<Set<string>>(new Set());

    const sendMessage = useCallback(async (content: ContentPart[], options: UseOpenAIChatOptions) => {
        const {
            userId,
            module,
            job,
            model = defaultOpenAiModel,
            temperature = defaultTemperature,
            max_tokens = default4oMiniMaxTokens,
            stream = true,
            onChunk,
            ...restOptions
        } = options;

        const lockKey = `${module}:${job}`;
        if (activeRequests.current.has(lockKey)) {
            console.warn('Request already in progress for this module and job');
            return null;
        }

        activeRequests.current.add(lockKey);

        let chatId = Object.values(chats).find(
            chat => chat.userId === userId && chat.module === module && chat.job === job
        )?.id;

        if (!chatId) {
            chatId = uuidv4();
            dispatch(createChat({
                userId,
                provider: 'openai' as AIProvider,
                module,
                job,
            }));
        }

        const newMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content,
            isVisibleToUser: true,
            createdAt: new Date().toISOString(),
        };

        dispatch(addMessage({
            chatId,
            role: newMessage.role,
            content: newMessage.content,
            isVisibleToUser: newMessage.isVisibleToUser,
        }));

        try {
            const params: ChatCompletionCreateParams = {
                messages: chats[chatId].messages.map(msg => {
                    const content = msg.content.map(part =>
                        part.type === 'text' ? part.content as string : JSON.stringify(part.content)
                    ).join('\n');

                    switch (msg.role) {
                        case 'function':
                            return {
                                role: 'function',
                                name: 'default_function',
                                content
                            } as OpenAI.ChatCompletionFunctionMessageParam;
                        case 'system':
                            return {role: 'system', content} as OpenAI.ChatCompletionSystemMessageParam;
                        case 'user':
                            return {role: 'user', content} as OpenAI.ChatCompletionUserMessageParam;
                        case 'assistant':
                            return {role: 'assistant', content} as OpenAI.ChatCompletionAssistantMessageParam;
                        case 'tool':
                            return {
                                role: 'tool',
                                content,
                                tool_call_id: msg.id || 'default_tool_call_id'
                            } as OpenAI.ChatCompletionToolMessageParam;
                        default:
                            throw new Error(`Unsupported message role: ${msg.role}`);
                    }
                }),
                model,
                temperature,
                max_tokens,
                stream,
                ...restOptions
            };

            const response = await openai.chat.completions.create(params);

            if (stream) {
                let fullResponse = '';
                for await (const chunk of response as AsyncIterable<ChatCompletionChunk>) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    fullResponse += content;
                    if (onChunk) onChunk(content);
                }
                dispatch(completeChat({chatId, fullResponse}));
                dispatch(addMessage({
                    chatId,
                    role: 'assistant',
                    content: [{type: 'text', content: fullResponse}],
                    isVisibleToUser: true,
                }));
            } else {
                const content = (response as OpenAI.ChatCompletion).choices[0]?.message?.content || '';
                dispatch(completeChat({chatId, fullResponse: content}));
                dispatch(addMessage({
                    chatId,
                    role: 'assistant',
                    content: [{type: 'text', content}],
                    isVisibleToUser: true,
                }));
            }

            return chatId;
        } catch (error) {
            if (error instanceof Error) {
                dispatch(setError({chatId, error: error.message}));
            } else {
                dispatch(setError({chatId, error: 'An unknown error occurred'}));
            }
            return null;
        } finally {
            activeRequests.current.delete(lockKey);
        }
    }, [dispatch, chats]);

    return {sendMessage};
};
