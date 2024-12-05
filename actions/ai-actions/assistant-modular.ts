'use server';

import Groq from 'groq-sdk';
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {headers} from "next/headers";
import {matrxVoiceAssistant, debateCoach, candiceAi} from './constants';

import {
    AiCallParams,
    AiResponse,
    ApiName, PreDefinedMessages,
    ProcessAiRequestParams,
    ServersideMessage,
    Replacement,
} from "@/types/voice/voiceAssistantTypes";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});



/**
 * Main server action
 */

export async function processAiRequest(
    params: ProcessAiRequestParams
): Promise<AiResponse> {
    const {
        assistantType,
        replacements,
        input,
        previousMessages = [],
        apiName = 'groq',
        inputType = 'text',
        responseType = 'text',
        params: aiCallParams = {},
    } = params;

    if (!['groq', 'openai', 'anthropic'].includes(apiName)) {
        throw new Error('Invalid or missing API name');
    }

    if (!['text', 'audio'].includes(inputType)) {
        throw new Error('Invalid input type. Must be "text" or "audio".');
    }

    if (!['text', 'audio', 'streamingText'].includes(responseType)) {
        throw new Error('Invalid response type. Must be "text", "audio", or "streamingText".');
    }

    // Step 1: Handle input
    let transcript: string | undefined;

    if (inputType === 'audio') {
        transcript = await getTranscript(input);
        if (!transcript) {
            throw new Error('Failed to process audio input into transcript.');
        }
    } else if (typeof input === 'string') {
        transcript = input;
    } else {
        throw new Error('Invalid input type provided.');
    }

    // Step 2: Prepare messages
    const initialMessages = assistantType
        ? await getInitialMessages(assistantType, replacements)
        : [];
    const messages = buildMessages(transcript, previousMessages, initialMessages);

    // Step 3: Call AI with additional params
    const aiResponse = await callAI(apiName, messages, aiCallParams);

    // Step 4: Handle response type
    if (responseType === 'audio') {
        // Sanitize the AI response for audio conversion
        const sanitizedResponse = removeNonReadableCharacters(aiResponse);

        const voiceStream = await generateVoice(sanitizedResponse);
        return {
            transcript,
            responseType: 'audio',
            response: aiResponse,
            voiceStream,
        };
    }

    if (responseType === 'streamingText') {
        return {
            transcript,
            responseType: 'streamingText',
            response: aiResponse, // Use regular text for now
        };
    }

    // Default to text response
    return {
        transcript,
        responseType: 'text',
        response: aiResponse,
    };
}

