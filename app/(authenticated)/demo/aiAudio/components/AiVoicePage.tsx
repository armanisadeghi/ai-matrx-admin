'use client';

import React, { useEffect } from 'react';
import { aiAudioInitialState } from '../aiVoiceModuleConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VoicesList from './VoicesList';
import VoiceActions from './VoiceActions';
import { createUseModuleHook } from "@/lib/redux/hooks/useModule";
import {AiAudioSchema} from "@/types/aiAudioTypes";

export const useAiAudio = createUseModuleHook<AiAudioSchema>('aiAudio', aiAudioInitialState);

const AiVoicePage: React.FC = () => {
    const {
        initiated,
        data,
        configs,
        userPreferences,
        loading,
        error,
        setInitiated,
        setLoading,
        setError,
        setData,
        setConfigs,
        setUserPreferences,
    } = useAiAudio();

    useEffect(() => {
        const initializeModule = async () => {
            if (!initiated) {
                setLoading(true);
                try {
                    const savedData = localStorage.getItem('aiAudioData');
                    const savedConfigs = localStorage.getItem('aiAudioConfigs');
                    const savedPreferences = localStorage.getItem('aiAudioPreferences');

                    if (savedData) {
                        setData(JSON.parse(savedData));
                    }
                    if (savedConfigs) {
                        setConfigs(JSON.parse(savedConfigs));
                    }
                    if (savedPreferences) {
                        setUserPreferences(JSON.parse(savedPreferences));
                    }

                    setInitiated(true);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'An error occurred during initialization');
                } finally {
                    setLoading(false);
                }
            }
        };

        initializeModule();
    }, [initiated, setInitiated, setLoading, setError, setData, setConfigs, setUserPreferences]);

    useEffect(() => {
        if (initiated) {
            localStorage.setItem('aiAudioData', JSON.stringify(data));
            localStorage.setItem('aiAudioConfigs', JSON.stringify(configs));
            localStorage.setItem('aiAudioPreferences', JSON.stringify(userPreferences));
        }
    }, [initiated, data, configs, userPreferences]);

    if (loading) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="container mx-auto py-8 bg-background text-foreground">
            <h1 className="text-4xl font-bold mb-6">Cartesia Voice Testing</h1>
            <Tabs defaultValue="actions" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="actions">Voice Actions</TabsTrigger>
                    <TabsTrigger value="voices">Available Voices</TabsTrigger>
                </TabsList>
                <TabsContent value="actions">
                    <div className="bg-card rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4">Voice Actions</h2>
                        <VoiceActions />
                    </div>
                </TabsContent>
                <TabsContent value="voices">
                    <div className="bg-card rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4">Available Voices</h2>
                        <VoicesList />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AiVoicePage;