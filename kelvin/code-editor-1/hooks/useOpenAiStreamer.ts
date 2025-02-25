import { useEffect } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { AiParamsType } from '@/types';
import { streamTriggerAtomFamily, streamStatusAtom, chatMessagesAtomFamily, assistantTextStreamAtom } from '@/state/aiAtoms/aiChatAtoms';
import { OpenAiStream } from '@/app/api/openai/route';


export interface MatrixStreamHookProps {
    chatId: string;
    model?: string;
    options?: AiParamsType;
    index?: number;
}

function useOpenAiStreamer({chatId, model = 'gpt-4o', options, index = 0}: MatrixStreamHookProps) {
    const hookId = 'OpenAiStream';
    const [streamTrigger, setStreamTrigger] = useRecoilState(streamTriggerAtomFamily({hookId, index}));
    const setStreamStatus = useSetRecoilState(streamStatusAtom);
    const [messages, setMessages] = useRecoilState(chatMessagesAtomFamily(chatId));
    const setStreamMessage = useSetRecoilState(assistantTextStreamAtom);

    useEffect(() => {
        if (!streamTrigger) return;
        setStreamTrigger(false);

        const openAiArray = messages.map(message => ({
            role: message.role as 'system' | 'user' | 'assistant',
            content: message.text,
        }));

        let buffer = '';
        let count = 0;

        const flushBuffer = () => {
            if (buffer.length > 0) {
                setStreamMessage((prevStreamMessage) => prevStreamMessage + buffer);
                console.log(count, '-', buffer);
                buffer = '';
            }
        };

        let fullText = '';
        const callback = (chunk: string) => {
            fullText += chunk;
            buffer += chunk;
            count++;

            if (count % 10 === 0) {
                flushBuffer();
            }
        };

        const streamOptions: { model: string; options?: AiParamsType } = {
            model, ...(options ? {options} : {})
        };

        setStreamStatus('streaming');

        OpenAiStream(openAiArray, callback, streamOptions.model, streamOptions.options).then(() => {
            // Flush any remaining buffer
            flushBuffer();

            // Update the messages state with the full text from the stream
            setMessages((prevMessages) => {
                const updatedMessages = prevMessages.map((message, i) => {
                    if (i === prevMessages.length - 1) {
                        return {...message, text: fullText};
                    }
                    return message;
                });
                return updatedMessages;
            });

            setStreamStatus('success');

        }).catch((error) => {
            console.error(error);
            setStreamStatus('error');
        }).finally(() => {
            setStreamMessage('');
            setStreamTrigger(false);
        });

    }, [streamTrigger, model, options, setStreamTrigger, hookId, index, messages, setMessages, setStreamMessage]);

    return null;
}

export default useOpenAiStreamer;
