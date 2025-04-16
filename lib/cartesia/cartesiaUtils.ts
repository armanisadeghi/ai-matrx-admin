// Function to list all voices
import cartesia from "@/lib/cartesia/client";
import {
    OutputContainer,
    AudioEncoding,
    ModelId,
    VoiceOptions,
    Language,
    VoiceSpeed,
    Emotion,
    Intensity,
    EmotionName,
    EmotionLevel
} from '@/lib/cartesia/cartesia.types';

export const listVoices = async () => {
    try {
        const voices = await cartesia.voices.list();
        return voices;
    } catch (error) {
        console.error("Error listing voices:", error);
        throw error;
    }
};

// Function to get a specific aiAudio by ID
export const getVoice = async (voiceId: string) => {
    try {
        const voice = await cartesia.voices.get(voiceId);
        return voice;
    } catch (error) {
        console.error(`Error getting voice with ID ${voiceId}:`, error);
        throw error;
    }
};

interface CloneVoiceOptions {
    name: string;
    description?: string;
    mode?: "similarity" | "stability";
    language?: Language;
    enhance?: boolean;
    transcript?: string;
}

// Function to clone a aiAudio from a file (takes a File or Blob object as input)
export const cloneVoiceFromFile = async (
    file: File | Blob, 
    options: CloneVoiceOptions
) => {
    try {
        const clonedVoiceEmbedding = await cartesia.voices.clone(
            file as File,
            {
                name: options.name,
                description: options.description,
                mode: options.mode || "similarity",
                language: options.language || Language.EN,
                enhance: options.enhance !== undefined ? options.enhance : false,
                ...(options.transcript && { transcript: options.transcript })
            }
        );
        return clonedVoiceEmbedding;
    } catch (error) {
        console.error("Error cloning aiAudio from file:", error);
        throw error;
    }
};

// Function to mix voices together
export const mixVoices = async (voices: { id: string; weight: number }[]) => {
    try {
        const mixedVoiceEmbedding = await cartesia.voices.mix({ voices });
        return mixedVoiceEmbedding;
    } catch (error) {
        console.error("Error mixing voices:", error);
        throw error;
    }
};


// Function to create a new aiAudio
export const createVoice = async (name: string, description: string, embedding: number[]) => {
    try {
        const newVoice = await cartesia.voices.create({
            name,
            description,
            embedding,
        });
        return newVoice;
    } catch (error) {
        console.error("Error creating aiAudio:", error);
        throw error;
    }
};












