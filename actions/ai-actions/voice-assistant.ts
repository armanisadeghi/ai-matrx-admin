'use server';

import Groq from 'groq-sdk';
import { headers } from 'next/headers';

// Check API key availability without logging sensitive values
console.log('Module-level GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✓ Available' : '✗ Missing');
console.log('Module-level CARTESIA_API_KEY:', process.env.CARTESIA_API_KEY ? '✓ Available' : '✗ Missing');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function processMessage(formData: FormData) {
    const input = formData.get('input');
    const message = formData
        .getAll('message')
        .map((item) => {
            try {
                return JSON.parse(item as string);
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    if (typeof input !== 'string' && !(input instanceof File)) {
        throw new Error('Invalid input');
    }

    if (!Array.isArray(message) || message.some((msg) => !isValidMessage(msg))) {
        throw new Error('Invalid message format');
    }

    const transcript = await getTranscript(input);
    if (!transcript) throw new Error('Invalid audio');

    const completion = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
            {
                role: 'system',
                content: `- You are Matrx AI, a friendly and helpful voice assistant.
                - Respond briefly to the user's request, and do not provide unnecessary information.
                - If you don't understand the user's request, ask for clarification.
                - You do not have access to up-to-date information, so you should not provide real-time data.
                - You are not capable of performing actions other than responding to the user.
                - Do not use markdown, emojis, or other formatting in your responses. Respond in a way easily spoken by text-to-speech software.
                - User location is ${await location()}.
                - The current time is ${await time()}.
                - Your large language model is Llama 3, created by Meta, the 8 billion parameter version. It is hosted on Groq, an AI infrastructure company that builds fast inference technology.
                - Your text-to-speech model is Sonic, created and hosted by Cartesia, a company that builds fast and realistic speech synthesis technology.
                - You are built with Next.js and hosted on Vercel.`,
            },
            ...message,
            {
                role: 'user',
                content: transcript,
            },
        ],
    });

    const response = completion.choices[0].message.content;

    const voice = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
            'Cartesia-Version': '2024-06-30',
            'Content-Type': 'application/json',
            'X-API-Key': process.env.CARTESIA_API_KEY!,
        },
        body: JSON.stringify({
            model_id: 'sonic-english',
            transcript: response,
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

    if (!voice.ok) {
        console.error(await voice.text());
        throw new Error('Voice synthesis failed');
    }

    return {
        voiceStream: voice.body,
        transcript,
        response,
    };
}

function isValidMessage(msg: any): boolean {
    return (
        typeof msg === 'object' &&
        typeof msg.content === 'string' &&
        (msg.role === 'user' || msg.role === 'assistant')
    );
}

async function getTranscript(input: string | File): Promise<string | null> {
    if (typeof input === 'string') return input;

    try {
        const { text } = await groq.audio.transcriptions.create({
            file: input,
            model: 'whisper-large-v3',
        });

        return text.trim() || null;
    } catch {
        return null;
    }
}

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

