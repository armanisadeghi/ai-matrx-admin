'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, RotateCcw, AlertCircle } from 'lucide-react';
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

export type PreferenceTab = 
    | 'display'
    | 'prompts'
    | 'voice'
    | 'textToSpeech'
    | 'assistant'
    | 'email'
    | 'videoConference'
    | 'photoEditing'
    | 'imageGeneration'
    | 'textGeneration'
    | 'coding'
    | 'flashcard'
    | 'playground'
    | 'aiModels'
    | 'messaging';

const PreferencesPage = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const preferences = useSelector((state: RootState) => state.userPreferences as UserPreferencesState);
    const { _meta } = preferences;

    // Get tab from URL parameter or default to 'display'
    const tabParam = searchParams.get('tab') as PreferenceTab | null;
    const validTabs: PreferenceTab[] = [
        'display', 'prompts', 'voice', 'textToSpeech', 'assistant', 
        'email', 'videoConference', 'photoEditing', 'imageGeneration', 
        'textGeneration', 'coding', 'flashcard', 'playground', 'aiModels',
        'messaging'
    ];
    
    const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'display';
    const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);

    // Sync URL with active tab
    useEffect(() => {
        if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    // Update URL when tab changes
    const handleTabChange = (value: string) => {
        const newTab = value as PreferenceTab;
        setActiveTab(newTab);
        
        // Update URL without causing a full page reload
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

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

    const handleSave = () => {
        const { _meta: _, ...preferencesWithoutMeta } = preferences;
        dispatch(savePreferencesToDatabase(preferencesWithoutMeta));
    };

    const handleReset = () => {
        dispatch(resetToLoadedPreferences());
    };

    const handleClearError = () => {
        dispatch(clearError());
    };

    return (
        <Card className="w-full mt-8">
            <CardContent className="p-6">
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

                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="flex-wrap h-auto gap-1">
                        <TabsTrigger value="display">Display</TabsTrigger>
                        <TabsTrigger value="prompts">Prompts</TabsTrigger>
                        <TabsTrigger value="messaging">Messaging</TabsTrigger>
                        <TabsTrigger value="voice">Voice</TabsTrigger>
                        <TabsTrigger value="textToSpeech">TTS</TabsTrigger>
                        <TabsTrigger value="assistant">Assistant</TabsTrigger>
                        <TabsTrigger value="aiModels">AI Models</TabsTrigger>
                        <TabsTrigger value="email">Email</TabsTrigger>
                        <TabsTrigger value="videoConference">Video</TabsTrigger>
                        <TabsTrigger value="photoEditing">Photo</TabsTrigger>
                        <TabsTrigger value="imageGeneration">Images</TabsTrigger>
                        <TabsTrigger value="textGeneration">Text</TabsTrigger>
                        <TabsTrigger value="coding">Coding</TabsTrigger>
                        <TabsTrigger value="flashcard">Flashcards</TabsTrigger>
                        <TabsTrigger value="playground">Playground</TabsTrigger>
                    </TabsList>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TabsContent value={activeTab} className="mt-6">
                                {tabContent[activeTab as keyof typeof tabContent]}
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </Tabs>
            </CardContent>
            
            <CardFooter className="flex justify-between items-center border-t bg-muted/10 px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                            You have unsaved changes
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={!meta.hasUnsavedChanges || meta.isLoading}
                        className="gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!meta.hasUnsavedChanges || meta.isLoading}
                        className="gap-2"
                    >
                        {meta.isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default PreferencesPage;
