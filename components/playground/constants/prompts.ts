import { AddMessagePayload } from "../hooks/messages/useAddMessage";

export const defaultSystemMessage: AddMessagePayload = {
    role: 'system',
    type: 'text',
    content:
        'You are very a helpful assistant. You will read all instructions carefully and identify the users exact request. When you are unsure of the exact needs of the user, ask relevant questions to clarify the request.',
    order: 0,
};
export const defaultUserMessage: AddMessagePayload = {
    role: 'user',
    type: 'text',
    content: 'Replace this text with your custom message. Use "Chips" to include Data Brokers for intelligent, dynamic, automated recipes.',
    order: 1,
};

export const defaultAssistantMessage: AddMessagePayload = {
    role: 'assistant',
    type: 'text',
    content: 'Use this as a message that will show the agent exactly how to respond for future messages. NOTE: It is best to generate this based on actual responses from this model.',
    order: 2,
};
