'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import DisplayPreferences from './DisplayPreferences';
import VoicePreferences from './VoicePreferences';
import AssistantPreferences from './AssistantPreferences';
import EmailPreferences from './EmailPreferences';
import VideoConferencePreferences from './VideoConferencePreferences';
import PhotoEditingPreferences from './PhotoEditingPreferences';
import ImageGenerationPreferences from './ImageGenerationPreferences';
import TextGenerationPreferences from './TextGenerationPreferences';
import CodingPreferences from './CodingPreferences';

const PreferencesPage = () => {
    const [activeTab, setActiveTab] = useState('display');

    const tabContent = {
        display: <DisplayPreferences />,
        voice: <VoicePreferences />,
        assistant: <AssistantPreferences />,
        email: <EmailPreferences />,
        videoConference: <VideoConferencePreferences />,
        photoEditing: <PhotoEditingPreferences />,
        imageGeneration: <ImageGenerationPreferences />,
        textGeneration: <TextGenerationPreferences />,
        coding: <CodingPreferences />,
    };

    return (
        <Card className="w-full max-w-4xl mx-auto mt-8">
            <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-9">
                        <TabsTrigger value="display">Display</TabsTrigger>
                        <TabsTrigger value="voice">Voice</TabsTrigger>
                        <TabsTrigger value="assistant">Assistant</TabsTrigger>
                        <TabsTrigger value="email">Email</TabsTrigger>
                        <TabsTrigger value="videoConference">Video Conf</TabsTrigger>
                        <TabsTrigger value="photoEditing">Photo Edit</TabsTrigger>
                        <TabsTrigger value="imageGeneration">Image Gen</TabsTrigger>
                        <TabsTrigger value="textGeneration">Text Gen</TabsTrigger>
                        <TabsTrigger value="coding">Coding</TabsTrigger>
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
        </Card>
    );
};

export default PreferencesPage;
