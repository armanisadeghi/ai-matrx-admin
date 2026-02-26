'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Monitor, MessageSquare, Mic, Volume2, Bot, Mail, Video, Image as ImageIcon, Type, Code, BookOpen, Gamepad2, Cpu, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Save, RotateCcw, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RootState, useAppDispatch } from '@/lib/redux';
import {
    UserPreferencesState,
    savePreferencesToDatabase,
    resetToLoadedPreferences,
    clearError,
} from '@/lib/redux/slices/userPreferencesSlice';
import { useIsMobile } from '@/hooks/use-mobile';
import { SettingsPageHeader } from './SettingsPageHeader';
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
    | 'display' | 'prompts' | 'messaging' | 'voice' | 'textToSpeech'
    | 'assistant' | 'email' | 'videoConference' | 'photoEditing'
    | 'imageGeneration' | 'textGeneration' | 'coding' | 'flashcard'
    | 'playground' | 'aiModels';

const validTabs: PreferenceTab[] = [
    'display', 'prompts', 'messaging', 'voice', 'textToSpeech', 'assistant',
    'email', 'videoConference', 'photoEditing', 'imageGeneration',
    'textGeneration', 'coding', 'flashcard', 'playground', 'aiModels',
];

// iOS Settings-style category list for mobile
const tabCategories: { value: PreferenceTab; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'display',        label: 'Display',          icon: <Monitor className="h-4 w-4" />,      description: 'Theme, dark mode, layout' },
    { value: 'prompts',        label: 'Prompts',          icon: <Zap className="h-4 w-4" />,           description: 'Default model, temperature' },
    { value: 'messaging',      label: 'Messaging',        icon: <MessageSquare className="h-4 w-4" />, description: 'Chat & message settings' },
    { value: 'voice',          label: 'Voice',            icon: <Mic className="h-4 w-4" />,           description: 'Voice input & language' },
    { value: 'textToSpeech',   label: 'TTS',              icon: <Volume2 className="h-4 w-4" />,       description: 'Text-to-speech settings' },
    { value: 'assistant',      label: 'Assistant',        icon: <Bot className="h-4 w-4" />,           description: 'AI assistant behaviour' },
    { value: 'aiModels',       label: 'AI Models',        icon: <Cpu className="h-4 w-4" />,           description: 'Active models & providers' },
    { value: 'email',          label: 'Email',            icon: <Mail className="h-4 w-4" />,          description: 'Email integration settings' },
    { value: 'videoConference',label: 'Video',            icon: <Video className="h-4 w-4" />,         description: 'Video conferencing preferences' },
    { value: 'photoEditing',   label: 'Photo',            icon: <ImageIcon className="h-4 w-4" />,     description: 'Photo editing tools' },
    { value: 'imageGeneration',label: 'Images',           icon: <ImageIcon className="h-4 w-4" />,     description: 'Image generation settings' },
    { value: 'textGeneration', label: 'Text',             icon: <Type className="h-4 w-4" />,          description: 'Text generation settings' },
    { value: 'coding',         label: 'Coding',           icon: <Code className="h-4 w-4" />,          description: 'Code editor preferences' },
    { value: 'flashcard',      label: 'Flashcards',       icon: <BookOpen className="h-4 w-4" />,      description: 'Flashcard study settings' },
    { value: 'playground',     label: 'Playground',       icon: <Gamepad2 className="h-4 w-4" />,      description: 'Playground defaults' },
];

const tabContent: Record<PreferenceTab, React.ReactNode> = {
    display:         <DisplayPreferences />,
    prompts:         <PromptsPreferences />,
    voice:           <VoicePreferences />,
    textToSpeech:    <TextToSpeechPreferences />,
    assistant:       <AssistantPreferences />,
    email:           <EmailPreferences />,
    videoConference: <VideoConferencePreferences />,
    photoEditing:    <PhotoEditingPreferences />,
    imageGeneration: <ImageGenerationPreferences />,
    textGeneration:  <TextGenerationPreferences />,
    coding:          <CodingPreferences />,
    flashcard:       <FlashcardPreferences />,
    playground:      <PlaygroundPreferences />,
    aiModels:        <AiModelsPreferences />,
    messaging:       <MessagingPreferences />,
};