function removeNonReadableCharacters(input: string): string {
    // This regex removes emojis, markdown, and non-readable symbols
    return input
        .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // Emojis
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Miscellaneous symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[`*_~\[\]()<>#+=\-]/g, '')    // Markdown-like characters
        .replace(/[^\w\s.,?!]/g, '');           // Other non-readable characters
}



/**
 * Call AI
 * Modifies the callAI function to support additional parameters.
 */
async function callAI(apiName: ApiName, messages: ServersideMessage[], aiCallParams: AiCallParams): Promise<string> {
    if (apiName === 'groq') {
        return await callGroqAPI(messages, aiCallParams);
    } else if (apiName === 'openai') {
        return await callOpenAI(messages, aiCallParams);
    } else if (apiName === 'anthropic') {
        return await callAnthropic(messages, aiCallParams);
    } else {
        throw new Error('Unsupported API name');
    }
}

/**
 * Call Groq API
 */
async function callGroqAPI(messages: ServersideMessage[], aiCallParams: AiCallParams): Promise<string> {
    const {model = 'llama3-8b-8192', ...restParams} = aiCallParams;
    const completion = await groq.chat.completions.create({
        model,
        messages,
        ...restParams,
    });
    return completion.choices[0].message.content;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages: ServersideMessage[], aiCallParams: AiCallParams): Promise<string> {
    const {model = 'gpt-40-mini', ...restParams} = aiCallParams;
    const completion = await openai.chat.completions.create({
        model,
        messages,
        ...restParams,
    });
    return completion.choices[0].message.content;
}

/**
 * Call Anthropic API
 */
async function callAnthropic(messages: ServersideMessage[], aiCallParams: AiCallParams): Promise<string> {
    const {model = 'claude-3-5-sonnet-20241022', temperature = 0, maxTokens = 1000, ...restParams} = aiCallParams;

    const systemMessage = messages.find((msg) => msg.role === 'system')?.content || '';
    const userAndAssistantMessages = messages.filter(isUserOrAssistant);

    if (!userAndAssistantMessages.length) {
        throw new Error('Anthropic API requires at least one user message.');
    }

    const completion = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage,
        messages: userAndAssistantMessages.map(({role, content}) => ({
            role, // Only 'user' or 'assistant' roles are allowed
            content,
        })),
        ...restParams, // Spread additional params
    });

    return completion.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
}

/**
 * Helper function to filter user and assistant messages for Anthropic API.
 */
function isUserOrAssistant(message: ServersideMessage): message is ServersideMessage & { role: 'user' | 'assistant' } {
    return message.role === 'user' || message.role === 'assistant';
}


/**
 * Generate Voice
 * Converts AI response to speech using TTS.
 */
async function generateVoice(text: string): Promise<ReadableStream> {
    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
            'Cartesia-Version': '2024-06-30',
            'Content-Type': 'application/json',
            'X-API-Key': process.env.CARTESIA_API_KEY!,
        },
        body: JSON.stringify({
            model_id: 'sonic-english',
            transcript: text,
            voice: {
                mode: 'id',
                id: '79a125e8-cd45-4c13-8a67-188112f4dd22',
            },
            output_format: {
                container: 'raw',
                encoding: 'pcm_f32le',
                sample_rate: 24000,
            },
        }),
    });

    if (!response.ok) {
        console.error(await response.text());
        throw new Error('Voice synthesis failed');
    }

    return response.body;
}

/**
 * Get Transcript
 * Handles transcription of audio or plain text input.
 */
async function getTranscript(input: string | File): Promise<string | null> {
    if (typeof input === "string") return input;

    try {
        const {text} = await groq.audio.transcriptions.create({
            file: input,
            model: "whisper-large-v3-turbo",
            language: "en"
        });

        return text.trim() || null;
    } catch (error) {
        console.error('Transcription error:', error);
        return null;
    }
}


/**
 * Get Initial Messages
 * Generates the initial list of messages for the AI model.
 */
async function getInitialMessages(
    assistantType?: keyof typeof systemMessageOptions,
    replacements?: { id: string; value: string }[],
    transcript?: string
): Promise<ServersideMessage[]> {
    // Default to a generic system message if no assistantType is provided
    const systemMessage: ServersideMessage = {
        role: 'system',
        content: assistantType
                 ? systemMessageOptions[assistantType]
                 : 'You are a helpful assistant.',
    };

    const initialMessages: ServersideMessage[] = assistantType
                                       ? getMessageSet(assistantType, replacements)
                                       : [systemMessage];

    if (transcript) {
        initialMessages.push({role: 'user', content: transcript});
    }

    return initialMessages;
}


/**
 * Build Subsequent Messages
 * Dynamically prepares the list of messages for the AI model based on previous messages.
 */
function buildMessages(
    transcript: string | undefined,
    previousMessages: ServersideMessage[],
    initialMessages: ServersideMessage[] = []
): ServersideMessage[] {
    const userMessage: ServersideMessage | null = transcript
                                        ? { role: 'user', content: transcript }
                                        : null;

    return [
        ...initialMessages,
        ...previousMessages,
        ...(userMessage ? [userMessage] : []),
    ];
}


function getMessageSet(
    assistantType: keyof typeof systemMessageOptions,
    replacements?: { id: string; value: string }[]
): ServersideMessage[] {
    const updatedMessages = replacePlaceholders(preDefinedInitialMessages, replacements);
    return updatedMessages[assistantType] || [];
}


const systemMessageOptions = {
    debateCoach: debateCoach,
    voiceAssistant: matrxVoiceAssistant,
    mathTutor: `- You are a math tutor brought in to help students with their math homework.`,
    historyTeacher: `- You are a history teacher brought in to help students with their history project.`,
    scienceTeacher: `- You are a science teacher brought in to help students with their science project.`,
    englishTeacher: `- You are an English teacher brought in to help students with their English project.`,
    reactDevelopmentExpert: `- You are a React development expert brought in to help students with their React project.`,
    pythonDevelopmentExpert: `- You are a Python development expert brought in to help students with their Python project.`,
    typeScriptDevelopmentExpert: `- You are a TypeScript development expert brought in to help students with their TypeScript project.`,
    businessCoach: `- You are a business coach brought in to help students with their business project.`,
    hrExpert: `- You are an HR expert brought in to help students with their HR project.`,
    candy: candiceAi,
};


const preDefinedInitialMessages: PreDefinedMessages = {
    debateCoach: [
        {
            role: 'system',
            content: systemMessageOptions.debateCoach,
        },
        {
            role: 'assistant',
            content: 'Hello, I am here to help.',
        },
        {
            role: 'user',
            content: 'Hi. My name is {c33aea28-8b61-4256-9c84-9483e93662d2}! and I am in {5fc6bbee-3674-4706-aff2-233c9d71ec73}! grade. I have a big debate coming up and I really need help.',
        },
    ],
    voiceAssistant: [
        {
            role: 'system',
            content: matrxVoiceAssistant,
        },
    ],
    mathTutor: [
        {
            role: 'system',
            content: systemMessageOptions.mathTutor,
        },
    ],
    historyTeacher: [
        {
            role: 'system',
            content: systemMessageOptions.historyTeacher,
        },
    ],
    scienceTeacher: [
        {
            role: 'system',
            content: systemMessageOptions.scienceTeacher,
        },
    ],
    englishTeacher: [
        {
            role: 'system',
            content: systemMessageOptions.englishTeacher,
        },
    ],
    reactDevelopmentExpert: [
        {
            role: 'system',
            content: systemMessageOptions.reactDevelopmentExpert,
        },
    ],
    pythonDevelopmentExpert: [
        {
            role: 'system',
            content: systemMessageOptions.pythonDevelopmentExpert,
        },
    ],
    typeScriptDevelopmentExpert: [
        {
            role: 'system',
            content: systemMessageOptions.typeScriptDevelopmentExpert,
        },
    ],
    businessCoach: [
        {
            role: 'system',
            content: systemMessageOptions.businessCoach,
        },
    ],
    hrExpert: [
        {
            role: 'system',
            content: systemMessageOptions.hrExpert,
        },
    ],
    candy: [
        {
            role: 'system',
            content: systemMessageOptions.candy,
        },
    ],
};

const replacePlaceholders = (
    templateMessages: PreDefinedMessages,
    replacements: Replacement[] = []
): PreDefinedMessages => {
    const replacementsMap = replacements.reduce<Record<string, string>>((map, { id, value }) => {
        map[id] = value;
        return map;
    }, {});

    const clonedMessages: PreDefinedMessages = JSON.parse(JSON.stringify(templateMessages));

    const replaceInContent = (content: string): string => {
        return content.replace(/{(.*?)}/g, (match, uuid) => {
            // Replace with the value if found, or remove the placeholder
            return replacementsMap[uuid] || '';
        });
    };

    Object.keys(clonedMessages).forEach((key) => {
        clonedMessages[key] = clonedMessages[key].map((message): ServersideMessage => {
            if (message.content) {
                return {
                    ...message,
                    content: replaceInContent(message.content),
                };
            }
            return message;
        });
    });

    return clonedMessages;
};

async function location() {
    const headersList = await headers();

    const country = headersList.get("x-vercel-ip-country");
    const region = headersList.get("x-vercel-ip-country-region");
    const city = headersList.get("x-vercel-ip-city");

    if (!country || !region || !city) return "unknown";

    return `${city}, ${region}, ${country}`;
}

async function time() {
    const headersList = await headers();
    return new Date().toLocaleString("en-US", {
        timeZone: headersList.get("x-vercel-ip-timezone") || undefined,
    });
}



