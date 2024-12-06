// constants/voice-options.ts

import { availableVoices } from '@/lib/cartesia/voices';
const DEFAULT_IMAGE = '/assistants/matrx-ai-avatar-male.jpeg';

export interface VoiceOption {
    id: string;
    name: string;
    description: string;
    imagePath: string;  // Changed from 'image' to match assistant pattern
}

export const voiceOptions: VoiceOption[] = availableVoices.map(voice => ({
    id: voice.id,
    name: voice.name,
    description: voice.description,
    imagePath: voice.image || DEFAULT_IMAGE
}));
