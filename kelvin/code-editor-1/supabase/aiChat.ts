import { AiParamsType, MessageType } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { createChatStartEntry } from "@/utils/supabase/chatDb";
import supabase from "@/utils/supabase/client";
import { OpenAiStream } from "@/app/api/openai/route";

export interface INewChat {
    chatId: string;
    chatTitle: string;
    createdAt: string;
    lastEdited: string;
    matrixId: string;
    metadata: any;
    messages: MessageType[];
}

export const createChatStart = async (
    userMessage: string,
    userId: string,
): Promise<{
    chatId: string;
    chatTitle: string;
    createdAt: string;
    lastEdited: string;
    matrixId: string;
    metadata: any;
    messages: MessageType[];
}> => {
    const chatId = uuidv4();

    const systemMessageEntry: MessageType = {
        chatId: chatId,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        index: 0,
        role: "system",
        text: "You are a helpful assistant",
    };

    const userMessageEntry: MessageType = {
        chatId: chatId,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        index: 1,
        role: "user",
        text: userMessage,
    };

    const assistantEntry = {
        chatId: chatId,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        index: 2,
        role: "assistant",
        text: "",
    };

    const initialMessages: MessageType[] = [systemMessageEntry, userMessageEntry, assistantEntry];
    const chatTitle = userMessage.length > 35 ? userMessage.substring(0, 35) + "..." : userMessage;

    const chatStartObject = {
        chatId: chatId,
        chatTitle: chatTitle,
        createdAt: new Date().toISOString(),
        lastEdited: new Date().toISOString(),
        matrixId: userId,
        metadata: {},
        messages: initialMessages,
    };

    // console.log("chatStarter: Chat Start Object:", chatStartObject);

    await createChatStartEntry(chatStartObject).catch((error) => {
        console.error("Failed to add custom message:", error);
    });

    return chatStartObject;
};

export const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase.rpc("fetch_messages", { matrix_chat_id: chatId });

    if (error) {
        return [];
    }

    return {
        data,
        error,
    };
};

export interface SendMessageParams {
    chatId: string;
    model?: string;
    options?: AiParamsType;
    index?: number;
    messagesEntry: any;
}

export const sendAiMessage = async ({ model = "gpt-4o", options, messagesEntry }: SendMessageParams) => {
    try {
        const streamTrigger = true;
        if (!streamTrigger) return;

        const openAiArray = messagesEntry.map((message) => ({
            role: message.role as "system" | "user" | "assistant",
            content: message.content || message.text,
        }));

        let buffer = "";
        let count = 0;

        const flushBuffer = () => {
            if (buffer.length > 0) {
                // setStreamMessage((prevStreamMessage) => prevStreamMessage + buffer);
                console.log(count, "-", buffer);
                buffer = "";
            }
        };

        let fullText = "";

        const callback = (chunk: string) => {
            fullText += chunk;
            buffer += chunk;
            count++;

            if (count % 10 === 0) {
                flushBuffer();
            }
        };

        const streamOptions: { model: string; options?: AiParamsType } = {
            model,
            ...(options ? { options } : {}),
        };

        console.log("streaming");

        await OpenAiStream(openAiArray, callback, streamOptions.model, streamOptions.options);

        console.log("success");

        // Flush any remaining buffer
        flushBuffer();

        console.log("streaming ended");

        return {
            data: fullText,
        };
    } catch (e) {
        console.log("streaming ended");
        console.log(e);
    }
};
