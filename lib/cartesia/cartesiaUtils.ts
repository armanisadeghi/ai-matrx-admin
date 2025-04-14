// Function to list all voices
import cartesia from "@/lib/cartesia/client";

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

// Function to clone a aiAudio from a file (takes a File or Blob object as input)
export const cloneVoiceFromFile = async (file: File | Blob) => {
    try {
        const clonedVoiceEmbedding = await cartesia.voices.clone({
            mode: "clip",
            clip: file,
        });
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