const PreferencesPage = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();
    const preferences = useSelector((state: RootState) => state.userPreferences as UserPreferencesState);
    const { _meta } = preferences;

    const tabParam = searchParams.get('tab') as PreferenceTab | null;
    const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'display';
    const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);

    useEffect(() => {
        if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (value: string) => {
        const newTab = value as PreferenceTab;
        setActiveTab(newTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const meta = _meta || { isLoading: false, error: null, lastSaved: null, hasUnsavedChanges: false };

    const handleSave = () => {
        const { _meta: _, ...preferencesWithoutMeta } = preferences;
        dispatch(savePreferencesToDatabase(preferencesWithoutMeta));
    };
    const handleReset = () => dispatch(resetToLoadedPreferences());
    const handleClearError = () => dispatch(clearError());

    const activeCategory = tabCategories.find(c => c.value === activeTab);
    const isMobileWithTab = isMobile && tabParam && validTabs.includes(tabParam);

    // ─── Mobile: category detail view ───────────────────────────────────────
    if (isMobile && isMobileWithTab) {
        return (
            <>
                <SettingsPageHeader
                    title={activeCategory?.label || 'Settings'}
                    showBack
                />
                {meta.error && (
                    <Alert variant="destructive" className="mx-3 mt-2 mb-0">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex justify-between items-center text-xs">
                            <span>{meta.error}</span>
                            <Button onClick={handleClearError} size="sm" variant="ghost" className="text-xs h-6 px-1">×</Button>
                        </AlertDescription>
                    </Alert>
                )}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.18 }}
                        className="px-0"
                    >
                        {tabContent[activeTab]}
                    </motion.div>
                </AnimatePresence>

                {/* Sticky footer Save/Reset */}
                <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t bg-background/90 backdrop-blur-sm px-4 py-3">
                    <div className="text-xs text-muted-foreground">
                        {meta.isLoading && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving...</span>}
                        {meta.hasUnsavedChanges && !meta.isLoading && <span className="text-amber-500">Unsaved changes</span>}
                        {meta.lastSaved && !meta.hasUnsavedChanges && !meta.isLoading && (
                            <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleReset} disabled={!meta.hasUnsavedChanges || meta.isLoading} className="h-8 text-xs">
                            <RotateCcw className="h-3 w-3 mr-1" />Reset
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={!meta.hasUnsavedChanges || meta.isLoading} className="h-8 text-xs">
                            {meta.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                            Save
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    // ─── Mobile: category list ───────────────────────────────────────────────
    if (isMobile) {
        return (
            <>
                <SettingsPageHeader title="Preferences" />
                {meta.error && (
                    <Alert variant="destructive" className="mx-3 mt-2 mb-0">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex justify-between items-center text-xs">
                            <span>{meta.error}</span>
                            <Button onClick={handleClearError} size="sm" variant="ghost" className="text-xs h-6 px-1">×</Button>
                        </AlertDescription>
                    </Alert>
                )}
                <div className="pb-safe">
                    {tabCategories.map((cat, index) => (
                        <button
                            key={cat.value}
                            onClick={() => handleTabChange(cat.value)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/40 last:border-b-0"
                        >
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                                {cat.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium leading-tight">{cat.label}</div>
                                <div className="text-xs text-muted-foreground truncate">{cat.description}</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                    ))}
                </div>
            </>
        );
    }

    // ─── Desktop: flat tab UI ────────────────────────────────────────────────
    return (
        <div className="p-6 max-w-4xl">
            <SettingsPageHeader title="Preferences" />
            {meta.error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex justify-between items-center">
                        <span>Error: {meta.error}</span>
                        <Button onClick={handleClearError} size="sm" variant="ghost" className="text-xs h-auto py-1">Dismiss</Button>
                    </AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="flex-wrap h-auto gap-1 mb-4">
                    {tabCategories.map(cat => (
                        <TabsTrigger key={cat.value} value={cat.value}>
                            {cat.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        <TabsContent value={activeTab} className="mt-0">
                            {tabContent[activeTab as keyof typeof tabContent]}
                        </TabsContent>
                    </motion.div>
                </AnimatePresence>
            </Tabs>

            {/* Desktop footer */}
            <div className="flex items-center justify-between gap-3 border-t mt-6 pt-4">
                <div className="text-sm text-muted-foreground">
                    {meta.isLoading && <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>}
                    {meta.hasUnsavedChanges && !meta.isLoading && <span className="text-amber-500">Unsaved changes</span>}
                    {meta.lastSaved && !meta.hasUnsavedChanges && !meta.isLoading && (
                        <span className="text-green-600 flex items-center gap-1.5"><Check className="h-4 w-4" />All saved</span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} disabled={!meta.hasUnsavedChanges || meta.isLoading} className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />Reset
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!meta.hasUnsavedChanges || meta.isLoading} className="gap-1.5">
                        {meta.isLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5" />Save Changes</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PreferencesPage;
