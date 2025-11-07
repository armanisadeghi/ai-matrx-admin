"use client";

import React, { useEffect } from "react";
import { aiAudioInitialState } from "./aiVoiceModuleConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VoicesList from "./VoicesList";
import VoiceActions from "./VoiceActions";
import VoicePlayground from "./VoicePlayground";
import { createUseModuleHook } from "@/lib/hooks/useModule";
import { AiAudioSchema } from "@/types/aiAudioTypes";

export const useAiAudio = createUseModuleHook<AiAudioSchema>("aiAudio", aiAudioInitialState);

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
        updateData,
        updateConfigs,
        updateUserPreferences,
    } = useAiAudio();

    useEffect(() => {
        const initializeModule = async () => {
            if (!initiated) {
                console.log("Initializing module");
                setLoading(true);
                try {
                    const savedData = localStorage.getItem("aiAudioData");
                    const savedConfigs = localStorage.getItem("aiAudioConfigs");
                    const savedPreferences = localStorage.getItem("aiAudioPreferences");

                    if (savedData) {
                        const parsedData = JSON.parse(savedData);
                        updateData(parsedData);
                    }
                    if (savedConfigs) {
                        const parsedConfigs = JSON.parse(savedConfigs);
                        updateConfigs(parsedConfigs);
                    }
                    if (savedPreferences) {
                        const parsedPreferences = JSON.parse(savedPreferences);
                        updateUserPreferences(parsedPreferences);
                    }

                    setInitiated(true);
                } catch (err) {
                    console.error("Error during initialization:", err);
                    setError(err instanceof Error ? err.message : "An error occurred during initialization");
                } finally {
                    setLoading(false);
                }
            }
        };

        initializeModule();
    }, [initiated, setInitiated, setLoading, setError, updateData, updateConfigs, updateUserPreferences]);

    useEffect(() => {
        if (initiated) {
            console.log("Module initiated, current data:", data);
            localStorage.setItem("aiAudioData", JSON.stringify(data));
            localStorage.setItem("aiAudioConfigs", JSON.stringify(configs));
            localStorage.setItem("aiAudioPreferences", JSON.stringify(userPreferences));
        }
    }, [initiated, data, configs, userPreferences]);

    if (loading) {
        console.log("AiVoicePage is loading");
        return <div>Loading...</div>;
    }
    if (error) {
        console.log("AiVoicePage encountered an error:", error);
        return <div>Error: {error}</div>;
    }

    return (
        <div className="container mx-auto py-8 bg-background text-foreground">
            <h1 className="text-4xl font-bold mb-6">Matrx Voice Testing</h1>
            <Tabs defaultValue="playground" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="playground">Voice Playground</TabsTrigger>
                    <TabsTrigger value="voices">Matrx Voices</TabsTrigger>
                    <TabsTrigger value="actions">Create Custom Voices</TabsTrigger>
                </TabsList>
                <TabsContent value="voices">
                    <div className="bg-card rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4">Available Matrx Voices</h2>
                        <VoicesList />
                    </div>
                </TabsContent>
                <TabsContent value="actions">
                    <div className="bg-card rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4">Custom Voice Creation</h2>
                        <VoiceActions />
                    </div>
                </TabsContent>
                <TabsContent value="playground">
                    <div className="bg-card rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4">Voice Playground</h2>
                        <VoicePlayground />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AiVoicePage;
