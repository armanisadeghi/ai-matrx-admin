import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DisplayPreferences from './DisplayPreferences';
import VoicePreferences from './VoicePreferences';
import AssistantPreferences from './AssistantPreferences';
import EmailPreferences from './EmailPreferences';
import VideoConferencePreferences from './VideoConferencePreferences';
import PhotoEditingPreferences from './PhotoEditingPreferences';
import ImageGenerationPreferences from './ImageGenerationPreferences';
import TextGenerationPreferences from './TextGenerationPreferences';
import CodingPreferences from './CodingPreferences';

interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    preferencesType:
        | 'display'
        | 'voice'
        | 'assistant'
        | 'email'
        | 'videoConference'
        | 'photoEditing'
        | 'imageGeneration'
        | 'textGeneration'
        | 'coding';
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, preferencesType }) => {
    const PreferencesComponent = {
        display: DisplayPreferences,
        voice: VoicePreferences,
        assistant: AssistantPreferences,
        email: EmailPreferences,
        videoConference: VideoConferencePreferences,
        photoEditing: PhotoEditingPreferences,
        imageGeneration: ImageGenerationPreferences,
        textGeneration: TextGenerationPreferences,
        coding: CodingPreferences,
    }[preferencesType];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{preferencesType.charAt(0).toUpperCase() + preferencesType.slice(1)} Preferences</DialogTitle>
                </DialogHeader>
                <PreferencesComponent />
            </DialogContent>
        </Dialog>
    );
};

export default PreferencesModal;
