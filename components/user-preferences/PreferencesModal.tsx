'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, RotateCcw, AlertCircle, X } from 'lucide-react';
import { RootState, useAppDispatch } from '@/lib/redux';
import {
    UserPreferencesState,
    resetToLoadedPreferences,
    savePreferencesToDatabase,
    clearError
} from '@/lib/redux/slices/userPreferencesSlice';
import DisplayPreferences from './DisplayPreferences';
import PromptsPreferences from './PromptsPreferences';
import VoicePreferences from './VoicePreferences';
import TextToSpeechPreferences from './TextToSpeechPreferences';
import AssistantPreferences from './AssistantPreferences';
import EmailPreferences from './EmailPreferences';
import VideoConferencePreferences from './VideoConferencePreferences';
import PhotoEditingPreferences from './PhotoEditingPreferences';
import ImageGenerationPreferences from './ImageGenerationPreferences';
import TextGenerationPreferences from './TextGenerationPreferences';
import CodingPreferences from './CodingPreferences';
import FlashcardPreferences from './FlashcardPreferences';
import PlaygroundPreferences from './PlaygroundPreferences';
import AiModelsPreferences from './AiModelsPreferences';
import MessagingPreferences from './MessagingPreferences';
import { PreferenceTab } from './PreferencesPage';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: PreferenceTab;
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({ 
    isOpen, 
    onClose, 
    initialTab = 'display' 
}) => {
    const dispatch = useAppDispatch();
    const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);
    const preferences = useSelector((state: RootState) => state.userPreferences as UserPreferencesState);
    const { _meta } = preferences;
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Update active tab when initialTab changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // Safety check for _meta
    const meta = _meta || {
        isLoading: false,
        error: null,
        lastSaved: null,
        hasUnsavedChanges: false,
        loadedPreferences: null,
    };

    const tabContent = {
        display: <DisplayPreferences />,
        prompts: <PromptsPreferences />,
        voice: <VoicePreferences />,
        textToSpeech: <TextToSpeechPreferences />,
        assistant: <AssistantPreferences />,
        email: <EmailPreferences />,
        videoConference: <VideoConferencePreferences />,
        photoEditing: <PhotoEditingPreferences />,
        imageGeneration: <ImageGenerationPreferences />,
        textGeneration: <TextGenerationPreferences />,
        coding: <CodingPreferences />,
        flashcard: <FlashcardPreferences />,
        playground: <PlaygroundPreferences />,
        aiModels: <AiModelsPreferences />,
        messaging: <MessagingPreferences />,
    };

    const tabLabels: Record<PreferenceTab, string> = {
        display: 'Display',
        prompts: 'Prompts',
        voice: 'Voice',
        textToSpeech: 'TTS',
        assistant: 'Assistant',
        email: 'Email',
        videoConference: 'Video',
        photoEditing: 'Photo',
        imageGeneration: 'Images',
        textGeneration: 'Text',
        coding: 'Coding',
        flashcard: 'Flashcards',
        playground: 'Playground',
        messaging: 'Messaging',
        aiModels: 'AI Models',
    };

    const handleSave = async () => {
        const { _meta: _, ...preferencesWithoutMeta } = preferences;
        await dispatch(savePreferencesToDatabase(preferencesWithoutMeta));
    };

    const handleReset = () => {
        dispatch(resetToLoadedPreferences());
    };

    const handleClearError = () => {
        dispatch(clearError());
    };

    const handleClose = () => {
        // Warn if there are unsaved changes
        if (meta.hasUnsavedChanges) {
            const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
            if (!confirmClose) return;
        }
        onClose();
    };

    const content = (
        <div className="flex flex-col h-full">
            {/* Error Alert */}
            {meta.error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex justify-between items-center">
                        <span>Error: {meta.error}</span>
                        <Button 
                            onClick={handleClearError} 
                            size="sm" 
                            variant="ghost"
                            className="text-xs h-auto py-1"
                        >
                            Dismiss
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PreferenceTab)} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="flex-wrap h-auto gap-1 mb-4">
                    {Object.entries(tabLabels).map(([value, label]) => (
                        <TabsTrigger key={value} value={value}>
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                
                <ScrollArea className="flex-1 -mx-1 px-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TabsContent value={activeTab} className="mt-0 pb-4">
                                {tabContent[activeTab]}
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
            </Tabs>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-t bg-muted/10 px-4 py-3 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto">
                    {meta.isLoading && (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Saving changes...</span>
                        </div>
                    )}
                    {meta.lastSaved && !meta.hasUnsavedChanges && !meta.isLoading && (
                        <span className="text-green-600 dark:text-green-400">
                            All changes saved
                        </span>
                    )}
                    {meta.hasUnsavedChanges && !meta.isLoading && (
                        <span className="text-amber-600 dark:text-amber-400">
                            Unsaved changes
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={!meta.hasUnsavedChanges || meta.isLoading}
                        className="gap-2 flex-1 sm:flex-none"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!meta.hasUnsavedChanges || meta.isLoading}
                        className="gap-2 flex-1 sm:flex-none"
                    >
                        {meta.isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    // Use Dialog for both mobile and desktop with responsive styling
    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent 
                className={`
                    flex flex-col p-0
                    ${isMobile 
                        ? 'w-full h-[90vh] max-h-[90vh] rounded-t-xl rounded-b-none fixed bottom-0 top-auto' 
                        : 'max-w-4xl max-h-[85vh]'
                    }
                `}
            >
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
                    <div className="flex justify-between items-center">
                        <DialogTitle>Preferences</DialogTitle>
                        {isMobile && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                className="h-8 w-8 -mr-2"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </DialogHeader>
                <div className="px-4 sm:px-6 flex-1 overflow-hidden">
                    {content}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PreferencesModal;

